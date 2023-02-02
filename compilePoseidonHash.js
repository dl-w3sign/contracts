// This script compiles the Poseidon hash function
const path = require("path");
const fs = require("fs");
const { poseidonContract } = require("circomlibjs");

const outputDirectory = path.join(__dirname, "artifacts", "contracts", "PoseidonHash.sol");
const outputPath = path.join(outputDirectory, "PoseidonHash.json");

function compilePoseidonHash() {
  const contract = {
    _format: "hh-sol-artifact-1",
    contractName: "PoseidonHash",
    sourceName: "contracts/PoseidonHash.sol",
    abi: poseidonContract.generateABI(1),
    bytecode: poseidonContract.createCode(1),
    deployedBytecode: "",
    linkReferences: {},
    deployedLinkReferences: {},
  };

  if (!fs.existsSync(outputDirectory)) {
    fs.mkdirSync(outputDirectory, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(contract, null, 2));

  // fs.copyFile(path.join(__dirname, "artifacts", "contracts", "TimeStamping.sol", "TimeStamping.dbg.json"), path.join(outputDirectory, "PoseidonHash.dbg.json"), () => {});
}

module.exports = {
  compilePoseidonHash,
};
