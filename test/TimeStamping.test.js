const { accounts } = require("../scripts/utils/utils.js");
const Reverter = require("./helpers/reverter");
const { sign2612 } = require("./helpers/signatures");
const { setTime, getCurrentBlockTime, getBlockTime } = require("./helpers/block-helper");

const { assert } = require("chai");
const truffleAssert = require("truffle-assertions");
const { keccak256 } = require("@ethersproject/keccak256");
const { toUtf8Bytes } = require("@ethersproject/strings");

const TimeStamping = artifacts.require("TimeStamping");

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
    timeStamping = await TimeStamping.new();
    await reverter.snapshot();
  });

  afterEach("revert", async () => {
    await reverter.revert();
  });

  describe("createStamp()", () => {
    it("should revert if hash already exists", async () => {
      await timeStamping.createStamp(HASH1, [USER1]);
      await truffleAssert.reverts(
        await timeStamping.createStamp(HASH1, [USER1, USER2]),
        "TimeStamping: Hash collision."
      );
    });

    it("should revert if number of signers == 0", async () => {
      await truffleAssert.reverts(timeStamping.createStamp(HASH1, []), "TimeStamping: Incorect signers count.");
    });

    // it("should revert signers are repeates", async () => {
    //   let sig = signCreate(USER1_PRIVATE_KEY, HASH1);
    //   await truffleAssert.reverts(
    //     timeStamping.createStamp(HASH1, [USER1, USER1], [sig.r, sig.r], [sig.s, sig.s], [sig.v, sig.v]),
    //     "TimeStamping: Incorect signers parameters."
    //   );
    // });

    it("should correctly create time stamp", async () => {
      let txReceipt = await timeStamping.createStamp(HASH1, [USER1]);
      assert.equal(txReceipt.receipt.logs[0].event, "StampCreated");
      assert.equal(txReceipt.receipt.logs[0].args.hash, HASH1);
      assert.equal(txReceipt.receipt.logs[0].args.timestamp, await getCurrentBlockTime());
      assert.deepEqual(txReceipt.receipt.logs[0].args.signers, [USER1]);

      txReceipt = await timeStamping.createStamp(HASH2, [USER1, USER2]);
      assert.equal(txReceipt.receipt.logs[0].event, "StampCreated");
      assert.equal(txReceipt.receipt.logs[0].args.hash, HASH2);
      assert.equal(txReceipt.receipt.logs[0].args.timestamp, await getCurrentBlockTime());
      assert.deepEqual(txReceipt.receipt.logs[0].args.signers, [USER1, USER2]);
    });
  });

  describe("sign()", () => {
    it("should revert if hash is not exists", async () => {
      await truffleAssert.reverts(await timeStamping.createStamp(HASH1), "TimeStamping: Hash is not exists");
    });

    it("should revert if user is not admitted", async () => {
      await timeStamping.createStamp(HASH1, [USER2]);
      await truffleAssert.reverts(timeStamping.sign(HASH1), "TimeStamping: User is not admitted.");
    });

    it("should revert if user has signed already", async () => {
      await timeStamping.createStamp(HASH1, [USER1]);
      await timeStamping.sign(HASH1);
      await truffleAssert.reverts(timeStamping.sign(HASH1), "TimeStamping: User is not admitted.");
    });

    it("should correctly sign the time stamp", async () => {
      await timeStamping.createStamp(HASH1, [USER1]);
      let txReceipt = await timeStamping.sign(HASH1);
      assert.equal(txReceipt.receipt.logs[0].event, "StampSigned");
      assert.equal(txReceipt.receipt.logs[0].args.hash, HASH1);
      assert.equal(txReceipt.receipt.logs[0].args.signer, USER1);

      await timeStamping.createStamp(HASH2, [USER1, USER2]);
      txReceipt = await timeStamping.sign(HASH2);
      assert.equal(txReceipt.receipt.logs[0].event, "StampSigned");
      assert.equal(txReceipt.receipt.logs[0].args.hash, HASH1);
      assert.equal(txReceipt.receipt.logs[0].args.signer, USER1);
      txReceipt = await timeStamping.sign(HASH2, { from: USER2 });
      assert.equal(txReceipt.receipt.logs[0].event, "StampSigned");
      assert.equal(txReceipt.receipt.logs[0].args.hash, HASH2);
      assert.equal(txReceipt.receipt.logs[0].args.signer, USER2);
    });
  });

  describe("getStampsInfo()", () => {
    it("should return info about provided hashes", async () => {
      let txReceipt1 = await timeStamping.createStamp(HASH1, [USER1]);
      let txReceipt2 = await timeStamping.createStamp(HASH2, [USER1, USER2]);
      await timeStamping.sign(HASH2);

      let timeStampsInfo = await timeStamping.getStampsInfo([HASH1.HASH2]);
      assert.equal(timeStampsInfo[0].timestamp, await getBlockTime(txReceipt1.blockNumber));
      assert.equal(timeStampsInfo[0].usersToSign, 1);
      assert.equal(timeStampsInfo[0].usersSigned, 0);
      assert.equal(timeStampsInfo[0].hash, HASH1);
      assert.deepEqual(timeStampsInfo[0].signers, [USER1]);

      assert.equal(timeStampsInfo[1].timestamp, await getBlockTime(txReceipt2.blockNumber));
      assert.equal(timeStampsInfo[1].usersToSign, 2);
      assert.equal(timeStampsInfo[1].usersSigned, 1);
      assert.equal(timeStampsInfo[1].hash, HASH2);
      assert.deepEqual(timeStampsInfo[1].signers, [USER1, USER2]);
    });
  });

  describe("getHashesByUserAddress()", () => {
    beforeEach("setup", async () => {
      let sig1 = signCreate(USER1_PRIVATE_KEY, HASH1);
      await timeStamping.createStamp(HASH1, [USER1], [sig1.r], [sig1.s], [sig1.v]);
      sig1 = signCreate(USER1_PRIVATE_KEY, HASH2);
      let sig2 = signCreate(USER2_PRIVATE_KEY, HASH2);
      await timeStamping.createStamp(HASH2, [USER1, USER2], [sig1.r, sig2.r], [sig1.s, sig2.s], [sig1.v, sig2.v]);
    });

    it("should return hashes of user", async () => {
      assert.deepEqual(await timeStamping.getHashesByUserAddress(USER1), [HASH1, HASH2]);
      assert.deepEqual(await timeStamping.getHashesByUserAddress(USER2), [HASH2]);
    });
  });

  describe("isUserSignedHash()", () => {
    beforeEach("setup", async () => {
      let sig1 = signCreate(USER1_PRIVATE_KEY, HASH1);
      await timeStamping.createStamp(HASH1, [USER1], [sig1.r], [sig1.s], [sig1.v]);
    });

    it("should return true if user has signed a hash", async () => {
      assert.isTrue(await timeStamping.isUserSignedHash(USER1, HASH1));
    });
    it("should return false if user has not signed a hash", async () => {
      assert.isFalse(await timeStamping.isUserSignedHash(USER1, HASH2));
    });
  });
});
