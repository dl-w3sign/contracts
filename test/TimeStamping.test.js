const { accounts } = require("../scripts/utils/utils.js");
const Reverter = require("./helpers/reverter");
const { sign2612 } = require("./helpers/signatures");
const { setTime, getCurrentBlockTime } = require("./helpers/block-helper");

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
  let USER1_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  let USER2_PRIVATE_KEY = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
  let USER3_PRIVATE_KEY = "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a";

  const HASH1 = keccak256(toUtf8Bytes("sampletext"));
  const HASH2 = keccak256(toUtf8Bytes("blabla"));
  const HASH3 = keccak256(toUtf8Bytes("blwqd wqd wabla"));
  let timeStamping;

  function signCreate(_privateKey, _hash) {
    const buffer = Buffer.from(_privateKey.slice(2), "hex");

    const domain = {
      name: "TimeStamping",
      chainId: 1,
      verifyingContract: timeStamping.address,
    };

    const create = {
      hash: _hash,
    };

    return sign2612(domain, create, buffer);
  }

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
      let sig = signCreate(USER1_PRIVATE_KEY, HASH1);
      await timeStamping.createStamp(HASH1, [USER1], [sig.r], [sig.s], [sig.v]);

      await truffleAssert.reverts(
        timeStamping.createStamp(HASH1, [USER1], [sig.r], [sig.s], [sig.v]),
        "TimeStamping: Hash collision."
      );
    });

    it("should revert if number of signers == 0", async () => {
      await truffleAssert.reverts(
        timeStamping.createStamp(HASH1, [], [], [], []),
        "TimeStamping: Incorect number of signers."
      );
    });

    it("should revert signers are repeates", async () => {
      let sig = signCreate(USER1_PRIVATE_KEY, HASH1);
      await truffleAssert.reverts(
        timeStamping.createStamp(HASH1, [USER1, USER1], [sig.r, sig.r], [sig.s, sig.s], [sig.v, sig.v]),
        "TimeStamping: Incorect signers parameters."
      );
    });

    it("should revert if number of parameters are different", async () => {
      let sig = signCreate(USER1_PRIVATE_KEY, HASH1);
      await truffleAssert.reverts(
        timeStamping.createStamp(HASH1, [USER1, USER2], [sig.r], [sig.s], [sig.v]),
        "TimeStamping: Incorect parameters count."
      );
    });

    it("should revert if signatures are different", async () => {
      let sig = signCreate(USER1_PRIVATE_KEY, HASH1);
      await truffleAssert.reverts(
        timeStamping.createStamp(HASH1, [USER2], [sig.r], [sig.s], [sig.v]),
        "TimeStamping: Incorect signers parameters."
      );
    });

    it("should correctly save time stamp", async () => {
      let sig1 = signCreate(USER1_PRIVATE_KEY, HASH1);
      let txReceipt = await timeStamping.createStamp(HASH1, [USER1], [sig1.r], [sig1.s], [sig1.v]);

      assert.equal(txReceipt.receipt.logs[0].event, "TimeStampCreated");
      assert.equal(txReceipt.receipt.logs[0].args.hash, HASH1);
      assert.deepEqual(txReceipt.receipt.logs[0].args.signers, [USER1]);
      let timeStampInfo = await timeStamping.getTimeStamp(HASH1);
      assert.equal(await timeStampInfo.timeStamp, await getCurrentBlockTime());

      sig1 = signCreate(USER1_PRIVATE_KEY, HASH2);
      let sig2 = signCreate(USER2_PRIVATE_KEY, HASH2);
      txReceipt = await timeStamping.createStamp(
        HASH2,
        [USER1, USER2],
        [sig2.r, sig1.r],
        [sig2.s, sig1.s],
        [sig2.v, sig1.v]
      );
      assert.equal(txReceipt.receipt.logs[0].event, "TimeStampCreated");
      assert.equal(txReceipt.receipt.logs[0].args.hash, HASH2);
      assert.deepEqual(txReceipt.receipt.logs[0].args.signers, [USER1, USER2]);
      timeStampInfo = await timeStamping.getTimeStamp(HASH2);
      assert.equal(timeStampInfo.timeStamp, await getCurrentBlockTime());
    });
  });

  describe("getTimeStamp()", () => {
    it("should return timestamp and signers of hash", async () => {
      let sig1 = signCreate(USER1_PRIVATE_KEY, HASH1);
      await timeStamping.createStamp(HASH1, [USER1], [sig1.r], [sig1.s], [sig1.v]);
      let timeStampInfo = await timeStamping.getTimeStamp(HASH1);
      assert.equal(timeStampInfo.timeStamp, await getCurrentBlockTime());
      assert.deepEqual(timeStampInfo.signers, [USER1]);

      sig1 = signCreate(USER1_PRIVATE_KEY, HASH2);
      let sig2 = signCreate(USER2_PRIVATE_KEY, HASH2);
      await timeStamping.createStamp(HASH2, [USER1, USER2], [sig1.r, sig2.r], [sig1.s, sig2.s], [sig1.v, sig2.v]);
      timeStampInfo = await timeStamping.getTimeStamp(HASH2);
      assert.equal(timeStampInfo.timeStamp.toString(), await getCurrentBlockTime());
      assert.deepEqual(timeStampInfo.signers, [USER1, USER2]);
    });

    it("should revert if hash is not existing", async () => {
      await truffleAssert.reverts(timeStamping.getTimeStamp(HASH3), "TimeStamping: Hash is not existing");
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

    it("should revert if user has not stamps", async () => {
      await truffleAssert.reverts(timeStamping.getHashesByUserAddress(USER3), "TimeStamping: User has not stamps");
    });
  });
});
