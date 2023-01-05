const TimeStamping = artifacts.require("TimeStamping");
const PublicERC1967Proxy = artifacts.require("PublicERC1967Proxy");

module.exports = async (deployer) => {
  const timeStampingImpl = await deployer.deploy(TimeStamping);

  console.log(`TimeStamping implementation address ----- ${timeStampingImpl.address}`);
  const timeStampingProxy = await deployer.deploy(PublicERC1967Proxy, timeStampingImpl.address, "0x");
  const timeStamping = await TimeStamping.at(timeStampingProxy.address);

  await timeStamping.__TimeStamping_init();

  console.log(`TimeStamping address ----- ${timeStamping.address}`);
};
