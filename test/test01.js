var bigInt = require("big-integer");

const { web3, assert, artifacts, ethers } = require("hardhat");
const { generateCredential } = require("../utilities/credential.js"); 
const { gen, add, genMemWit, genNonMemWit, verMem, verNonMem, generatePrimes, hashToPrime } = require("../utilities/accumulator.js"); 
const { initBitmap, addToBitmap, getBitmapData, checkInclusion, displayArray } = require("../utilities/bitmap.js"); 
const { storeEpochPrime } = require("../utilities/epoch.js");

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

	// bitmap capacity 
	let capacity = 30; // up to uin256 max elements 

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
			bitmapInstance = await SubAcc.new(issuerRegistryInstance.address /*, accInstance.address*/); 
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

	describe("Credentials Revocation Functionality", function() {
	
		it('Add credentials to the bitmap', async() => {
			let [ bitmap, hashCount, count, capacity, epoch ] = await getBitmapData(bitmapInstance); 
			let inclusionSet = [ 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k' ];
			let credentials = []; 
			
			for (let item of inclusionSet) {
				// credential hash for each item in set 
				let [ credential, credentialHash, sig ] = await generateCredential(item, issuer, accounts[4], "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", epoch.toNumber());
				// convert the credential to a prime 
				let [credentialPrime, nonce] = hashToPrime(credentialHash, 128, 0n); 
				// imitate user's storage of credentials 
				credentials.push([ credentialHash, credentialPrime ]); 
				// send to update bitmap 
				await addToBitmap(bitmapInstance, accInstance, credentialPrime, accounts[9]); 
			}

			// assume credential and prime was stored by the user
			// retrieve it from local storage to check the inclusion
			let [ xCred, xPrime ] = credentials[3]; 
			// get latest bitmap 
			let latest = await getBitmapData(bitmapInstance);  
			let res = await checkInclusion(bitmapInstance, latest[0], hashCount, xPrime); 
			assert.isTrue(res, "the credential is in bitmap"); 
		}); 

		it('Verifying membership of a credential in bitmap', async() => {
			let [ bitmap, hashCount, count, capacity, epoch ] = await getBitmapData(bitmapInstance); 
			// assuming user can retrieve this from local storage and not calculate again 
			let [ credential, credentialHash, sig ] = await generateCredential('f', issuer, accounts[4], "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", epoch.toNumber());
			// convert the credential to a prime 
			let [credentialPrime, nonce] = hashToPrime(credentialHash, 128, 0n); 
			let res = await checkInclusion(bitmapInstance, bitmap, hashCount, credentialPrime); 
			assert.isTrue(res, "the credential is in bitmap"); 
		}); 

		it('Verifying non-membership of a credential in bitmap', async() => {
			let [ bitmap, hashCount, count, capacity, epoch ] = await getBitmapData(bitmapInstance); 
			// assume there is a credential that is not in bitmap
			let [ credential, credentialHash, sig ] = await generateCredential('xyz', issuer, accounts[4], "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", epoch.toNumber());
			// convert the credential to a prime 
			let [credentialPrime, nonce] = hashToPrime(credentialHash, 128, 0n); 
			let res = await checkInclusion(bitmapInstance, bitmap, hashCount, credentialPrime); 
			assert.isFalse(res, "the credential is not in bitmap"); 
		}); 

		it('Cheching the current epoch', async() => {
			let [ bitmap, hashCount, count, _capacity, epoch ] = await getBitmapData(bitmapInstance);
			assert.equal(1, epoch, "current epoch is 1"); 
		});

		it('Checking the bitmap current capacity', async() => {
			let [ bitmap, hashCount, count, _capacity, epoch ] = await getBitmapData(bitmapInstance);
			assert.equal(11, count, "current capacity is 11"); 
		}); 

		it('Checking the bitmap capacity', async() => {
			let [ bitmap, hashCount, count, _capacity, epoch ] = await getBitmapData(bitmapInstance);
			assert.equal(capacity, _capacity, "capacity is the same as initially initiated"); 
		}); 
	});

	describe('User attempts to verify during issuance epoch', function() {
		// Scenario 1: 
		// User attempts to verify during issuance epoch.
		// 		1. User sends issuance epoch ID and corresponding prime to the verifier. 
		// 		2. Verifier retrieves latest bitmap using epoch ID.
		// 		3. Verifier checks the inclusion of prime in bitmap: 
		// 			if present then fail,
		// 			else verification pass.  

		// assume local storage of those values on user's device 
		let credential; 
		let credentialHash; 
		let sig; 
		let epoch; 
		let credentialPrime; 

		it('Issuer generates a credential to the user', async() => {
			// an issuer requests the current epoch from the bitmap contract
			let [ bitmap, hashCount, count, capacity, epoch ] = await getBitmapData(bitmapInstance); 
			// then use this epoch ID to include into credential 
			[ credential, credentialHash, sig ] = await generateCredential('some claim', holder, issuer, "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", epoch.toNumber());
			// convert the credential to a prime 
			let [credentialPrime, nonce] = hashToPrime(credentialHash, 128, 0n); 
			// store the prime in distributed storage (should the issuer do this, user or both independently?)
			storeEpochPrime(credentialPrime); 

			await credRegistryInstance.addCredential(credential.id, credential.issuer, credential.holder, credentialHash, sig, 100, credential.epoch)
			// check the credential in contract 
			let res = await credRegistryInstance.getCredential(credential.id); 
			assert.equal(res[1], holder, "the credential holder is the same"); 
		}); 

		it('User sends issuance epoch ID and corresponding prime to the verifier', async() => {
			// user sends this data to the verifier 
			epoch = credential.epoch; 
			credentialPrime = hashToPrime(credentialHash, 128, 0n)[0]; 
			assert.equal(1, epoch, "epoch is 1"); 
		}); 

		it('Verifier retrieving the bitmap using provided epoch ID and verifies inclusion', async() => {
			// verifier gets the latest data from SC 
			let [ currentBitmap, hashCount, count, capacity, currentEpoch ] = await getBitmapData(bitmapInstance); 
			// then get the latest bitmap and check inclusion 
			let inclusion = await checkInclusion(bitmapInstance, currentBitmap, hashCount, credentialPrime); 
			// the credential has not been revoked, thus verification pass
			assert.isFalse(inclusion, "the credential is not in bitmap"); 

			// // if epoch ID == current epoch
			// if (currentEpoch == epoch) {
			// 	// then get the latest bitmap and check inclusion 
			// 	let inclusion = await checkInclusion(bitmapInstance, currentBitmap, hashCount, credentialPrime); 
			// 	// the credential has not been revoked 
			// 	assert.isFalse(inclusion, "the credential is not in bitmap"); 
			// } 
			// // else look for mapping by epoch ID in global accumulator 
			// else {
			// 	let pastBitmap = await accInstance.getBitmap(currentEpoch); 
			// 	// then get the latest bitmap and check inclusion 
			// 	let inclusion = await checkInclusion(bitmapInstance, pastBitmap, hashCount, credentialPrime); 
			// 	// the credential has not been revoked 
			// 	assert.isFalse(inclusion, "the credential is not in bitmap"); 

			// 	// check the bitmap inclusion in global accumulator 
			// 	// let globalAcc = await accInstance.getAccumulator(); 
			// 	// compute witness 

			// 	// verify 
			// }

		}); 

	}); 

	describe('User attempts to verify during subsequent epoch', function() {
		// Scenario 2: 
		// 1. User sends issuance epoch ID and corresponding prime to the verifier.
		// 2. Verifier retrieves bitmap from mapping though epoch ID. 
		// 3. Verifier checks the inclusion of prime in bitmap: 
		// 		if present then fail, 
		// 		else 
		// 			Verify issuance epoch ID acc membership in global acc 
		// 				If failed, then verification failed (acc not in global)
		// 				else
		// 					for each subsequent epoch bitmap check inclusion 
		// 						if present fail, 
		// 							Verify epoch acc membership in global acc
		// 						else if epoch is the current epoch and credential not present, verification pass 
		// 							Verify epoch acc membership in global acc 

		// assume local storage of those values on user's device 
		let credential; 
		let credentialHash; 
		let sig; 
		let epoch; 
		let credentialPrime; 

		it('Issuer generates a credential to the user', async() => {
			// an issuer requests the current epoch from the bitmap contract
			let [ bitmap, hashCount, count, capacity, epoch ] = await getBitmapData(bitmapInstance); 
			// then use this epoch ID to include into credential 
			[ credential, credentialHash, sig ] = await generateCredential('some other claim', holder, issuer, "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", epoch.toNumber());
			// convert the credential to a prime 
			let [credentialPrime, nonce] = hashToPrime(credentialHash, 128, 0n); 
			// store the prime in distributed storage (should the issuer do this, user or both independently?)
			storeEpochPrime(credentialPrime); 

			await credRegistryInstance.addCredential(credential.id, credential.issuer, credential.holder, credentialHash, sig, 100, credential.epoch)
			// check the credential in contract 
			let res = await credRegistryInstance.getCredential(credential.id); 
			assert.equal(res[1], holder, "the credential holder is the same"); 
		}); 

		it('User sends issuance epoch ID and corresponding prime to the verifier', async() => {
			// user sends this data to the verifier 
			epoch = credential.epoch; 
			credentialPrime = hashToPrime(credentialHash, 128, 0n)[0]; 
			assert.equal(1, epoch, "epoch is 1"); 
		}); 

		it('Verifier retrieving the bitmap from mapping using provided epoch ID and verifies inclusion', async() => {
			// verifier gets the latest data from SC 
			let [ currentBitmap, hashCount, count, capacity, currentEpoch ] = await getBitmapData(bitmapInstance); 

			let pastBitmap = await accInstance.getBitmap(currentEpoch); 
			// then get the latest bitmap and check inclusion 
			let inclusion = await checkInclusion(bitmapInstance, pastBitmap, hashCount, credentialPrime); 
			// the credential has not been revoked 
			assert.isFalse(inclusion, "the credential is not in bitmap"); 

			// check the bitmap inclusion in global accumulator 
			// let globalAcc = await accInstance.getAccumulator(); 
			// compute witness 

			// verify 

			// // if epoch ID == current epoch
			// if (currentEpoch == epoch) {
			// 	// then get the latest bitmap and check inclusion 
			// 	let inclusion = await checkInclusion(bitmapInstance, currentBitmap, hashCount, credentialPrime); 
			// 	// the credential has not been revoked 
			// 	assert.isFalse(inclusion, "the credential is not in bitmap"); 
			// } 
			// // else look for mapping by epoch ID in global accumulator 
			// else {
			// 	let pastBitmap = await accInstance.getBitmap(currentEpoch); 
			// 	// then get the latest bitmap and check inclusion 
			// 	let inclusion = await checkInclusion(bitmapInstance, pastBitmap, hashCount, credentialPrime); 
			// 	// the credential has not been revoked 
			// 	assert.isFalse(inclusion, "the credential is not in bitmap"); 

			// 	// check the bitmap inclusion in global accumulator 
			// 	// let globalAcc = await accInstance.getAccumulator(); 
			// 	// compute witness 

			// 	// verify 
			// }

		}); 

	}); 
})
