const BigNumber = require("bignumber.js");

const toBN = (value) => new BigNumber(value);

const wei = (value, decimal = 18) => {
  return toBN(value).times(toBN(10).pow(decimal)).toFixed();
};

const fromWei = (value, decimal = 18) => {
  return toBN(value).div(toBN(10).pow(decimal)).toFixed();
};

const accounts = async (index) => {
  return (await web3.eth.getAccounts())[index];
};

const getCurrentBlockTime = async () => {
  return (await web3.eth.getBlock(await web3.eth.getBlockNumber())).timestamp;
};

module.exports = {
  toBN,
  accounts,
  wei,
  fromWei,
  getCurrentBlockTime,
};
