const { fromRpcSig } = require("ethereumjs-util");
const { signTypedData } = require("@metamask/eth-sig-util");
const { getCurveFromName } = require("ffjavascript");
const path = require("path");
const fs = require("fs");
const snarkjs = require("snarkjs");

const sign2612 = (domain, message, privateKey) => {
  const { name, version = "1", chainId = 1, verifyingContract } = domain;
  const { hash } = message;

  const EIP712Domain = [
    { name: "name", type: "string" },
    { name: "version", type: "string" },
    { name: "chainId", type: "uint256" },
    { name: "verifyingContract", type: "address" },
  ];

  const Create = [{ name: "hash", type: "bytes32" }];

  const data = {
    primaryType: "Create",
    types: { EIP712Domain, Create },
    domain: { name, version, chainId, verifyingContract },
    message: { hash },
  };

  const sig = signTypedData({ privateKey, data, version: "V4" });
  return fromRpcSig(sig);
};

const generateZkey = async () => {
  let curve = await getCurveFromName("bn128");

  const ptau_0 = { type: "mem" };
  await snarkjs.powersOfTau.newAccumulator(curve, 8, ptau_0);

  const ptau_1 = { type: "mem" };
  await snarkjs.powersOfTau.contribute(ptau_0, ptau_1, "First contribution", "some random text");

  const ptau_final = { type: "mem" };
  await snarkjs.powersOfTau.preparePhase2(ptau_1, ptau_final);

  const zkey_final = { type: "mem" };
  await snarkjs.zKey.newZKey(path.join("circuits", "hash.r1cs"), ptau_final, zkey_final);

  fs.writeFile(path.join("circuits", "generated_circutis", "hash_final.zkey"), zkey_final.data, (err) => {
    if (err) {
      console.error(err);
    }
  });
};

module.exports = {
  sign2612,
  generateZkey,
};
