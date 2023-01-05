const { fromRpcSig } = require("ethereumjs-util");
const { signTypedData } = require("@metamask/eth-sig-util");

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

module.exports = {
  sign2612,
};
