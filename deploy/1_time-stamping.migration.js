const TimeStamping = artifacts.require("TimeStamping");

module.exports = async (deployer) => {
  await deployer.deploy(TimeStamping);
};
