## **Time stamping Smart Contract**

This repository contains the smart contracts for the Time Stamping Service. The repository uses Hardhat as development environment for compilation, testing and deployment tasks.

The contract allows users to provide a timestamp, which is recorded using a Zero-Knowledge Proof (ZKP). This allows the contract to verify the timestamp without revealing any sensitive information about the stamp.

This allows for the automated, tamper-proof recording of important information and can help to streamline business processes and reduce the need for trust in third parties. Additionally, the use of ZKP technology provides an added layer of security and privacy for the users.

The Time Stamping Smart Contract that saves stamps with ZKP works by using a specific hash function to generate a unique stamp for the provided data. The process of generating the stamp starts with the input data, which is then passed through the Keccak-256 hash function to create a digest of the data. The output of the Keccak-256 function is then passed through the Poseidon function, which creates a unique stamp based on the input data. This stamp is then passed through another round of the Poseidon function to create the final stamp that will be recorded on the blockchain. The stamp generated in this way is then verified by the smart contract using ZKP technology. The ZKP allows the contract to verify the stamp without revealing any sensitive information about the stamp. This helps in maintaining the privacy of the data and the user.

Overall, this smart contract is a secure and efficient way to create and verify timestamps, making it useful for various applications such as document notarization, and supply chain management.

## Install Dependencies

`npm install`

## Compile Contracts

`npm run compile`

## Run Tests

`npm run test`

## Deployment

Before deploying, you need to create an **.env** file following the example of **.env.example**

Contents of **.env.example**:

```bash
PRIVATE_KEY = "YOUR PRIVATE KEY"
INFURA_KEY = "INFURA PROJECT ID"
ETHERSCAN_KEY = "ETHERSCAN API KEY"
BSCSCAN_KEY = "BSCSCAN API KEY"
COINMARKETCAP_KEY = "COINMARKETCAP API KEY"

# Available targets: 'ethers-v5', 'truffle-v5' and 'web3-v1'
# By default 'ethers-v5'
TYPECHAIN_TARGET = "TYPECHAIN TARGET"
TYPECHAIN_FORCE = "FORCE FLAG"
```

Next, call command `npm run deploy <network>` (**network** is the name of the network, which should be in **hardhat.config.js**)
