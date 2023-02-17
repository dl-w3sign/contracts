require("@nomiclabs/hardhat-web3");
require("@nomiclabs/hardhat-truffle5");
require("@typechain/hardhat");
require("@dlsl/hardhat-migrate");
require("hardhat-contract-sizer");
require("hardhat-gas-reporter");
require("solidity-coverage");
require("@nomiclabs/hardhat-ethers");
const { compilePoseidonHash } = require("./compilePoseidonHash");

const dotenv = require("dotenv");
dotenv.config();

function privateKey() {
  return process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [];
}

function typechainTarget() {
  const target = process.env.TYPECHAIN_TARGET;

  return target == "" || target == undefined ? "ethers-v5" : target;
}

function forceTypechain() {
  return process.env.TYPECHAIN_FORCE == "true";
}

module.exports = {
  networks: {
    hardhat: {
      initialDate: "1970-01-01T00:00:00Z",
      chainId: 1,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      initialDate: "1970-01-01T00:00:00Z",
      gasMultiplier: 1.2,
    },
    goerli: {
      url: `https://goerli.infura.io/v3/${process.env.INFURA_KEY}`,
      accounts: privateKey(),
      gasMultiplier: 1.2,
    },
    mumbai: {
      url: "https://rpc-mumbai.maticvigil.com/",
      accounts: privateKey(),
      gasMultiplier: 1.2,
    },
    qtestnet: {
      url: "https://rpc.qtestnet.org/",
      accounts: privateKey(),
      gasMultiplier: 1.2,
    },
    polygon: {
      url: "https://matic-mainnet.chainstacklabs.com",
      accounts: privateKey(),
      gasMultiplier: 1.2,
    },
    ethereum: {
      url: `https://mainnet.infura.io/v3/${process.env.INFURA_KEY}`,
      accounts: privateKey(),
      gasMultiplier: 1.2,
    },
    qmainnet: {
      url: "https://rpc.q.org",
      accounts: privateKey(),
      gasMultiplier: 1.2,
    },
  },
  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  etherscan: {
    apiKey: {
      mainnet: `${process.env.ETHERSCAN_KEY}`,
      goerli: `${process.env.ETHERSCAN_KEY}`,
      bsc: `${process.env.BSCSCAN_KEY}`,
      bscTestnet: `${process.env.BSCSCAN_KEY}`,
      polygon: `${process.env.POLYGON_KEY}`,
      polygonMumbai: `${process.env.POLYGON_KEY}`,
      qtestnet: "abc",
      qmainnet: "abc",
    },
    customChains: [
      {
        network: "qtestnet",
        chainId: 35443,
        urls: {
          apiURL: "https://explorer.qtestnet.org/api",
          browserURL: "https://explorer.qtestnet.org",
        },
      },
      {
        network: "qmainnet",
        chainId: 35441,
        urls: {
          apiURL: "https://explorer.q.org/api",
          browserURL: "https://explorer.q.org",
        },
      },
    ],
  },
  migrate: {
    pathToMigrations: "./deploy/",
  },
  mocha: {
    timeout: 1000000,
  },
  contractSizer: {
    alphaSort: false,
    disambiguatePaths: false,
    runOnCompile: true,
    strict: false,
  },
  gasReporter: {
    currency: "USD",
    gasPrice: 50,
    enabled: false,
    coinmarketcap: `${process.env.COINMARKETCAP_KEY}`,
  },
  typechain: {
    outDir: `generated-types/${typechainTarget().split("-")[0]}`,
    target: typechainTarget(),
    alwaysGenerateOverloads: true,
    discriminateTypes: true,
    dontOverrideCompile: true & !forceTypechain(),
  },
};

task("compile").setAction(async () => {
  await runSuper();
  compilePoseidonHash();
});
