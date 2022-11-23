const { getCurrentBlockTime } = require("../scripts/utils/utils.js");
const { assert } = require("chai");
const Reverter = require("./helpers/reverter");
const TimeStamping = artifacts.require("TimeStamping");
const truffleAssert = require("truffle-assertions");
const { keccak256 } = require("@ethersproject/keccak256");
const { toUtf8Bytes } = require("@ethersproject/strings");

describe("Time Stamping", () => {
  const reverter = new Reverter();

  const HASH = keccak256(toUtf8Bytes("sampletext"));
  const ANOTHER_HASH = keccak256(toUtf8Bytes("blabla"));
  let timeStamping;
  before("setup", async () => {
    timeStamping = await TimeStamping.new();
    await reverter.snapshot();
  });

  afterEach("revert", async () => {
    await reverter.revert();
  });

  describe("createStamp()", () => {
    it("should revert if already exists hash", async () => {
      await timeStamping.createStamp(HASH);
      truffleAssert.reverts(timeStamping.createStamp(HASH), "Hash collision");
    });
    it("should save 'hash=>time'", async () => {
      await timeStamping.createStamp(HASH);

      assert.equal(await timeStamping.getHashStamp(HASH), await getCurrentBlockTime());
    });
  });

  describe("getHashStamp()", () => {
    beforeEach("setup", async () => {
      await timeStamping.createStamp(HASH);
    });

    it("should return timestamp of hash creation", async () => {
      assert.equal(await timeStamping.getHashStamp(HASH), await getCurrentBlockTime());
    });

    it("should return 0 if hash is not existing", async () => {
      assert.equal(await timeStamping.getHashStamp(ANOTHER_HASH), 0);
    });
  });
});
