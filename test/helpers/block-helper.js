const setNextBlockTime = async (time) => {
  await network.provider.send("evm_setNextBlockTimestamp", [time]);
};

const setTime = async (time) => {
  await setNextBlockTime(time);
  await mine();
};

const getBlockTime = async (block) => {
  return (await web3.eth.getBlock(block)).timestamp;
};

const getCurrentBlockTime = async () => {
  return await getBlockTime(await web3.eth.getBlockNumber());
};

const mine = async (numberOfBlocks = 1) => {
  for (let i = 0; i < numberOfBlocks; i++) {
    await network.provider.send("evm_mine");
  }
};

module.exports = {
  getBlockTime,
  getCurrentBlockTime,
  setNextBlockTime,
  setTime,
  mine,
};
