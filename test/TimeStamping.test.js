const { accounts } = require("../scripts/utils/utils.js");
const Reverter = require("./helpers/reverter");
const { setTime, getCurrentBlockTime } = require("./helpers/block-helper");

const { assert } = require("chai");
const truffleAssert = require("truffle-assertions");
const { keccak256 } = require("@ethersproject/keccak256");
const { toUtf8Bytes } = require("@ethersproject/strings");

const TimeStamping = artifacts.require("TimeStamping");
const PublicERC1967Proxy = artifacts.require("PublicERC1967Proxy");

describe("Time Stamping", () => {
  const reverter = new Reverter();

  let USER1;
  let USER2;
  let USER3;

  const HASH1 = keccak256(toUtf8Bytes("sampletext"));
  const HASH2 = keccak256(toUtf8Bytes("blabla"));
  const HASH3 = keccak256(toUtf8Bytes("blwqd wqd wabla"));
  let timeStamping;

  before("setup", async () => {
    await setTime(123);

    USER1 = await accounts(0);
    USER2 = await accounts(1);
    USER3 = await accounts(2);

    const _timeStampingImpl = await TimeStamping.new();
    const _timeStampingProxy = await PublicERC1967Proxy.new(_timeStampingImpl.address, "0x");
    timeStamping = await TimeStamping.at(_timeStampingProxy.address);
    await timeStamping.__TimeStamping_init();

    await reverter.snapshot();
  });

  afterEach("revert", async () => {
    await reverter.revert();
  });

  describe("creation", () => {
    it("should get exception if try to init again", async () => {
      await truffleAssert.reverts(timeStamping.__TimeStamping_init(), "Initializable: contract is already initialized");
    });
  });

  describe("TimeStamping upgradability", () => {
    it("should correctly upgrade to new impl", async () => {
      const _newTimeStampingImpl = await TimeStamping.new();

      await timeStamping.upgradeTo(_newTimeStampingImpl.address);

      assert.equal(
        await (await PublicERC1967Proxy.at(timeStamping.address)).implementation(),
        _newTimeStampingImpl.address
      );
    });

    it("should get exception if nonowner try to upgrade", async () => {
      const _newTimeStampingImpl = await TimeStamping.new();

      await truffleAssert.reverts(
        timeStamping.upgradeTo(_newTimeStampingImpl.address, { from: USER2 }),
        "Ownable: caller is not the owner"
      );
    });
  });

  describe("createStamp()", () => {
    it("should revert if hash already exists", async () => {
      await timeStamping.createStamp(HASH1, [USER1]);
      await truffleAssert.reverts(timeStamping.createStamp(HASH1, [USER1, USER2]), "TimeStamping: Hash collision.");
    });

    it("should revert if number of signers == 0", async () => {
      await truffleAssert.reverts(timeStamping.createStamp(HASH1, []), "TimeStamping: Incorect signers count.");
    });

    it("should revert if signer is repeates", async () => {
      await truffleAssert.reverts(timeStamping.createStamp(HASH1, [USER1, USER1]), "TimeStamping: Incorect signers.");
    });

    it("should correctly create time stamp", async () => {
      let txReceipt = await timeStamping.createStamp(HASH1, [USER1]);
      assert.equal(txReceipt.receipt.logs[1].event, "StampCreated");
      assert.equal(txReceipt.receipt.logs[1].args.hash, HASH1);
      assert.equal(txReceipt.receipt.logs[1].args.timestamp, await getCurrentBlockTime());
      assert.deepEqual(txReceipt.receipt.logs[1].args.signers, [USER1]);

      txReceipt = await timeStamping.createStamp(HASH2, [USER2, USER3]);
      assert.equal(txReceipt.receipt.logs[0].event, "StampCreated");
      assert.equal(txReceipt.receipt.logs[0].args.hash, HASH2);
      assert.equal(txReceipt.receipt.logs[0].args.timestamp, await getCurrentBlockTime());
      assert.deepEqual(txReceipt.receipt.logs[0].args.signers, [USER2, USER3]);
    });
  });

  describe("sign()", () => {
    it("should revert if hash is not exists", async () => {
      await truffleAssert.reverts(timeStamping.sign(HASH1), "TimeStamping: Hash is not exists");
    });

    it("should revert if user is not admitted", async () => {
      await timeStamping.createStamp(HASH1, [USER2]);
      await truffleAssert.reverts(timeStamping.sign(HASH1), "TimeStamping: User is not admitted.");
    });

    it("should revert if user has signed already", async () => {
      await timeStamping.createStamp(HASH1, [USER1]);
      await truffleAssert.reverts(timeStamping.sign(HASH1), "TimeStamping: User has signed already.");
    });

    it("should correctly sign the time stamp", async () => {
      let txReceipt = await timeStamping.createStamp(HASH1, [USER1]);
      assert.equal(txReceipt.receipt.logs[0].event, "StampSigned");
      assert.equal(txReceipt.receipt.logs[0].args.hash, HASH1);
      assert.equal(txReceipt.receipt.logs[0].args.signer, USER1);

      await timeStamping.createStamp(HASH2, [USER2, USER3]);
      txReceipt = await timeStamping.sign(HASH2, { from: USER2 });
      assert.equal(txReceipt.receipt.logs[0].event, "StampSigned");
      assert.equal(txReceipt.receipt.logs[0].args.hash, HASH2);
      assert.equal(txReceipt.receipt.logs[0].args.signer, USER2);
    });
  });

  describe("getStampsInfo()", () => {
    it("should return info about provided hashes", async () => {
      await timeStamping.createStamp(HASH1, [USER1]);
      let timestamp1 = await getCurrentBlockTime();
      await timeStamping.createStamp(HASH2, [USER1, USER2]);
      let timestamp2 = await getCurrentBlockTime();

      let timeStampsInfo = await timeStamping.getStampsInfo([HASH1, HASH2]);
      assert.equal(timeStampsInfo[0].timestamp, timestamp1);
      assert.equal(timeStampsInfo[0].usersToSign, 1);
      assert.equal(timeStampsInfo[0].usersSigned, 1);
      assert.equal(timeStampsInfo[0].hash, HASH1);
      assert.deepEqual(timeStampsInfo[0].signers, [USER1]);
      assert.deepEqual(timeStampsInfo[0].alreadySigners, [USER1]);

      assert.equal(timeStampsInfo[1].timestamp, timestamp2);
      assert.equal(timeStampsInfo[1].usersToSign, 2);
      assert.equal(timeStampsInfo[1].usersSigned, 1);
      assert.equal(timeStampsInfo[1].hash, HASH2);
      assert.deepEqual(timeStampsInfo[1].signers, [USER1, USER2]);
      assert.deepEqual(timeStampsInfo[1].alreadySigners, [USER1]);
    });
  });

  describe("getStampStatus()", () => {
    beforeEach("setup", async () => {
      await timeStamping.createStamp(HASH1, [USER1]);
      await timeStamping.createStamp(HASH2, [USER1, USER2]);
    });

    it("should return true if all users have signed a hash", async () => {
      assert.isTrue(await timeStamping.getStampStatus(HASH1));
    });
    it("should return false if not all users have signed a hash", async () => {
      assert.isFalse(await timeStamping.getStampStatus(HASH2));
    });
  });

  describe("getHashesByUserAddress()", () => {
    it("should return all hashes that user has signed", async () => {
      await timeStamping.createStamp(HASH1, [USER1]);
      await timeStamping.createStamp(HASH2, [USER1, USER2]);
      await timeStamping.createStamp(HASH3, [USER2, USER3]);
      assert.deepEqual(await timeStamping.getHashesByUserAddress(USER1), [HASH1, HASH2]);
      await timeStamping.sign(HASH2, { from: USER2 });
      assert.deepEqual(await timeStamping.getHashesByUserAddress(USER2), [HASH2]);
    });
  });
});
