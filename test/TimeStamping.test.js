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
      await timeStamping.createStamp(HASH1);
      await truffleAssert.reverts(timeStamping.createStamp(HASH1), "TimeStamping: Hash collision.");
    });

    it("should correctly create time stamp", async () => {
      const txReceipt = await timeStamping.createStamp(HASH1);
      assert.equal(txReceipt.receipt.logs[0].event, "StampCreated");
      assert.equal(txReceipt.receipt.logs[0].args.stampHash, HASH1);
      assert.equal(txReceipt.receipt.logs[0].args.timestamp, await getCurrentBlockTime());
    });
  });

  describe("sign()", () => {
    it("should revert if hash is not exists", async () => {
      await truffleAssert.reverts(timeStamping.sign(HASH1), "TimeStamping: Hash is not exists");
    });

    it("should revert if user has signed already", async () => {
      await timeStamping.createStamp(HASH1);
      await timeStamping.sign(HASH1);

      await truffleAssert.reverts(timeStamping.sign(HASH1), "TimeStamping: User has signed already.");
    });

    it("should correctly sign the time stamp", async () => {
      await timeStamping.createStamp(HASH1);
      txReceipt = await timeStamping.sign(HASH1);
      assert.equal(txReceipt.receipt.logs[0].event, "StampSigned");
      assert.equal(txReceipt.receipt.logs[0].args.stampHash, HASH1);
      assert.equal(txReceipt.receipt.logs[0].args.signer, USER1);

      txReceipt = await timeStamping.sign(HASH1, { from: USER2 });
      assert.equal(txReceipt.receipt.logs[0].event, "StampSigned");
      assert.equal(txReceipt.receipt.logs[0].args.stampHash, HASH1);
      assert.equal(txReceipt.receipt.logs[0].args.signer, USER2);
    });
  });

  describe("getStampsInfo()", () => {
    it("should return info about provided hashes", async () => {
      await timeStamping.createStamp(HASH1);
      const timestamp1 = await getCurrentBlockTime();
      await timeStamping.sign(HASH1);
      const timestamp2 = await getCurrentBlockTime();
      await timeStamping.sign(HASH1, { from: USER3 });
      const timestamp3 = await getCurrentBlockTime();

      let timeStampsInfo = await timeStamping.getStampInfo(HASH1);
      assert.equal(timeStampsInfo.timestamp, timestamp1);
      assert.equal(timeStampsInfo.stampHash, HASH1);

      let signersInfo = timeStampsInfo.signersInfo;
      assert.equal(signersInfo[0].signer, USER1);
      assert.equal(signersInfo[0].signatureTimestamp, timestamp2);
      assert.equal(signersInfo[1].signer, USER3);
      assert.equal(signersInfo[1].signatureTimestamp, timestamp3);
    });
  });

  describe("getStampInfoWithPagination()", () => {
    it("should return info about provided hashes paying attention to pagination", async () => {
      await timeStamping.createStamp(HASH2);
      const timestamp1 = await getCurrentBlockTime();
      await timeStamping.sign(HASH2);
      const timestamp2 = await getCurrentBlockTime();
      await timeStamping.sign(HASH2, { from: USER3 });
      const timestamp3 = await getCurrentBlockTime();

      let timeStampsInfo = await timeStamping.getStampInfoWithPagination(HASH2, 0, 1);
      assert.equal(timeStampsInfo.timestamp, timestamp1);
      assert.equal(timeStampsInfo.stampHash, HASH2);

      let signersInfo = timeStampsInfo.signersInfo;
      assert.equal(signersInfo[0].signer, USER1);
      assert.equal(signersInfo[0].signatureTimestamp, timestamp2);

      timeStampsInfo = await timeStamping.getStampInfoWithPagination(HASH2, 1, 1);
      assert.equal(timeStampsInfo.timestamp, timestamp1);
      assert.equal(timeStampsInfo.stampHash, HASH2);

      signersInfo = timeStampsInfo.signersInfo;
      assert.equal(signersInfo[0].signer, USER3);
      assert.equal(signersInfo[0].signatureTimestamp, timestamp3);
    });
  });

  describe("getHashesByUserAddress()", () => {
    it("should return all hashes that user has signed", async () => {
      await timeStamping.createStamp(HASH1);
      await timeStamping.sign(HASH1);

      await timeStamping.createStamp(HASH2);
      await timeStamping.sign(HASH2);
      await timeStamping.sign(HASH2, { from: USER2 });

      await timeStamping.createStamp(HASH3);

      assert.deepEqual(await timeStamping.getHashesByUserAddress(USER1), [HASH1, HASH2]);
      assert.deepEqual(await timeStamping.getHashesByUserAddress(USER2), [HASH2]);
    });
  });

  describe("getStampSignersCount()", () => {
    it("should return count of signers properly", async () => {
      await timeStamping.createStamp(HASH1);
      await timeStamping.sign(HASH1);

      await timeStamping.createStamp(HASH2);
      await timeStamping.sign(HASH2);
      await timeStamping.sign(HASH2, { from: USER2 });

      assert.equal(await timeStamping.getStampSignersCount(HASH1), 1);
      assert.equal(await timeStamping.getStampSignersCount(HASH2), 2);
      assert.equal(await timeStamping.getStampSignersCount(HASH3), 0);
    });
  });
});
