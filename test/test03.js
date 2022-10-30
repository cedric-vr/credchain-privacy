var bigInt = require("big-integer");

const { web3, assert, artifacts } = require("hardhat");
const { generateCredential } = require("../utilities/credential.js"); 
const { gen, hashToPrime } = require("../utilities/accumulator.js"); 
const { initBitmap, getBitmapData, getStaticAccData, checkInclusionBitmap } = require("../utilities/bitmap.js"); 

const { emptyProducts, emptyStaticAccData } = require("../utilities/product"); 
const { revoke, verify } = require("../revocation/revocation"); 

// using the following approach for testing: 
// https://hardhat.org/hardhat-runner/docs/other-guides/truffle-testing

const DID = artifacts.require("DID"); 
const Cred = artifacts.require("Credentials"); 
const Admin = artifacts.require("AdminAccounts"); 
const Issuer = artifacts.require("Issuers"); 
const SubAcc = artifacts.require("SubAccumulator"); 
const Acc = artifacts.require("Accumulator"); 


describe("Testing revocation across different epoch", function() {
	let accounts;
	let holder;
	let issuer; 

	// bitmap capacity 
	let capacity = 20; // up to uin256 max elements 

	// contract instances 
	let adminRegistryInstance; 
	let issuerRegistryInstance; 
	let didRegistryInstance; 
	let credRegistryInstance; 
	let subAccInstance; 
	let accInstance; 

	let inclusionSet; 

    // user / holder of credential_a provides to verifier 
    // credential a is valid 
    let epoch_a;                    // when credential was issued 
    let credentialHash_a; 
    // credential b is not valid 
    let epoch_b;
    let credentialHash_b; 

    // for testing 
    let credentials = []            // imitage various users that hold credentials   

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

    describe("Issuance", function() {
        it('Issuing large number of credentials', async() => {
            let [ currentBitmap, hashCount, count, capacity, currentEpoch ] = await getBitmapData(subAccInstance);
			inclusionSet = [ 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 
								 'al', 'am', 'an', 'ao', 'ap', 'aq', 'ar', 'as', 'at', 'au', 'av', 'aw', 'ax', 'ay', 'az',
								 'bl', 'bm', 'bn', 'bo', 'bp', 'bq', 'br', 'bs', 'bt', 'bu', 'bv', 'bw', 'bx', 'by', 'bz',
								 'cl', 'cm', 'cn', 'co', 'cp', 'cq', 'cr', 'cs', 'ct', 'cu', 'cv', 'cw', 'cx', 'cy', 'cz',
								 'dl', 'dm', 'dn', 'do', 'dp', 'dq', 'dr', 'ds', 'dt', 'du', 'dv', 'dw', 'dx', 'dy', 'dz',
                                 'el', 'em', 'en', 'eo', 'ep', 'eq', 'er', 'es', 'et', 'eu', 'ev', 'ew', 'ex', 'ey', 'ez',
                                 'el', 'em', 'en', 'eo', 'ep', 'eq', 'er', 'es', 'et', 'eu', 'ev', 'ew', 'ex', 'ey', 'ez' ];

            let loop = 0;

			for (let item of inclusionSet) {
				// credential hash for each item in set 
				let [ credential, credentialHash, sig ] = await generateCredential(item, issuer, accounts[4], "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", currentEpoch.toNumber());
				
				// console.log(credential); 
				
				// convert the credential to a prime 
				let [credentialPrime, nonce] = hashToPrime(credentialHash, 128, 0n); 
				// imitate user's storage of credential and corresponding prime 
				credentials.push([ credentialHash, credentialPrime ]);  

                // for testing - user stores this and then provides cred and epoch to the verifier 
                // for valid credential 
                if (loop === inclusionSet.length - 1) { 
                    epoch_a = credential.epoch; 
                    credentialHash_a = credentialHash; 
                }
                // for invalid credential
                if(loop === 20) {
                    epoch_b = credential.epoch;
                    credentialHash_b = credentialHash; 
                }
                loop += 1; 
			}; 
            
            assert.equal(inclusionSet.length, credentials.length, "processed all credentials"); 
        }); 
    }); 

    describe("Revocation", function() {
        it('Revoking some credentials', async() => {
            // take part of list for revokation 
            let credentialsToRevoke = credentials.slice(0, 40); 

            for (let [cred, prime] of credentialsToRevoke) {
                await revoke(cred, subAccInstance, accInstance); 
            }

            // assume credential and prime was stored by the user, retrieve it from local storage to check the inclusion
            let [ validCred, validPrime ] = credentials[credentials.length - 1]; 
            // get the latest bitmap and epoch, credential should be valid and thus not in bitmap
            [ currentBitmap, hashCount, count, capacity, currentEpoch ]  = await getBitmapData(subAccInstance);  
			await checkInclusionBitmap(subAccInstance, currentBitmap, hashCount, validPrime).then((result) => {
				assert.isFalse(result, "the credential was not revoked"); 
			});

            // check the first element 
            // assume credential and prime was stored by the user, retrieve it from local storage to check the inclusion
            let [ invalidCred, invalidPrime ] = credentials[20]; 
            // the credential was revoked during epoch #2
            // get the latest bitmap based on epoch 
            let [ bitmap_b, acc_b ] = await getStaticAccData(accInstance, 3); 
			// check the inclusion of provided credential prime with retrieved bitmap
			await checkInclusionBitmap(subAccInstance, bitmap_b, hashCount, invalidPrime).then((result) => {
				assert.isTrue(result, "the credential was revoked"); 
			});
        });
    });

    describe("Verification", function() {
        it('Verifier verifies a valid credential', async() => {
            // verifier receives from the user credential hash and epoch when it was issued 
            // the credentialHash_a is the last element of the inclusion set and was not revoked
			// var startTime = performance.now();
			// let verification = await verify(credentialHash_a, epoch_a, subAccInstance, accInstance); 
			// var endTime = performance.now();
			// console.log(`Call to verification of valid credential took ${endTime - startTime} milliseconds`)

            await verify(credentialHash_a, epoch_a, subAccInstance, accInstance).then((result) => {
				console.log("verification result:", result)
				assert.isTrue(result, "the credential is valid"); 
            });
        });

        it('Verifier verifies an invalid credential', async() => {
			// var startTime = performance.now();
			// let verification = await verify(credentialHash_b, epoch_b, subAccInstance, accInstance); 
			// var endTime = performance.now();
			// console.log(`Call to verification of invalid credential took ${endTime - startTime} milliseconds`)

            // verifier receives from the user credential hash and epoch when it was issued 
            // the credentialHash_b is the first element of the inclusion set and was revoked 
            await verify(credentialHash_b, epoch_b, subAccInstance, accInstance).then((result) => {
				console.log("verification result:", result)
                assert.isFalse(result, "the credential was revoked"); 
            });
        });
    }); 

	// describe('User attemps to verify during issuance epoch', function() {
	// 	let credential;
	// 	let credentialHash; 
	// 	let sig;
	// 	let epoch; 

	// 	it('Credential generating', async() => {
	// 		let claim = inclusionSet.length - 1; 
			
	// 		[ credential, credentialHash, sig ] = await generateCredential(claim, issuer, accounts[4], "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", currentEpoch.toNumber());
	// 		let [credentialPrime, nonce] = hashToPrime(credentialHash, 128, 0n); 
	// 	});

	// 	it('Issuer revokes credential', async() => {
	// 		var startTime = performance.now();
	// 		await revoke(credentialHash, subAccInstance, accInstance); 
	// 		var endTime = performance.now();
	// 		console.log(`Call to revoke a credential took ${endTime - startTime} milliseconds`)
	// 	}); 

	// 	it('Verifying invalid cderential during issuance epoch', async() => {
	// 		let [ currentBitmap, hashCount, count, capacity, currentEpoch ] = await getBitmapData(subAccInstance);

	// 		var startTime = performance.now();
	// 		let verification = await verify(credentialHash, currentEpoch.toNumber(), subAccInstance, accInstance); 
	// 		var endTime = performance.now();
	// 		console.log(`Call to verification of invalid credential took ${endTime - startTime} milliseconds`)
	// 	});
	// }); 

});