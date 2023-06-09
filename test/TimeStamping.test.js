const { accounts, wei, toBN } = require("../scripts/utils/utils.js");
const { ZERO_ADDR } = require("../scripts/utils/constants.js");
const Reverter = require("./helpers/reverter");
const { setTime, getCurrentBlockTime } = require("./helpers/block-helper");

const { assert } = require("chai");
const truffleAssert = require("truffle-assertions");
const { keccak256 } = require("@ethersproject/keccak256");
const { artifacts } = require("hardhat");
const { ethers } = require("hardhat");

const { buildPoseidon, poseidonContract } = require("circomlibjs");
const snarkjs = require("snarkjs");
const { promises } = require("fs");

const TimeStamping = artifacts.require("TimeStamping");
const HashVerifier = artifacts.require("HashVerifier");
const PublicERC1967Proxy = artifacts.require("PublicERC1967Proxy");
const Tester = artifacts.require("Tester");

describe("Time Stamping", () => {
  const reverter = new Reverter();

  let USER1;
  let USER2;
  let USER3;

  let HASHSecret1; // poseidon(keccap256(file1))
  let HASHSecret2; // poseidon(keccap256(file2))
  let HASHSecret3; // poseidon(keccap256(file3))
  let HASH1; // poseidon(poseidon(keccap256(file1)))
  let HASH2; // poseidon(poseidon(keccap256(file2)))
  let HASH3; // poseidon(poseidon(keccap256(file3)))
  let HASHProof1;
  let HASHProof2;
  let HASHProof3;

  let fileRaw1;
  let fileRaw2;
  let fileRaw3;

  let timeStamping;
  let verifier;
  let poseidonHash;
  let tester;

  const fee = wei(0.1);

  function p256(n) {
    let nstr = n.toString(16);
    while (nstr.length < 64) nstr = "0" + nstr;
    return `0x${nstr}`;
  }

  async function getPoseidon() {
    const [deployer] = await ethers.getSigners();
    const PoseidonHasher = new ethers.ContractFactory(
      poseidonContract.generateABI(1),
      poseidonContract.createCode(1),
      deployer
    );
    const poseidonHasher = await PoseidonHasher.deploy();
    await poseidonHasher.deployed();
    return poseidonHasher;
  }

  async function getBytesFromFile(file) {
    return Buffer.from(await promises.readFile(file));
  }

  async function generateProofAndHash(hash, user = USER1) {
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      { hash: hash, msgSender: BigInt(user) },
      "circuits/generated_circuits/hash.wasm",
      "circuits/generated_circuits/hash_final.zkey"
    );
    proof.pi_a.pop();
    proof.pi_b.pop();
    proof.pi_c.pop();
    let resProof = {
      a: [p256(BigInt(proof.pi_a[0])), p256(BigInt(proof.pi_a[1]))],
      b: [
        [p256(BigInt(proof.pi_b[0][1])), p256(BigInt(proof.pi_b[0][0]))],
        [p256(BigInt(proof.pi_b[1][1])), p256(BigInt(proof.pi_b[1][0]))],
      ],
      c: [p256(BigInt(proof.pi_c[0])), p256(BigInt(proof.pi_c[1]))],
    };

    return [resProof, ethers.utils.hexZeroPad(BigInt(publicSignals[0]), 32)];
  }

  before("setup", async () => {
    await setTime(123);

    USER1 = await accounts(0);
    USER2 = await accounts(1);
    USER3 = await accounts(2);

    fileRaw1 = await getBytesFromFile("package.json");
    fileRaw2 = await getBytesFromFile("hardhat.config.js");
    fileRaw3 = await getBytesFromFile("README.md");

    let poseidon = await buildPoseidon();
    HASHSecret1 = poseidon.F.toString(poseidon([BigInt(keccak256(fileRaw1))]));
    [HASHProof1, HASH1] = await generateProofAndHash(HASHSecret1);

    HASHSecret2 = poseidon.F.toString(poseidon([BigInt(keccak256(fileRaw2))]));
    [HASHProof2, HASH2] = await generateProofAndHash(HASHSecret2);

    HASHSecret3 = poseidon.F.toString(poseidon([BigInt(keccak256(fileRaw3))]));
    [HASHProof3, HASH3] = await generateProofAndHash(HASHSecret3);

    verifier = await HashVerifier.new();
    poseidonHash = await getPoseidon();

    const _timeStampingImpl = await TimeStamping.new();
    const _timeStampingProxy = await PublicERC1967Proxy.new(_timeStampingImpl.address, "0x");
    timeStamping = await TimeStamping.at(_timeStampingProxy.address);
    await timeStamping.__TimeStamping_init(fee, verifier.address, poseidonHash.address);

    tester = await Tester.new();

    await reverter.snapshot();
  });

  afterEach("revert", async () => {
    await reverter.revert();
  });

  describe("creation", () => {
    it("should get exception if try to init again", async () => {
      await truffleAssert.reverts(
        timeStamping.__TimeStamping_init(fee, verifier.address, poseidonHash.address),
        "Initializable: contract is already initialized"
      );
    });

    it("should correctly set initial parammeters", async () => {
      assert.equal(await timeStamping.fee(), fee.toString());
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

  describe("setVerifier()", () => {
    it("should correctly change verifier address", async () => {
      const verifier = await HashVerifier.new();
      await timeStamping.setVerifier(verifier.address);
    });

    it("should get exception if nonowner try to change", async () => {
      const verifier = await HashVerifier.new();
      await truffleAssert.reverts(
        timeStamping.setVerifier(verifier.address, { from: USER2 }),
        "Ownable: caller is not the owner"
      );
    });
  });

  describe("createStamp()", () => {
    it("should revert if hash already exists", async () => {
      await timeStamping.createStamp(HASH1, false, [USER2], [HASHProof1.a, HASHProof1.b, HASHProof1.c], { value: fee });
      await truffleAssert.reverts(
        timeStamping.createStamp(HASH1, true, [], [HASHProof1.a, HASHProof1.b, HASHProof1.c], { value: fee }),
        "TimeStamping: Hash collision."
      );
    });

    it("should revert if signer is repeates", async () => {
      await truffleAssert.reverts(
        timeStamping.createStamp(HASH1, false, [USER2, USER2], [HASHProof1.a, HASHProof1.b, HASHProof1.c], {
          value: fee,
        }),
        "TimeStamping: Incorect signers."
      );
    });

    it("should correctly create time stamp", async () => {
      let txReceipt = await timeStamping.createStamp(
        HASH1,
        false,
        [USER2],
        [HASHProof1.a, HASHProof1.b, HASHProof1.c],
        { value: fee }
      );
      assert.equal(txReceipt.receipt.logs[0].event, "StampCreated");
      assert.equal(txReceipt.receipt.logs[0].args.stampHash, HASH1);
      assert.equal(txReceipt.receipt.logs[0].args.timestamp, await getCurrentBlockTime());
      assert.deepEqual(txReceipt.receipt.logs[0].args.signers, [USER2]);

      txReceipt = await timeStamping.createStamp(
        HASH2,
        true,
        [USER1, USER2],
        [HASHProof2.a, HASHProof2.b, HASHProof2.c],
        { value: fee }
      );
      assert.equal(txReceipt.receipt.logs[0].event, "StampCreated");
      assert.equal(txReceipt.receipt.logs[0].args.stampHash, HASH2);
      assert.equal(txReceipt.receipt.logs[0].args.timestamp, await getCurrentBlockTime());
      assert.deepEqual(txReceipt.receipt.logs[0].args.signers, [USER1, USER2]);

      txReceipt = await timeStamping.createStamp(HASH3, false, [], [HASHProof3.a, HASHProof3.b, HASHProof3.c], {
        value: fee,
      });
      assert.equal(txReceipt.receipt.logs[0].event, "StampCreated");
      assert.equal(txReceipt.receipt.logs[0].args.stampHash, HASH3);
      assert.equal(txReceipt.receipt.logs[0].args.timestamp, await getCurrentBlockTime());
      assert.deepEqual(txReceipt.receipt.logs[0].args.signers, []);
    });

    it("should revert if ZKP is worng", async () => {
      await truffleAssert.reverts(
        timeStamping.createStamp(HASH1, false, [USER2], [HASHProof1.a, HASHProof1.b, HASHProof1.a], { value: fee }),
        "TimeStamping: ZKP wrong."
      );
      await truffleAssert.reverts(
        timeStamping.createStamp(HASH1, false, [USER2], [HASHProof1.c, HASHProof1.b, HASHProof1.c], { value: fee }),
        "TimeStamping: ZKP wrong."
      );
      await truffleAssert.reverts(
        timeStamping.createStamp(HASH2, false, [USER2], [HASHProof1.c, HASHProof1.b, HASHProof1.c], { value: fee }),
        "TimeStamping: ZKP wrong."
      );
      await truffleAssert.reverts(
        timeStamping.createStamp(HASH1, false, [USER2], [HASHProof2.c, HASHProof1.b, HASHProof1.c], { value: fee }),
        "TimeStamping: ZKP wrong."
      );
      await truffleAssert.reverts(
        timeStamping.createStamp(HASH2, false, [USER2], [HASHProof2.c, HASHProof2.b, HASHProof1.c], { value: fee }),
        "TimeStamping: ZKP wrong."
      );
      await truffleAssert.reverts(
        timeStamping.createStamp(HASH1, false, [USER1], [HASHProof1.a, HASHProof1.b, HASHProof1.c], {
          from: USER2,
          value: fee,
        }),
        "TimeStamping: ZKP wrong."
      );
    });

    it("should revert if transfer currency failed", async () => {
      const proof = (await generateProofAndHash(HASHSecret1, tester.address))[0];

      await truffleAssert.reverts(
        tester.test(timeStamping.address, HASH1, true, [], [proof.a, proof.b, proof.c], {
          value: fee * 3,
        }),
        "TimeStamping: Failed to return currency."
      );
    });

    it("should revert if fee is not enough", async () => {
      await truffleAssert.reverts(
        timeStamping.createStamp(HASH1, true, [], [HASHProof1.a, HASHProof1.b, HASHProof1.c], { value: 0 }),
        "TimeStamping: Fee is not enough."
      );
    });

    it("should correctly pay a fee without extra currency", async () => {
      const balanceBefore = toBN(await web3.eth.getBalance(USER1));

      await timeStamping.createStamp(HASH1, true, [], [HASHProof1.a, HASHProof1.b, HASHProof1.c], { value: fee * 14 });

      const balanceAfter = toBN(await web3.eth.getBalance(USER1));

      assert.closeTo(balanceBefore.minus(balanceAfter).toNumber(), fee.toNumber(), wei(0.002).toNumber());
    });

    it("should store currency", async () => {
      await timeStamping.createStamp(HASH1, true, [], [HASHProof1.a, HASHProof1.b, HASHProof1.c], { value: fee });

      assert.equal(await web3.eth.getBalance(timeStamping.address), fee.toString());

      await timeStamping.createStamp(HASH2, true, [], [HASHProof2.a, HASHProof2.b, HASHProof2.c], { value: fee });

      assert.equal(await web3.eth.getBalance(timeStamping.address), (fee * 2).toString());
    });
  });

  describe("sign()", () => {
    it("should revert if hash is not exists", async () => {
      await truffleAssert.reverts(timeStamping.sign(HASH1), "TimeStamping: Hash is not exists");
    });

    it("should revert if user is not admitted", async () => {
      await timeStamping.createStamp(HASH1, false, [USER2], [HASHProof1.a, HASHProof1.b, HASHProof1.c], { value: fee });
      await truffleAssert.reverts(timeStamping.sign(HASH1), "TimeStamping: User is not admitted.");
    });

    it("should revert if user has signed already", async () => {
      await timeStamping.createStamp(HASH1, true, [USER1, USER2], [HASHProof1.a, HASHProof1.b, HASHProof1.c], {
        value: fee,
      });
      await truffleAssert.reverts(timeStamping.sign(HASH1), "TimeStamping: User has signed already.");

      await timeStamping.createStamp(HASH2, true, [], [HASHProof2.a, HASHProof2.b, HASHProof2.c], { value: fee });
      await truffleAssert.reverts(timeStamping.sign(HASH2), "TimeStamping: User has signed already.");
    });

    it("should correctly sign the time stamp", async () => {
      let txReceipt = await timeStamping.createStamp(
        HASH1,
        true,
        [USER1, USER2],
        [HASHProof1.a, HASHProof1.b, HASHProof1.c],
        { value: fee }
      );
      assert.equal(txReceipt.receipt.logs[1].event, "StampSigned");
      assert.equal(txReceipt.receipt.logs[1].args.stampHash, HASH1);
      assert.equal(txReceipt.receipt.logs[1].args.signer, USER1);

      txReceipt = await timeStamping.sign(HASH1, { from: USER2 });
      assert.equal(txReceipt.receipt.logs[0].event, "StampSigned");
      assert.equal(txReceipt.receipt.logs[0].args.stampHash, HASH1);
      assert.equal(txReceipt.receipt.logs[0].args.signer, USER2);
    });

    it("should correctly sign public time stamp", async () => {
      await timeStamping.createStamp(HASH1, false, [], [HASHProof1.a, HASHProof1.b, HASHProof1.c], { value: fee });

      let txReceipt = await timeStamping.sign(HASH1);
      assert.equal(txReceipt.receipt.logs[0].event, "StampSigned");
      assert.equal(txReceipt.receipt.logs[0].args.stampHash, HASH1);
      assert.equal(txReceipt.receipt.logs[0].args.signer, USER1);

      txReceipt = await timeStamping.sign(HASH1, { from: USER2 });
      assert.equal(txReceipt.receipt.logs[0].event, "StampSigned");
      assert.equal(txReceipt.receipt.logs[0].args.stampHash, HASH1);
      assert.equal(txReceipt.receipt.logs[0].args.signer, USER2);
    });
  });

  describe("setFee()", () => {
    it("should revert if caller is not owner", async () => {
      await truffleAssert.reverts(timeStamping.setFee(0, { from: USER2 }), "Ownable: caller is not the owner");
    });

    it("should correctly set new value", async () => {
      await timeStamping.setFee(0);
      assert.equal(await timeStamping.fee(), 0);
    });
  });

  describe("withdrawFee()", () => {
    it("should revert if nothing to withdraw", async () => {
      await truffleAssert.reverts(timeStamping.withdrawFee(ZERO_ADDR), "TimeStamping: Nothing to withdraw.");
    });

    it("should revert if transfer currency failed", async () => {
      await timeStamping.createStamp(HASH1, false, [], [HASHProof1.a, HASHProof1.b, HASHProof1.c], { value: fee });

      await truffleAssert.reverts(
        timeStamping.withdrawFee(verifier.address),
        "TimeStamping: Failed to return currency."
      );
    });

    it("should revert if caller is not owner", async () => {
      await timeStamping.createStamp(HASH1, false, [], [HASHProof1.a, HASHProof1.b, HASHProof1.c], { value: fee });

      await truffleAssert.reverts(timeStamping.withdrawFee(USER2, { from: USER2 }), "Ownable: caller is not the owner");
    });

    it("should correctly transfer currency", async () => {
      const balanceBefore = toBN(await web3.eth.getBalance(USER2));

      await timeStamping.createStamp(HASH1, false, [], [HASHProof1.a, HASHProof1.b, HASHProof1.c], { value: fee });
      await timeStamping.createStamp(HASH2, false, [], [HASHProof2.a, HASHProof2.b, HASHProof2.c], { value: fee });
      await timeStamping.withdrawFee(USER2);

      const balanceAfter = toBN(await web3.eth.getBalance(USER2));

      assert.closeTo(balanceAfter.minus(balanceBefore).toNumber(), toBN(fee * 2).toNumber(), wei(0.001).toNumber());
    });
  });

  describe("getStampHashByBytes()", () => {
    it("Should calculate the result hash of file correctly", async () => {
      assert.equal(await timeStamping.getStampHashByBytes(fileRaw1), HASH1);
      assert.equal(await timeStamping.getStampHashByBytes(fileRaw2), HASH2);
      assert.equal(await timeStamping.getStampHashByBytes(fileRaw3), HASH3);
    });
  });

  describe("getStampInfo()", () => {
    it("should return info about provided stamp", async () => {
      await timeStamping.createStamp(HASH1, false, [USER2, USER3], [HASHProof1.a, HASHProof1.b, HASHProof1.c], {
        value: fee,
      });
      const timestamp1 = await getCurrentBlockTime();
      await timeStamping.sign(HASH1, { from: USER3 });
      const timestamp2 = await getCurrentBlockTime();

      let timeStampsInfo = await timeStamping.getStampInfo(HASH1);
      assert.isFalse(timeStampsInfo.isPublic);
      assert.equal(timeStampsInfo.timestamp, timestamp1);
      assert.equal(timeStampsInfo.usersToSign, 2);
      assert.equal(timeStampsInfo.usersSigned, 1);
      assert.equal(timeStampsInfo.stampHash, HASH1);

      let signersInfo = timeStampsInfo.signersInfo;
      assert.equal(signersInfo[0].signer, USER2);
      assert.equal(signersInfo[0].isAddmitted, true);
      assert.equal(signersInfo[0].signatureTimestamp, 0);
      assert.equal(signersInfo[1].signer, USER3);
      assert.equal(signersInfo[1].isAddmitted, false);
      assert.equal(signersInfo[1].signatureTimestamp, timestamp2);
    });

    it("should return info about provided public stamp", async () => {
      await timeStamping.createStamp(HASH1, false, [], [HASHProof1.a, HASHProof1.b, HASHProof1.c], { value: fee });
      const timestamp1 = await getCurrentBlockTime();
      await timeStamping.sign(HASH1, { from: USER3 });
      const timestamp2 = await getCurrentBlockTime();

      let timeStampsInfo = await timeStamping.getStampInfo(HASH1);
      assert.isTrue(timeStampsInfo.isPublic);
      assert.equal(timeStampsInfo.timestamp, timestamp1);
      assert.equal(timeStampsInfo.usersToSign, ethers.constants.MaxUint256);
      assert.equal(timeStampsInfo.usersSigned, 1);
      assert.equal(timeStampsInfo.stampHash, HASH1);

      let signersInfo = timeStampsInfo.signersInfo;
      assert.equal(signersInfo[0].signer, USER3);
      assert.equal(signersInfo[0].isAddmitted, false);
      assert.equal(signersInfo[0].signatureTimestamp, timestamp2);
    });
  });

  describe("getStampInfoWithPagination()", () => {
    it("should return info about provided stamp paying attention to pagination", async () => {
      await timeStamping.createStamp(HASH1, true, [USER1, USER2, USER3], [HASHProof1.a, HASHProof1.b, HASHProof1.c], {
        value: fee,
      });
      const timestamp1 = await getCurrentBlockTime();
      await timeStamping.sign(HASH1, { from: USER3 });
      const timestamp2 = await getCurrentBlockTime();

      let timeStampsInfo = await timeStamping.getStampInfoWithPagination(HASH1, 0, 1);
      assert.isFalse(timeStampsInfo.isPublic);
      assert.equal(timeStampsInfo.timestamp, timestamp1);
      assert.equal(timeStampsInfo.usersToSign, 3);
      assert.equal(timeStampsInfo.usersSigned, 2);
      assert.equal(timeStampsInfo.stampHash, HASH1);

      let signersInfo = timeStampsInfo.signersInfo;
      assert.equal(signersInfo[0].signer, USER1);
      assert.equal(signersInfo[0].isAddmitted, false);
      assert.equal(signersInfo[0].signatureTimestamp, timestamp1);

      timeStampsInfo = await timeStamping.getStampInfoWithPagination(HASH1, 1, 3);
      assert.isFalse(timeStampsInfo.isPublic);
      assert.equal(timeStampsInfo.timestamp, timestamp1);
      assert.equal(timeStampsInfo.usersToSign, 3);
      assert.equal(timeStampsInfo.usersSigned, 2);
      assert.equal(timeStampsInfo.stampHash, HASH1);

      signersInfo = timeStampsInfo.signersInfo;
      assert.equal(signersInfo[0].signer, USER2);
      assert.equal(signersInfo[0].isAddmitted, true);
      assert.equal(signersInfo[0].signatureTimestamp, 0);
      assert.equal(signersInfo[1].signer, USER3);
      assert.equal(signersInfo[1].isAddmitted, false);
      assert.equal(signersInfo[1].signatureTimestamp, timestamp2);
    });

    it("should return info about provided public stamp paying attention to pagination", async () => {
      await timeStamping.createStamp(HASH1, true, [], [HASHProof1.a, HASHProof1.b, HASHProof1.c], { value: fee });
      const timestamp1 = await getCurrentBlockTime();
      await timeStamping.sign(HASH1, { from: USER3 });
      const timestamp2 = await getCurrentBlockTime();

      let timeStampsInfo = await timeStamping.getStampInfoWithPagination(HASH1, 0, 1);
      assert.isTrue(timeStampsInfo.isPublic);
      assert.equal(timeStampsInfo.timestamp, timestamp1);
      assert.equal(timeStampsInfo.usersToSign, ethers.constants.MaxUint256);
      assert.equal(timeStampsInfo.usersSigned, 2);
      assert.equal(timeStampsInfo.stampHash, HASH1);

      let signersInfo = timeStampsInfo.signersInfo;
      assert.equal(signersInfo[0].signer, USER1);
      assert.equal(signersInfo[0].isAddmitted, false);
      assert.equal(signersInfo[0].signatureTimestamp, timestamp1);

      timeStampsInfo = await timeStamping.getStampInfoWithPagination(HASH1, 1, 3);
      assert.isTrue(timeStampsInfo.isPublic);
      assert.equal(timeStampsInfo.timestamp, timestamp1);
      assert.equal(timeStampsInfo.usersToSign, ethers.constants.MaxUint256);
      assert.equal(timeStampsInfo.usersSigned, 2);
      assert.equal(timeStampsInfo.stampHash, HASH1);

      signersInfo = timeStampsInfo.signersInfo;
      assert.equal(signersInfo[0].signer, USER3);
      assert.equal(signersInfo[0].isAddmitted, false);
      assert.equal(signersInfo[0].signatureTimestamp, timestamp2);
    });
  });

  describe("getHashesByUserAddress()", () => {
    it("should return all hashes that user has signed", async () => {
      await timeStamping.createStamp(HASH1, true, [USER1, USER2, USER3], [HASHProof1.a, HASHProof1.b, HASHProof1.c], {
        value: fee,
      });

      await timeStamping.createStamp(HASH2, true, [USER1, USER2], [HASHProof2.a, HASHProof2.b, HASHProof2.c], {
        value: fee,
      });
      await timeStamping.sign(HASH2, { from: USER2 });

      await timeStamping.createStamp(HASH3, false, [USER3], [HASHProof3.a, HASHProof3.b, HASHProof3.c], { value: fee });

      assert.deepEqual(await timeStamping.getHashesByUserAddress(USER1), [HASH1, HASH2]);
      assert.deepEqual(await timeStamping.getHashesByUserAddress(USER2), [HASH2]);
    });
  });

  describe("getStampSignersCount()", () => {
    it("should return count of signers properly", async () => {
      await timeStamping.createStamp(HASH1, true, [USER1, USER2, USER3], [HASHProof1.a, HASHProof1.b, HASHProof1.c], {
        value: fee,
      });

      await timeStamping.createStamp(HASH2, true, [USER1, USER2], [HASHProof2.a, HASHProof2.b, HASHProof2.c], {
        value: fee,
      });
      await timeStamping.sign(HASH2, { from: USER2 });

      assert.equal(await timeStamping.getStampSignersCount(HASH1), 3);
      assert.equal(await timeStamping.getStampSignersCount(HASH2), 2);
      assert.equal(await timeStamping.getStampSignersCount(HASH3), 0);
    });
  });

  describe("getUserInfo()", () => {
    it("should correctly return info about a user and a hash", async () => {
      await timeStamping.createStamp(HASH1, true, [USER1, USER2], [HASHProof1.a, HASHProof1.b, HASHProof1.c], {
        value: fee,
      });
      const timestamp = await getCurrentBlockTime();

      let signerInfo = await timeStamping.getUserInfo(USER1, HASH1);
      assert.equal(signerInfo.signer, USER1);
      assert.equal(signerInfo.isAddmitted, false);
      assert.equal(signerInfo.signatureTimestamp, timestamp);

      signerInfo = await timeStamping.getUserInfo(USER2, HASH1);
      assert.equal(signerInfo.signer, USER2);
      assert.equal(signerInfo.isAddmitted, true);
      assert.equal(signerInfo.signatureTimestamp, 0);

      signerInfo = await timeStamping.getUserInfo(USER3, HASH1);
      assert.equal(signerInfo.signer, USER3);
      assert.equal(signerInfo.isAddmitted, false);
      assert.equal(signerInfo.signatureTimestamp, 0);

      await timeStamping.sign(HASH1, { from: USER2 });

      signerInfo = await timeStamping.getUserInfo(USER2, HASH1);
      assert.equal(signerInfo.signer, USER2);
      assert.equal(signerInfo.isAddmitted, false);
      assert.equal(signerInfo.signatureTimestamp, await getCurrentBlockTime());
    });
  });
});
