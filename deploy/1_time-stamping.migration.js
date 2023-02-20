const { poseidonContract } = require("circomlibjs");
const TimeStamping = artifacts.require("TimeStamping");
const PublicERC1967Proxy = artifacts.require("PublicERC1967Proxy");
const HashVerifier = artifacts.require("HashVerifier");

require("dotenv").config();

module.exports = async (deployer) => {
  const fee = process.env.PLATFROM_FEE;

  if (!fee) {
    throw new Error("Invalid PLATFROM_FEE");
  }

  console.log("Deploying Poseidon Hasher...");
  const PoseidonHasher = new hre.ethers.ContractFactory(
    poseidonContract.generateABI(1),
    poseidonContract.createCode(1),
    await hre.ethers.getSigner()
  );
  const poseidonHasher = await PoseidonHasher.deploy();

  const verifier = await deployer.deploy(HashVerifier);

  const timeStampingImpl = await deployer.deploy(TimeStamping);

  console.log(`TimeStamping implementation address ----- ${timeStampingImpl.address}`);
  const timeStampingProxy = await deployer.deploy(PublicERC1967Proxy, timeStampingImpl.address, "0x");
  const timeStamping = await TimeStamping.at(timeStampingProxy.address);

  await timeStamping.__TimeStamping_init(fee, verifier.address, poseidonHasher.address);

  console.log(`TimeStamping address ----- ${timeStamping.address}`);
  console.log(`TimeStamping deployed with next params
    fee: ${fee}
  `);
};
