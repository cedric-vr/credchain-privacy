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
    let epochs = [] 

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

    describe("Single credential, 1st epoch", function() {
        let credential;
		let credentialHash; 
		let sig;
		let epoch; 

        it('Issuing a credential', async() => {
            inclusionSet = [ 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 
            'al', 'am', 'an', 'ao', 'ap', 'aq', 'ar', 'as', 'at', 'au', 'av', 'aw', 'ax', 'ay', 'az',
            'bl', 'bm', 'bn', 'bo', 'bp', 'bq', 'br', 'bs', 'bt', 'bu', 'bv', 'bw', 'bx', 'by', 'bz',
            'cl', 'cm', 'cn', 'co', 'cp', 'cq', 'cr', 'cs', 'ct', 'cu', 'cv', 'cw', 'cx', 'cy', 'cz',
            'dl', 'dm', 'dn', 'do', 'dp', 'dq', 'dr', 'ds', 'dt', 'du', 'dv', 'dw', 'dx', 'dy', 'dz',
            'el', 'em', 'en', 'eo', 'ep', 'eq', 'er', 'es', 'et', 'eu', 'ev', 'ew', 'ex', 'ey', 'ez',
            'el', 'em', 'en', 'eo', 'ep', 'eq', 'er', 'es', 'et', 'eu', 'ev', 'ew', 'ex', 'ey', 'ez' ];

            let claim = inclusionSet[0]; 
            let [ currentBitmap, hashCount, count, capacity, currentEpoch ] = await getBitmapData(subAccInstance);
			[ credential, credentialHash, sig ] = await generateCredential(claim, issuer, accounts[4], "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", currentEpoch.toNumber());
            let [credentialPrime, nonce] = hashToPrime(credentialHash, 128, 0n); 
            epoch = currentEpoch.toNumber(); 
        }); 

        it('Revoking a credential', async() => {
            var startTime = performance.now();
			await revoke(credentialHash, subAccInstance, accInstance); 
			var endTime = performance.now();
			console.log(`Call to revoke a credential in first epoch took ${endTime - startTime} milliseconds`)
        }); 

        it('Verifying credential validity', async() => {
			var startTime = performance.now();
			let verification = await verify(credentialHash, epoch, subAccInstance, accInstance); 
			var endTime = performance.now();
			console.log(`Call to verification of invalid credential in current epoch took ${endTime - startTime} milliseconds`)
        });
    }); 

    describe("More credentials, 2nd epoch verification", async() => {

        it('Issuing large number of credentials', async() => {
            
            // let loop = 0;

			for (let item of inclusionSet.slice(1, 16)) {
                let [ currentBitmap, hashCount, count, capacity, currentEpoch ] = await getBitmapData(subAccInstance);
				// credential hash for each item in set 
				let [ credential, credentialHash, sig ] = await generateCredential(item, issuer, accounts[4], "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", currentEpoch.toNumber());
				// convert the credential to a prime 
				let [credentialPrime, nonce] = hashToPrime(credentialHash, 128, 0n); 
				// imitate user's storage of credential and corresponding prime 
				credentials.push([ credentialHash, credentialPrime ]); 
                epochs.push(credential.epoch);
                // loop += 1; 
			}; 

            assert.equal(15, credentials.length, "issued 25 credentials"); 
        }); 
    });

    describe("Revocation", function() {

        // let credentialsToRevoke;
        it('Revoking some credentials', async() => {
            // take part of list for revokation 
            let credentialsToRevoke = credentials; 

            for (let [cred, prime] of credentialsToRevoke) {
                let [ currentBitmap, hashCount, count, capacity, currentEpoch ] = await getBitmapData(subAccInstance);
                // console.log("current epoch:", currentEpoch.toNumber());
                var startTime = performance.now();
                await revoke(cred, subAccInstance, accInstance); 
                var endTime = performance.now();
                // console.log(`Call to revoke a credential took ${endTime - startTime} milliseconds`)
            }
        });

        it('Verifying revoked credential during subsequent epoch', async() => {
            let [ credentialHash, credentialPrime ] = credentials[10]; 
            let epoch = epochs[10]; 

            // console.log("credential issuance epoch:", epoch); 
            let [ currentBitmap, hashCount, count, capacity, currentEpoch ] = await getBitmapData(subAccInstance);
            console.log("issuance epoch:", epoch, "current epoch:", currentEpoch.toNumber());

            var startTime = performance.now();
			let verification = await verify(credentialHash, epoch, subAccInstance, accInstance); 
			var endTime = performance.now();
            console.log(`Call to verification of invalid credential in subsequent epoch took ${endTime - startTime} milliseconds`)
        }); 

        it('Issuing and revoking more credentials', async() => {
            
            for (let item of inclusionSet.slice(16, 30)) {
                let [ currentBitmap, hashCount, count, capacity, currentEpoch ] = await getBitmapData(subAccInstance);
				// credential hash for each item in set 
				let [ credential, credentialHash, sig ] = await generateCredential(item, issuer, accounts[4], "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", currentEpoch.toNumber());
				// convert the credential to a prime 
				let [credentialPrime, nonce] = hashToPrime(credentialHash, 128, 0n); 
				// imitate user's storage of credential and corresponding prime 
				credentials.push([ credentialHash, credentialPrime ]); 
                epochs.push(credential.epoch);
                // loop += 1; 
			}; 

            let credentialsToRevoke = credentials.slice(16, 30); 

            for (let [cred, prime] of credentialsToRevoke) {
                let [ currentBitmap, hashCount, count, capacity, currentEpoch ] = await getBitmapData(subAccInstance);
                // console.log("current epoch:", currentEpoch.toNumber());
                var startTime = performance.now();
                await revoke(cred, subAccInstance, accInstance); 
                var endTime = performance.now();
                // console.log(`Call to revoke a credential took ${endTime - startTime} milliseconds`)
            }
        });

        it('Verify revoked credential during few more subsequent epochs', async() => {
            var [ credentialHash, credentialPrime ] = credentials[17]; 
            var epoch = epochs[17]; 

            // console.log("credential issuance epoch:", epoch); 
            let [ currentBitmap, hashCount, count, capacity, currentEpoch ] = await getBitmapData(subAccInstance);
            console.log("issuance epoch:", epoch, "current epoch:", currentEpoch.toNumber());

            var startTime = performance.now();
			let verification = await verify(credentialHash, epoch, subAccInstance, accInstance); 
			var endTime = performance.now();
            console.log(`Call to verification of invalid credential in subsequent epoch took ${endTime - startTime} milliseconds`)
        
            var [ credentialHash, credentialPrime ] = credentials[18]; 
            var epoch = epochs[18]; 

            // console.log("credential issuance epoch:", epoch); 
            [ currentBitmap, hashCount, count, capacity, currentEpoch ] = await getBitmapData(subAccInstance);
            console.log("issuance epoch:", epoch, "current epoch:", currentEpoch.toNumber());

            var startTime = performance.now();
			verification = await verify(credentialHash, epoch, subAccInstance, accInstance); 
			var endTime = performance.now();
            console.log(`Call to verification of invalid credential in subsequent epoch took ${endTime - startTime} milliseconds`)

            var [ credentialHash, credentialPrime ] = credentials[20]; 
            var epoch = epochs[20]; 

            // console.log("credential issuance epoch:", epoch); 
            [ currentBitmap, hashCount, count, capacity, currentEpoch ] = await getBitmapData(subAccInstance);
            console.log("issuance epoch:", epoch, "current epoch:", currentEpoch.toNumber());

            var startTime = performance.now();
			verification = await verify(credentialHash, epoch, subAccInstance, accInstance); 
			var endTime = performance.now();
            console.log(`Call to verification of invalid credential in subsequent epoch took ${endTime - startTime} milliseconds`)
        }); 

        it('Revoke some credential from 1st epoch ant verify at current', async() => {
            let [ credentialHash, credentialPrime ] = credentials[10]; 
            let epoch = epochs[10]; 

            // await revoke(credentialHash, subAccInstance, accInstance); 

            // console.log("credential issuance epoch:", epoch); 
            [ currentBitmap, hashCount, count, capacity, currentEpoch ] = await getBitmapData(subAccInstance);
            console.log("issuance epoch:", epoch, "current epoch:", currentEpoch.toNumber());

            var startTime = performance.now();
			verification = await verify(credentialHash, epoch, subAccInstance, accInstance); 
			var endTime = performance.now();
            console.log(`Call to verification of invalid credential in subsequent epoch took ${endTime - startTime} milliseconds`)
        }); 

        it('Revoke more credentials', async() => {
            for (let item of inclusionSet.slice(30, 70)) {
                let [ currentBitmap, hashCount, count, capacity, currentEpoch ] = await getBitmapData(subAccInstance);
				// credential hash for each item in set 
				let [ credential, credentialHash, sig ] = await generateCredential(item, issuer, accounts[4], "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", currentEpoch.toNumber());
				// convert the credential to a prime 
				let [credentialPrime, nonce] = hashToPrime(credentialHash, 128, 0n); 
				// imitate user's storage of credential and corresponding prime 
				credentials.push([ credentialHash, credentialPrime ]); 
                epochs.push(credential.epoch);
			}; 

            let credentialsToRevoke = credentials.slice(30, 60); 

            for (let [cred, prime] of credentialsToRevoke) {
                let [ currentBitmap, hashCount, count, capacity, currentEpoch ] = await getBitmapData(subAccInstance);
                // console.log("current epoch:", currentEpoch.toNumber());
                var startTime = performance.now();
                await revoke(cred, subAccInstance, accInstance); 
                var endTime = performance.now();
                // console.log(`Call to revoke a credential took ${endTime - startTime} milliseconds`)
            }

        }); 

        it('Revoking credential after few epochs', async() => {
            let [ credentialHash, credentialPrime ] = credentials[67]; 
            let epoch = epochs[67]; 

            let [ currentBitmap, hashCount, count, capacity, currentEpoch ] = await getBitmapData(subAccInstance);
            console.log("issuance epoch:", epoch, "current epoch:", currentEpoch.toNumber());

            var startTime = performance.now();
            await revoke(credentialHash, subAccInstance, accInstance); 
            var endTime = performance.now();
            console.log(`Call to revoke a credential took ${endTime - startTime} milliseconds`)
        }); 

        it('Verifing credential', async() => {
            let [ credentialHash, credentialPrime ] = credentials[67]; 
            let epoch = epochs[67]; 

            [ currentBitmap, hashCount, count, capacity, currentEpoch ] = await getBitmapData(subAccInstance);
            console.log("issuance epoch:", epoch, "current epoch:", currentEpoch.toNumber());
            
            var startTime = performance.now();
			verification = await verify(credentialHash, epoch, subAccInstance, accInstance); 
			var endTime = performance.now();
            console.log(`Call to verification of invalid credential in subsequent epoch took ${endTime - startTime} milliseconds`)
        }); 

        it('Revoke more credentials', async() => {
            for (let item of inclusionSet.slice(70, 105)) {
                let [ currentBitmap, hashCount, count, capacity, currentEpoch ] = await getBitmapData(subAccInstance);
				// credential hash for each item in set 
				let [ credential, credentialHash, sig ] = await generateCredential(item, issuer, accounts[4], "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", currentEpoch.toNumber());
				// convert the credential to a prime 
				let [credentialPrime, nonce] = hashToPrime(credentialHash, 128, 0n); 
				// imitate user's storage of credential and corresponding prime 
				credentials.push([ credentialHash, credentialPrime ]); 
                epochs.push(credential.epoch);
			}; 

            let credentialsToRevoke = credentials.slice(60, 100); 
            // console.log()

            for (let [cred, prime] of credentialsToRevoke) {
                let [ currentBitmap, hashCount, count, capacity, currentEpoch ] = await getBitmapData(subAccInstance);
                // console.log("current epoch:", currentEpoch.toNumber());
                var startTime = performance.now();
                await revoke(cred, subAccInstance, accInstance); 
                var endTime = performance.now();
                // console.log(`Call to revoke a credential took ${endTime - startTime} milliseconds`)
            }

            // let [ currentBitmap, hashCount, count, capacity, currentEpoch ] = await getBitmapData(subAccInstance);
            // for (let i = 0; i < credentialsToRevoke.length; i++) {
            //     console.log("issuance epoch:", epochs[i], "current epoch:", currentEpoch.toNumber());
            //     // var startTime = performance.now();
            //     // verification = await verify(credentialsToRevoke[i][0], epochs[i], subAccInstance, accInstance); 
            //     // var endTime = performance.now();
            //     // console.log("verified:", verification); 
            //     // console.log(`Call to verification of invalid credential in subsequent epoch took ${endTime - startTime} ms`)
            //     // console.log();
            // }
        }); 

        // function makeid(length) {
        //     var result           = '';
        //     var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        //     var charactersLength = characters.length;
        //     for ( var i = 0; i < length; i++ ) {
        //         result += characters.charAt(Math.floor(Math.random() * charactersLength));
        //     }
        //     return result;
        // }

        // it('Revoke...', async() => {
        //     for (let i = 0; i < 100; i++) {
        //         let item = makeid(5);
        //         let [ currentBitmap, hashCount, count, capacity, currentEpoch ] = await getBitmapData(subAccInstance);
		// 		// credential hash for each item in set 
		// 		let [ credential, credentialHash, sig ] = await generateCredential(item, issuer, accounts[4], "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", currentEpoch.toNumber());
		// 		// convert the credential to a prime 
		// 		let [credentialPrime, nonce] = hashToPrime(credentialHash, 128, 0n); 
		// 		// imitate user's storage of credential and corresponding prime 
		// 		credentials.push([ credentialHash, credentialPrime ]); 
        //         epochs.push(credential.epoch);
		// 	}; 
        // }); 

        it('Verify', async() => {
            // for (let i = 0; i < credentials.length; i++) {
            //     credentials[i][0];
            //     credentialsToRevoke[i]; 
            // }
            
            // let [ currentBitmap, hashCount, count, capacity, currentEpoch ] = await getBitmapData(subAccInstance);
            // for (let i = 0; i < credentials.length; i++) {
            //     console.log("issuance epoch:", epochs[i], "current epoch:", currentEpoch.toNumber());
            //     var startTime = performance.now();
            //     verification = await verify(credentials[i][0], epochs[i], subAccInstance, accInstance); 
            //     var endTime = performance.now();
            //     console.log("verified:", verification); 
            //     console.log(`Call to verification of invalid credential in subsequent epoch took ${endTime - startTime} ms`)
            //     console.log();
            // }

            // for (let [ credentialHash, credentialPrime ] of credentials) {

            //     var startTime = performance.now();
            //     verification = await verify(credentialHash, epoch, subAccInstance, accInstance); 
            //     var endTime = performance.now();
            //     console.log(`Call to verification of invalid credential in subsequent epoch took ${endTime - startTime} milliseconds`)
            // }
        })
    });

    describe('Revocating a lot of credentials', function() {

        function makeid(length) {
            var result           = '';
            var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            var charactersLength = characters.length;
            for ( var i = 0; i < length; i++ ) {
                result += characters.charAt(Math.floor(Math.random() * charactersLength));
            }
            return result;
        }

        it('Revoke...', async() => {
            for (let i = 0; i < 200; i++) {
                let item = makeid(5);
                let [ currentBitmap, hashCount, count, capacity, currentEpoch ] = await getBitmapData(subAccInstance);
				// credential hash for each item in set 
				let [ credential, credentialHash, sig ] = await generateCredential(item, issuer, accounts[4], "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", currentEpoch.toNumber());
				// convert the credential to a prime 
				let [credentialPrime, nonce] = hashToPrime(credentialHash, 128, 0n); 
				// imitate user's storage of credential and corresponding prime 
				credentials.push([ credentialHash, credentialPrime ]); 
                epochs.push(credential.epoch);
			}; 

            //     let credentialsToRevoke = credentials.slice(100); 

            let [ credentialHash, credentialPrime ] = credentials[79]; 
            let epoch = epochs[79]; 

            [ currentBitmap, hashCount, count, capacity, currentEpoch ] = await getBitmapData(subAccInstance);
            console.log("issuance epoch:", epoch, "current epoch:", currentEpoch.toNumber());
            
            var startTime = performance.now();
            verification = await verify(credentialHash, epoch, subAccInstance, accInstance); 
            var endTime = performance.now();
            console.log(`Call to verification of invalid credential in subsequent epoch took ${endTime - startTime} milliseconds`)


            console.log(credentials[2]); 

            [ credentialHash, credentialPrime ] = credentials[2]; 
            epoch = epochs[2]; 

            [ currentBitmap, hashCount, count, capacity, currentEpoch ] = await getBitmapData(subAccInstance);
            console.log("issuance epoch:", epoch, "current epoch:", currentEpoch.toNumber());
            
            var startTime = performance.now();
            verification = await verify(credentialHash, epoch, subAccInstance, accInstance); 
            var endTime = performance.now();
            console.log(`Call to verification of invalid credential in subsequent epoch took ${endTime - startTime} milliseconds`)
        }); 
    });

    describe('Verifying bitmaps', function() {
        // it('Getting some bitmap from the archieve and verifying', async() => {
        //     // case where proof is in tx 

        //     // get the data for epoch 6
        //     let staticData = await accInstance.getStaticAcc(6); 
        //     let bitmap = staticData[0]; 
        //     let acc = bigInt(staticData[1].slice(2), 16); 

        //     // console.log(bitmap, acc); 

        //     // get the tx hash stored for epoch 6 
        //     let txHash = await accInstance.getTx(6); 
        //     // console.log(txHash); 

        //     // query the transactions 
        //     let tx = await web3.eth.getTransactionReceipt(txHash);
        //     // console.log(tx); 

        //     let data = tx.logs[0].data; 
        //     let proofPrime = bigInt(data.slice(194, 1218), 16); 
        //     let globalAccPrime = bigInt(data.slice(1282), 16); 

        //     assert.isTrue(bigInt(proofPrime).equals(globalAccPrime), "the proof is equal to acc"); 
        // }); 

        // it('Getting some bitmap from the archieve and verifying', async() => {
        //     // case where witness is in tx and proof is calculated on the fly 
        //     // get the data for epoch 6
        //     let staticData = await accInstance.getStaticAcc(6); 
        //     let bitmap = staticData[0]; 
        //     let staticAcc = bigInt(staticData[1].slice(2), 16); 

        //     // get the tx hash stored for epoch 6 
        //     let txHash = await accInstance.getTx(6); 
        //     let tx = await web3.eth.getTransactionReceipt(txHash);
        //     let data = tx.logs[0].data; 

        //     let witnessPrime = bigInt(data.slice(194, 1218), 16); 
        //     let globalAccPrime = bigInt(data.slice(1282), 16); 

        //     let accData = await accInstance.getGlobalAcc(); 
        //     // convert to prime numbers 
        //     // let acc = bigInt(data[0].slice(2), 16); 
        //     let n = bigInt(accData[1].slice(2), 16); 
        //     // let g = bigInt(data[2].slice(2), 16); 

        //     let proof = bigInt(witnessPrime).modPow(staticAcc, n);

        //     // console.log(bigInt(proof).equals(globalAccPrime))
        //     // assert.isTrue(bigInt(proof).equals(globalAccPrime), "the proof is equal to acc"); 
        // }); 
    }); 

});