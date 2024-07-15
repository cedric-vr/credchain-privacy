# CredChain

The project consists of mainly two parts at the moment: backend including smart contracts and frontend including sample React app.

# How to Run

First, we need to compile and deploy smart contracts to the testnet. To do this, make sure Hardhat is installed on your environment or install using `npm install --save-dev hardhat` command. Once installed we can deploy contracts.  

To deploy, start the hardhat node with `npx hardhat node`.  

Open another terminal window and deploy the contracts using `npx hardhat run --network localhost scripts/deploy.js` command.  

Once the contracts deployed you can see the contract address in the node terminal (e.g., `0x5fbdb2315678afecb367f032d93f642f64180aa3`). 

Since we are deploying few contracts, each one of them will have different address. Right now the `deploy.js` file contains all the deployment scripts that will be needed, but part of it is commented out so the only contract that is being deployed right now is DID Registry. 

Now we can start the frontend app. To do this call the `npm start` from the frontend directory. The main logic is in `/scr/App.js` file and contains a simple app that interacts with deployed DID registry.  

To make sure the frontend can access the deployed contracts, for each contract we need to compiled file to the `/scr/utils` directory. At the moment the only compiled contract is represented by `DID.json`.  

For each deployed contract we also need to add contract ABI and its address in `/src/utils/constants.js` file. Follow the same pattern as for DID Registry.  

# Hardhat Commands 

```shell
npx hardhat help
npx hardhat test
GAS_REPORT=true npx hardhat test
npx hardhat node
npx hardhat run scripts/deploy.js
```

# Privacy Preserving Mechanisms
## 1) Zero-Knowledge Proof
```shell
npx hardhat test test/testZPK.js
```

## 2) Homomorphic Encryption
```shell
npx hardhat test test/testHE.js
```

# References 
- [Hardhat Guides](https://hardhat.org/hardhat-runner/docs/guides/project-setup) to compile and deploy smart contracts.
- [Hardhat Boilerplate Project](https://hardhat.org/tutorial/boilerplate-project) featuring smart contracts and frontend files structure. 
- [Tutorial for building Web3 Application](https://medium.com/coinmonks/build-a-web-3-application-with-solidity-hardhat-react-and-web3js-61b7ff137885) using Hardhat, React and Web3 library. 

## Code Base 
- The original CredChain code based was developed by Yue Liu. This is the updated CredChain version to latest Solidity (^0.8.0), utilises new deployment and testing framework (Hardhat and Truffle), includes frontend application and new features (revocation mechanism). 
