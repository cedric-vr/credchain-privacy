# CredChain Privacy

The project consists of mainly two parts at the moment: backend including smart contracts and frontend including sample React app.

# How to Run

First, we need to compile and deploy smart contracts to the testnet. To do this, make sure Hardhat is installed on your environment or install using: 
```shell
npm install --save-dev hardhat
```
To deploy, start the hardhat node with:
```shell
npx hardhat node
```
Open another terminal window and deploy the contracts:  
```shell
npx hardhat run --network localhost scripts/deploy.js
```
Once the contracts deployed you can see the contract address in the node terminal (e.g., `0x5fbdb2315678afecb367f032d93f642f64180aa3`). 

Since we are deploying few contracts, each one of them will have different address. Right now the `deploy.js` file contains all the deployment scripts that will be needed, but part of it is commented out so the only contract that is being deployed right now is DID Registry. 

Now we can start the frontend app. To do this call the `npm start` from the frontend directory. The main logic is in `/scr/App.js` file and contains a simple app that interacts with deployed DID registry.  

To make sure the frontend can access the deployed contracts, for each contract we need to compiled file to the `/scr/utils` directory. At the moment the only compiled contract is represented by `DID.json`.  

For each deployed contract we also need to add contract ABI and its address in `/src/utils/constants.js` file. Follow the same pattern as for DID Registry.  

# Hardhat Commands 

```shell
npx hardhat help
npx hardhat test
npx hardhat node
npx hardhat run scripts/deploy.js
```

# Privacy Preserving Mechanisms
This repo includes two privacy preserving mechanism prototypes to calculate and verify that a university degree has been issued after a specific date (Unix timestamp). 

## 1) Zero-Knowledge Proof
```shell
npx hardhat test test/testZPK.js
```

## 2) Homomorphic Encryption
```shell
npx hardhat test test/testHE.js
```

# Gas Estimation
...



# References 
- [Hardhat Guides](https://hardhat.org/hardhat-runner/docs/guides/project-setup) to compile and deploy smart contracts.
- [Hardhat Boilerplate Project](https://hardhat.org/tutorial/boilerplate-project) featuring smart contracts and frontend files structure. 
- [Tutorial for building Web3 Application](https://medium.com/coinmonks/build-a-web-3-application-with-solidity-hardhat-react-and-web3js-61b7ff137885) using Hardhat, React and Web3 library. 
- [zokrates-js](https://github.com/Zokrates/ZoKrates/tree/develop/zokrates_js) library for Zero-Knowledge Proofs in Javascript. Read the documentation [here](https://zokrates.github.io/toolbox/zokrates_js.html).
- [node-seal](https://github.com/s0l0ist/node-seal) library for Homomorphic Encryption in Javascript, which is based on Microsoft SEAL. Read the documentation [here](https://s0l0ist.github.io/node-seal/).

## Code Base
The original CredChain code based was developed by Yue Liu. This repo builds on the updated CredChain version to latest Solidity (^0.8.0) developed by [Daria Schumm](https://github.com/schummd), which utilises a new deployment and testing framework (Hardhat and Truffle), includes frontend a application and new features (revocation mechanism). 
