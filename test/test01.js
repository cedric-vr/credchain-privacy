var bigInt = require("big-integer");

const { web3, assert, artifacts, ethers } = require("hardhat");
const { generateCredential } = require("../utilities/credential.js"); 
const { gen, add, genMemWit, genNonMemWit, verMem, verNonMem, generatePrimes, hashToPrime } = require("../utilities/accumulator.js"); 
const { initBitmap, addToBitmap, getBitmapData, checkInclusion, displayArray } = require("../utilities/bitmap.js"); 

// using the following approach for testing: 
// https://hardhat.org/hardhat-runner/docs/other-guides/truffle-testing

const DID = artifacts.require("DID"); 
const Cred = artifacts.require("Credentials"); 
const Admin = artifacts.require("AdminAccounts"); 
const Issuer = artifacts.require("Issuers"); 
const SubAcc = artifacts.require("SubAccumulator"); 
const Acc = artifacts.require("Accumulator"); 

describe("DID Registry", function() {
	let accounts;
	let holder;
	let issuer; 
	// let credential; 
	// let credentialHash; 

	// accumulator values 
	// let n; 
	// let acc; 
	// let nHex;
	// let accHex;
	// let hashCount; 
	// let bitmap; 
	// let count; 
	let capacity = 50; // up to uin256 max elements 

	// contract instances 
	let adminRegistryInstance; 
	let issuerRegistryInstance; 
	let didRegistryInstance; 
	let credRegistryInstance; 
	let bitmapInstance; 
	let accInstance; 

	before(async function() {
		accounts = await web3.eth.getAccounts();
		holder = accounts[1];
		issuer = accounts[2]; 
	});

	describe("Deployment", function() {
		it('Deploying the Admin registry contract', async() => {
			adminRegistryInstance = await Admin.new(); 
			await web3.eth.getBalance(adminRegistryInstance.address).then((balance) => {
				assert.equal(balance, 0, "check balance of the contract"); 
			});
		});

		it('Deploying the Issuers Registry contract', async() => {
			issuerRegistryInstance = await Issuer.new(adminRegistryInstance.address); 
			await web3.eth.getBalance(issuerRegistryInstance.address).then((balance) => {
				assert.equal(balance, 0, "check balance of the contract"); 
			});
		});

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

		it('Deploying and generating bitmap', async() => {
			bitmapInstance = await SubAcc.new(issuerRegistryInstance.address); 
			await web3.eth.getBalance(bitmapInstance.address).then((balance) => {
				assert.equal(balance, 0, "check balance of the contract"); 
			});

			// calculate how many hash function needed and update in contract
			await initBitmap(bitmapInstance, capacity); 
		});

		it('Deploying and generating global accumulator', async() => {
			let [n, acc] = gen(); 
			// when adding bytes to contract, need to concat with "0x"
			let nHex = "0x" + bigInt(n).toString(16); // convert back to bigInt with bigInt(nHex.slice(2), 16)
			let accHex = "0x" + bigInt(acc).toString(16); 

			accInstance = await Acc.new(issuerRegistryInstance.address, bitmapInstance.address, accHex, nHex); 
			await web3.eth.getBalance(accInstance.address).then((balance) => {
				assert.equal(balance, 0, "check balance of the contract"); 
			});
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
		let credentialA; 
		let credentialB; 
		let credentialC; 
		let credentialD; 
		let credentialHashA; 
		let credentialHashB; 
		let credentialHashC; 
		let credentialHashD; 

		it('Regestering and loading a credential for the user', async() => {
			let result = await generateCredential("another claim", issuer, holder, "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"); 
			// returned data from the credential generation function 
			credentialA = result[0];
			credentialHashA = result[1]; 
			let signatureA = await result[2]; 
			
			// load the credential to the credential registry 
			await credRegistryInstance.addCredential(credentialA.id, credentialA.issuer, credentialA.holder, credentialHashA, signatureA, 100); 
			// check the stored credential in the contract 
			let stored = await credRegistryInstance.getCredential(credentialA.id); 
			assert.equal(stored[1], credentialA.holder, "checking holder of the credential stored"); 
		});

		it('Adding a credential to the sub-accumulator', async() => {
			// add credential to the current bitmap 
			// await addToBitmap(accInstance, subAccInstance, credentialHashA); 			
			// // now we can fetch the data about bitmap 
			// [ bitmap, hashCount, count, capacity ] = await getBitmapData(subAccInstance); 
			// assert.equal(capacity, 20, "stroed capacity is as expected"); 

			// // check the credential inclusion to the bitmap 
			// let inclusion = await checkInclusion(subAccInstance, credentialHashA);
			// assert.isTrue(inclusion); 
		}); 

		it('Checking another credential is not contained in the sub-accumulator', async() => {
			// test for another credential that was not accumulated 
			// let result = await generateCredential("some claim", issuer, accounts[3], "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC");
			// credentialB = result[0]; 
			// credentialHashB = result[1]; 
			// // check the new credentaial presence in bit map 
			// let exclusion = await checkInclusion(subAccInstance, credentialHashB); 
			// assert.isFalse(exclusion); 
		});

		it('Adding another credential by another issuer', async() => {
			// add new credential to the bitmap 
			// await addToBitmap(accInstance, subAccInstance, credentialHashB, accounts[9]); 
			// // check the inclusion of new hash 
			// let inclusion = await checkInclusion(subAccInstance, credentialHashB); 
			// assert.isTrue(inclusion); 
		}); 

		it('Adding third credential', async() => {
			// generate another credential 
			// let result = await generateCredential("one more claim", issuer, accounts[4], "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC");
			// credentialC = result[0]; 
			// credentialHashC = result[1]; 

			// // add new credential to the bitmap 
			// await addToBitmap(accInstance, subAccInstance, credentialHashC, accounts[9]); 
			// // check the inclusion of new hash 
			// let inclusion = await checkInclusion(subAccInstance, credentialHashC); 
			// assert.isTrue(inclusion); 

			// result = await generateCredential("forth claim", issuer, accounts[4], "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC");
			// credentialD = result[0]; 
			// credentialHashD = result[1]; 
			// await addToBitmap(accInstance, subAccInstance, credentialHashD, accounts[9]); 

			let inclusionSet = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't'];
			for (let item of inclusionSet) {

				// credential hash for each item in set 
				let x = await generateCredential(item, issuer, accounts[4], "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC");
				
				// convert the credential to a prime 
				let [credentialPrime, nonce] = hashToPrime(x, 128, 0n); 

				// console.log("sending prime:", credentialPrime); 

				await addToBitmap(bitmapInstance, credentialPrime, accounts[9]); 
				// await packBitmap(subAccInstance, acc); 
			}

			// displayArray(); 

			console.log("inclusion check:")

			for (let item of inclusionSet) {
				let x = await generateCredential(item, issuer, accounts[4], "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC");
				let [credentialPrime, nonce] = hashToPrime(x, 128, 0n); 
				let res = await checkInclusion(bitmapInstance, credentialPrime); 
				console.log(item, ":", res); 
			}

			console.log("\nexclusion check:")

			let exclusionSet = ['abc', 'bcd', 'cef', 'dgh'];
			for (let item of exclusionSet) {
				let x = await generateCredential(item, issuer, accounts[4], "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC");
				let [credentialPrime, nonce] = hashToPrime(x, 128, 0n); 
				let res = await checkInclusion(bitmapInstance, credentialPrime); 
				console.log(item, ":", res); 
			}

			// result = await generateCredential("fifth claim", issuer, accounts[4], "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC");
			// credentialE = result[0]; 
			// credentialHashE = result[1]; 
			// await addToBitmap(accInstance, subAccInstance, credentialHashE, accounts[9]); 
		}); 

		it('Checking the capacity of bitmap and packing', async() => {
			// await packBitmap(subAccInstance); 
		}); 

	});
})
