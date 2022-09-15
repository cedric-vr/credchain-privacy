
const { web3, assert } = require("hardhat");

// using the following approach for testing: 
// https://hardhat.org/hardhat-runner/docs/other-guides/truffle-testing

const DID = artifacts.require("DID"); 

describe("DID Registry", function() {
	let accounts;
	let holder;
	let issuer; 

	// contract instances 
	let didRegistryInstance; 

	before(async function() {
		accounts = await web3.eth.getAccounts();
		holder = accounts[1];
		issuer = accounts[2]; 
	});

	describe("Deployment", function() {
		it('Deploying the contract', async() => {
			didRegistryInstance = await DID.new();
			await web3.eth.getBalance(didRegistryInstance.address).then((balance) => {
				assert.equal(balance, 0, "check balance of the contract"); 
			})
		})
	})

	describe("Identity Register", function() {
		it('Registering the identity with contract', async() => {
			let now = new Date(); 
			let ubaasDID = web3.utils.sha3(issuer + now); 
			await didRegistryInstance.register(holder, ubaasDID); 
			let did = await didRegistryInstance.getInfo(holder); 
			console.log(did[0]); 
		})
	})
	
})
