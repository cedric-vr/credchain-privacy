
const { web3, assert, artifacts } = require("hardhat");
const { generateCredential } = require("../utilities/credential.js"); 
const { generateAccumulator } = require("../utilities/accumulator.js"); 

// using the following approach for testing: 
// https://hardhat.org/hardhat-runner/docs/other-guides/truffle-testing

const DID = artifacts.require("DID"); 
const Cred = artifacts.require("Credentials"); 

describe("DID Registry", function() {
	let accounts;
	let holder;
	let issuer; 

	// accumulator values 
	let n; 
	let acc; 

	// contract instances 
	let didRegistryInstance; 
	let credRegistryInstance; 

	before(async function() {
		accounts = await web3.eth.getAccounts();
		holder = accounts[1];
		issuer = accounts[2]; 
	});

	describe("Deployment", function() {
		it('Deploying the DID Registry contract', async() => {
			didRegistryInstance = await DID.new();
			await web3.eth.getBalance(didRegistryInstance.address).then((balance) => {
				assert.equal(balance, 0, "check balance of the contract"); 
			});
		});

		it('Deploying the Credential Registry contract', async() => {
			credRegistryInstance = await Cred.new(); 
			await web3.eth.getBalance(credRegistryInstance.address).then((balance) => {
				assert.equal(balance, 0, "check balance of the contract"); 
			});
		});

		it('Generating accumulator', async() => {
			// generate off-chain 
			// load the accumulator value to contract 
			[ n, acc ] = generateAccumulator(); 
			console.log(acc); 
		});
	});

	describe("Identity Register", function() {
		it('Registering the identity with contract', async() => {
			let now = new Date(); 
			let ubaasDID = web3.utils.sha3(issuer + now); 
			await didRegistryInstance.register(holder, ubaasDID); 
			let did = await didRegistryInstance.getInfo(holder); 
			assert.exists(did[0], "check if did was generated"); 
		}); 
	});

	describe("Credential Register", function() {
		it('Regestering and loading a credential for the user', async() => {
			let result = await generateCredential("some claim", issuer, holder, "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"); 
			// returned data from the credential generation function 
			let credential = result[0];
			let credentialHash = result[1]; 
			let signature = await result[2]; 

			// load the credential to the credential registry 
			await credRegistryInstance.addCredential(credential.id, credential.issuer, credential.holder, credentialHash, signature, 100); 
			// check the stored credential in the contract 
			let credStored = await credRegistryInstance.getCredential(credential.id); 
			assert.equal(credStored[1], credential.holder, "checking holder of the credential stored"); 
		});

		it('Adding a credential to the accumulator', async() => {
			// issuer calls function Add in accumulator contract and send credential hash to it 

		}); 

		it('Verifier attemps to verify the credential', async() => {
			// verifier checks whethen non-membership proof provided by the user is valid 
		});
	});
	
})
