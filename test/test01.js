var bigInt = require("big-integer");

const { web3, assert, artifacts } = require("hardhat");
const { generateCredential } = require("../utilities/credential.js"); 
const { gen, hashToPrime } = require("../utilities/accumulator.js"); 
const { initBitmap, addToBitmap, getBitmapData, getStaticAccData, checkInclusionBitmap, checkInclusionGlobal } = require("../utilities/bitmap.js"); 
const { storeEpochPrimes } = require("../utilities/epoch.js");
const { emptyProducts, emptyStaticAccData } = require("../utilities/product"); 

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
	let subAccInstance; 
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
			subAccInstance = await SubAcc.new(issuerRegistryInstance.address /*, accInstance.address*/); 
			await web3.eth.getBalance(subAccInstance.address).then((balance) => {
				assert.equal(balance, 0, "check balance of the contract"); 
			});

			// calculate how many hash function needed and update in contract
			await initBitmap(subAccInstance, capacity); 

			// clean up from previous tests 
			emptyProducts();
			emptyStaticAccData(); 
		});

		it('Deploying and generating global accumulator', async() => {
			let [n, g] = gen(); 
			// when adding bytes to contract, need to concat with "0x"
			let nHex = "0x" + bigInt(n).toString(16); // convert back to bigInt with bigInt(nHex.slice(2), 16)
			let gHex = "0x" + bigInt(g).toString(16); 

			accInstance = await Acc.new(issuerRegistryInstance.address, subAccInstance.address, gHex, nHex); 
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
			await didRegistryInstance.getInfo(holder).then((result) => {
				assert.exists(result[0], "check if did was generated"); 
			});
		}); 
	});

	describe("Credentials Revocation Functionality", function() {
	
		it('Add credentials to the bitmap', async() => {
			let [ bitmap, hashCount, count, capacity, epoch ] = await getBitmapData(subAccInstance); 
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
				await addToBitmap(subAccInstance, accInstance, credentialPrime); 
			}

			// assume credential and prime was stored by the user
			// retrieve it from local storage to check the inclusion
			let [ xCred, xPrime ] = credentials[3]; 
			// get latest bitmap 
			let latest = await getBitmapData(subAccInstance);  
			await checkInclusionBitmap(subAccInstance, latest[0], hashCount, xPrime).then((result) => {
				assert.isTrue(result, "the credential is in bitmap"); 
			})
		}); 

		it('Verifying membership of a credential in bitmap', async() => {
			let [ bitmap, hashCount, count, capacity, epoch ] = await getBitmapData(subAccInstance); 
			// assuming user can retrieve this from local storage and not calculate again 
			let [ credential, credentialHash, sig ] = await generateCredential('f', issuer, accounts[4], "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", epoch.toNumber());
			// convert the credential to a prime 
			let [credentialPrime, nonce] = hashToPrime(credentialHash, 128, 0n); 
			await checkInclusionBitmap(subAccInstance, bitmap, hashCount, credentialPrime).then((result) => {
				assert.isTrue(result, "the credential is in bitmap"); 
			}); 
		}); 

		it('Verifying non-membership of a credential in bitmap', async() => {
			let [ bitmap, hashCount, count, capacity, epoch ] = await getBitmapData(subAccInstance); 
			// assume there is a credential that is not in bitmap
			let [ credential, credentialHash, sig ] = await generateCredential('xyz', issuer, accounts[4], "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", epoch.toNumber());
			// convert the credential to a prime 
			let [credentialPrime, nonce] = hashToPrime(credentialHash, 128, 0n); 
			await checkInclusionBitmap(subAccInstance, bitmap, hashCount, credentialPrime).then((result) => {
				assert.isFalse(result, "the credential is not in bitmap"); 
			});
		}); 

		it('Cheching the current epoch', async() => {
			let [ bitmap, hashCount, count, _capacity, epoch ] = await getBitmapData(subAccInstance);
			assert.equal(1, epoch, "current epoch is 1"); 
		});

		it('Checking the bitmap current capacity', async() => {
			let [ bitmap, hashCount, count, _capacity, epoch ] = await getBitmapData(subAccInstance);
			assert.equal(11, count, "current capacity is 11"); 
		}); 

		it('Checking the bitmap capacity', async() => {
			let [ bitmap, hashCount, count, _capacity, epoch ] = await getBitmapData(subAccInstance);
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
			let [ bitmap, hashCount, count, capacity, epoch ] = await getBitmapData(subAccInstance); 
			// then use this epoch ID to include into credential 
			[ credential, credentialHash, sig ] = await generateCredential('some claim', holder, issuer, "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", epoch.toNumber());
			// convert the credential to a prime 
			let [credentialPrime, nonce] = hashToPrime(credentialHash, 128, 0n); 
			// store the prime in distributed storage (should the issuer do this, user or both independently?)
			storeEpochPrimes(credentialPrime); 

			await credRegistryInstance.addCredential(credential.id, credential.issuer, credential.holder, credentialHash, sig, 100, credential.epoch)
			// check the credential in contract 
			await credRegistryInstance.getCredential(credential.id).then((result) => {
				assert.equal(result[1], holder, "the credential holder is the same"); 
			})
		}); 

		it('User sends issuance epoch ID and corresponding prime to the verifier', async() => {
			// user sends this data to the verifier 
			epoch = credential.epoch; 
			credentialPrime = hashToPrime(credentialHash, 128, 0n)[0]; 
			assert.equal(1, epoch, "epoch is 1"); 
		}); 

		it('Verifier retrieving the bitmap using provided epoch ID and verifies inclusion', async() => {
			// if currentEpoch == epoch 
			// verifier gets the latest data from SC 
			let [ currentBitmap, hashCount, count, capacity, currentEpoch ] = await getBitmapData(subAccInstance); 
			// then get the latest bitmap and check inclusion 
			await checkInclusionBitmap(subAccInstance, currentBitmap, hashCount, credentialPrime).then((result) => {
				// the credential has not been revoked, thus verification pass
				assert.isFalse(result, "the credential is not in bitmap"); 
			}); 
		}); 

	}); 

	describe('User attempts to verify during subsequent epoch', function() {
		// Scenario 2: 
		// 1. User sends issuance epoch ID and corresponding prime to the verifier.
		// 2. Verifier retrieves bitmap from mapping though epoch ID. 
		

		// assume local storage of those values on user's device 
		let credential; 
		let credentialHash; 
		let sig; 
		let epoch; 
		let pastBitmap; 			// epoch's bitmap 
		let pastAcc; 				// epoch's bitmap static accumulator
		let credentialPrime; 

		it('Issuer generates a credential to the user', async() => {
			// an issuer requests the current epoch from the bitmap contract
			let [ bitmap, hashCount, count, capacity, epoch ] = await getBitmapData(subAccInstance); 
			// then use this epoch ID to include into credential 
			[ credential, credentialHash, sig ] = await generateCredential('some other claim', holder, issuer, "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", epoch.toNumber());
			// convert the credential to a prime 
			let [credentialPrime, nonce] = hashToPrime(credentialHash, 128, 0n); 
			// store the prime in distributed storage (should the issuer do this, user or both independently?)
			storeEpochPrimes(credentialPrime); 

			await credRegistryInstance.addCredential(credential.id, credential.issuer, credential.holder, credentialHash, sig, 100, credential.epoch)
			// check the credential in contract 
			await credRegistryInstance.getCredential(credential.id).then((result) => {
				assert.equal(result[1], holder, "the credential holder is the same");
			}) 
		}); 

		it('Adding more credentials to the bitmap', async() => {
			let [ bitmap, hashCount, count, capacity, epoch ] = await getBitmapData(subAccInstance); 
			let inclusionSet = [ 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 
								 'al', 'am', 'an', 'ao', 'ap', 'aq', 'ar', 'as', 'at', 'au', 'av', 'aw', 'ax', 'ay', 'az',
								 'bl', 'bm', 'bn', 'bo', 'bp', 'bq', 'br', 'bs', 'bt', 'bu', 'bv', 'bw', 'bx', 'by', 'bz',
								 'cl', 'cm', 'cn', 'co', 'cp', 'cq', 'cr', 'cs', 'ct', 'cu', 'cv', 'cw', 'cx', 'cy', 'cz',
								 'dl', 'dm', 'dn', 'do', 'dp', 'dq', 'dr', 'ds', 'dt', 'du', 'dv', 'dw', 'dx', 'dy', 'dz', ];
			let credentials = []; 
			
			for (let item of inclusionSet) {
				// credential hash for each item in set 
				let [ credential, credentialHash, sig ] = await generateCredential(item, issuer, accounts[4], "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", epoch.toNumber());
				// convert the credential to a prime 
				let [credentialPrime, nonce] = hashToPrime(credentialHash, 128, 0n); 
				// imitate user's storage of credentials 
				credentials.push([ credentialHash, credentialPrime ]); 
				// send to update bitmap 
				await addToBitmap(subAccInstance, accInstance, credentialPrime); 
			}

			// assume credential and prime was stored by the user
			// retrieve it from local storage to check the inclusion
			let [ xCred, xPrime ] = credentials[inclusionSet.length - 1]; 
			// get latest bitmap, epoch 2
			[ bitmap, hashCount, count, capacity, epoch ]  = await getBitmapData(subAccInstance);  
			await checkInclusionBitmap(subAccInstance, bitmap, hashCount, xPrime).then((result) => {
				assert.isTrue(result, "the credential is in bitmap"); 
			});
		});

		it('User sends issuance epoch ID and corresponding prime to the verifier', async() => {
			// user sends this data to the verifier 
			epoch = credential.epoch; 
			credentialPrime = hashToPrime(credentialHash, 128, 0n)[0]; 
			assert.equal(1, epoch, "epoch is 1"); 
		}); 

		// 3. Verifier checks the inclusion of cred prime in bitmap: 
		// 		if present then fail, 
		// 		else 
		// 			Verify issuance epoch bitmap membership in global acc 
		// 				If failed, then verification failed (acc not in global)
		// 				else
		// 					for each subsequent epoch bitmap check inclusion 
		// 						if present fail, 
		// 						else if epoch is the current acc and credential not present, verification pass 
		// 							Verify epoch acc membership in global acc 

		it('Verifier retrieving the bitmap from mapping and verify credential exclusion', async() => {
			// if currentEpoch != epoch 
			// verifier gets the latest data from SC 
			let [ currentBitmap, hashCount, count, capacity, currentEpoch ] = await getBitmapData(subAccInstance);

			// console.log("current epoch:", currentEpoch); 
			// console.log("epoch", epoch); 
			
			let result = await getStaticAccData(accInstance, epoch); 
			pastBitmap = result[0]; 
			pastAcc = result[1]; 

			// check the inclusion of provided credential prime with retrieved bitmap under epoch 5
			await checkInclusionBitmap(subAccInstance, pastBitmap, hashCount, credentialPrime).then((result) => {
				// the credential has not been revoked 
				assert.isFalse(result, "the credential is not in bitmap"); 
			});
		}); 

		it('Verifier verifying bitmap membership membership in global accumulator', async() => {
			// pastBitmap is bitmap associated with user's credential and epoch ID provided
			await checkInclusionGlobal(accInstance, pastAcc, epoch).then((result) => {
				assert.isTrue(result, "the accumulator accessed is a member"); 
			});
		}); 

		it('Adversary attempts to verify bitmap accumulator that is not a member of global accumulator', async() => {
			let randomAcc = bigInt(24672); 
			let res = await checkInclusionGlobal(accInstance, randomAcc, epoch); 
			assert.isFalse(res, "the accumulator accessed is not a member"); 
		}); 

		it('Verifier checks exclusion in each subsequent epoch bitmaps and check its inclusion in global accumulator', async() => {
			// verifier gets the latest data from SC 
			let [ currentBitmap, hashCount, count, capacity, currentEpoch ] = await getBitmapData(subAccInstance);

			for (let i = epoch + 1; i < currentEpoch.toNumber() + 1; i++) {
				if (i != currentEpoch) {
					let [ pastBitmap, pastAcc ] = await getStaticAccData(accInstance, i); 
					// check the inclusion of provided credential prime with retrieved bitmap
					await checkInclusionBitmap(subAccInstance, pastBitmap, hashCount, credentialPrime).then((result) => {
						assert.isFalse(result, "credential is not in subsequent bitmap");
					});
					// check the inclusion of bitmap in the global accumulator 
					await checkInclusionGlobal(accInstance, pastAcc, i).then((result) => {
						assert.isTrue(result, "bitmap acc is in global accumulator");
					})
				}
			}

			// check the inclusion of credential in the current ongoing bitmap 
			[ bitmap, hashCount, count, capacity, epoch ]  = await getBitmapData(subAccInstance);  
			await checkInclusionBitmap(subAccInstance, bitmap, hashCount, credentialPrime).then((result) => {
				assert.isFalse(result, "credential is not subsequent bitmap");
			});
		}); 

	}); 
});
