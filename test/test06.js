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

	// let inclusionSet; 

    // user / holder of credential_a provides to verifier 
    // credential a is valid 
    // let epoch_a;                    // when credential was issued 
    // let credentialHash_a; 
    // credential b is not valid 
    // let epoch_b;
    // let credentialHash_b; 

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

    describe("Issuance & verification", function() {
        function makeid(length) {
            var result           = '';
            var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            var charactersLength = characters.length;
            for ( var i = 0; i < length; i++ ) {
                result += characters.charAt(Math.floor(Math.random() * charactersLength));
            }
            return result;
        }

        async function issueCreds() {
            for (let i = 0; i < 20; i++) {
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
        }

        async function revokeCreds(start, end) {
            for (let i = start; i < end; i++) {
                let [ currentBitmap, hashCount, count, capacity, currentEpoch ] = await getBitmapData(subAccInstance);
                var startTime = performance.now();
                await revoke(credentials[i][0], subAccInstance, accInstance);
                var endTime = performance.now(); 
                // console.log(`Revoke credential ${credentials[i][0]} | revocation epoch: ${currentEpoch.toNumber()} | issuance epoch: ${epochs[i]} | took: ${endTime - startTime} ms`)
            }
        }

        async function verifyCred(num) {
            let [ currentBitmap, hashCount, count, capacity, currentEpoch ] = await getBitmapData(subAccInstance);
            var startTime = performance.now();
            let verification = await verify(credentials[num][0], epochs[num], subAccInstance, accInstance); 
            // console.log(verification); 
            var endTime = performance.now();
            console.log(`${verification}: Verify credential issued at current: ${currentEpoch.toNumber()} | issued at: ${epochs[num]} | took: ${endTime - startTime} ms`)
        }

        it('Issuing credentials, round 1', async() => {
            await issueCreds(); 

            for (let j = 0; j < credentials.length; j++) {
                let [ currentBitmap, hashCount, count, capacity, currentEpoch ] = await getBitmapData(subAccInstance);
                // console.log("credential:", credentials[j][0], "issuance epoch:", epochs[j], "curr epoch:", currentEpoch.toNumber());
            }
        }); 

        it('Revoke credentials, round 1', async() => {
            await revokeCreds(0, 20); 
        });

        it('Issuing credentials, round 2', async() => {
            await issueCreds(); 

            for (let j = 0; j < credentials.length; j++) {
                let [ currentBitmap, hashCount, count, capacity, currentEpoch ] = await getBitmapData(subAccInstance);
                // console.log("credential:", credentials[j][0], "issuance epoch:", epochs[j], "curr epoch:", currentEpoch.toNumber());
            }
        });

        // it('Revoke credentials, round 2', async() => {
        //     await revokeCreds(20, 40); 
        // }); 

        it('Issuing credentials, round 3', async() => {
            await issueCreds(); 

            for (let j = 0; j < credentials.length; j++) {
                let [ currentBitmap, hashCount, count, capacity, currentEpoch ] = await getBitmapData(subAccInstance);
                // console.log("credential:", credentials[j][0], "issuance epoch:", epochs[j], "curr epoch:", currentEpoch.toNumber());
            }
        });

        it('Revoke credentials, round 3', async() => {
            await revokeCreds(40, 60); 
        }); 

        it('Issuing credentials, round 4', async() => {
            await issueCreds(); 

            for (let j = 0; j < credentials.length; j++) {
                let [ currentBitmap, hashCount, count, capacity, currentEpoch ] = await getBitmapData(subAccInstance);
                // console.log("credential:", credentials[j][0], "issuance epoch:", epochs[j], "curr epoch:", currentEpoch.toNumber());
            }
        });

        it('Revoke credentials, round 4', async() => {
            await revokeCreds(60, 80); 
        }); 

        it('Issuing credentials, round 5', async() => {
            await issueCreds(); 

            for (let j = 0; j < credentials.length; j++) {
                let [ currentBitmap, hashCount, count, capacity, currentEpoch ] = await getBitmapData(subAccInstance);
                // console.log("credential:", credentials[j][0], "issuance epoch:", epochs[j], "curr epoch:", currentEpoch.toNumber());
            }
        });

        it('Revoke credentials, round 5', async() => {
            await revokeCreds(80, 100); 
        }); 

        it('Issuing credentials, round 6', async() => {
            await issueCreds(); 

            for (let j = 0; j < credentials.length; j++) {
                let [ currentBitmap, hashCount, count, capacity, currentEpoch ] = await getBitmapData(subAccInstance);
                // console.log("credential:", credentials[j][0], "issuance epoch:", epochs[j], "curr epoch:", currentEpoch.toNumber());
            }
        });

        it('Revoke credentials, round 6', async() => {
            await revokeCreds(100, 120); 
        });

        it('Issuing credentials, round 7', async() => {
            await issueCreds(); 

            for (let j = 0; j < credentials.length; j++) {
                let [ currentBitmap, hashCount, count, capacity, currentEpoch ] = await getBitmapData(subAccInstance);
                // console.log("credential:", credentials[j][0], "issuance epoch:", epochs[j], "curr epoch:", currentEpoch.toNumber());
            }
        });

        it('Revoke credentials, round 7', async() => {
            await revokeCreds(120, 140); 
        });

        it('Issuing credentials, round 8', async() => {
            await issueCreds(); 

            for (let j = 0; j < credentials.length; j++) {
                let [ currentBitmap, hashCount, count, capacity, currentEpoch ] = await getBitmapData(subAccInstance);
                // console.log("credential:", credentials[j][0], "issuance epoch:", epochs[j], "curr epoch:", currentEpoch.toNumber());
            }
        });

        it('Revoke credentials, round 8', async() => {
            await revokeCreds(140, 160); 
        });

        it('Issuing credentials, round 9', async() => {
            await issueCreds(); 

            for (let j = 0; j < credentials.length; j++) {
                let [ currentBitmap, hashCount, count, capacity, currentEpoch ] = await getBitmapData(subAccInstance);
                // console.log("credential:", credentials[j][0], "issuance epoch:", epochs[j], "curr epoch:", currentEpoch.toNumber());
            }
        });

        // it('Revoke credentials, round 9', async() => {
        //     await revokeCreds(160, 180); 
        // });

        it('Issuing credentials, round 10', async() => {
            await issueCreds(); 

            for (let j = 0; j < credentials.length; j++) {
                let [ currentBitmap, hashCount, count, capacity, currentEpoch ] = await getBitmapData(subAccInstance);
                // console.log("credential:", credentials[j][0], "issuance epoch:", epochs[j], "curr epoch:", currentEpoch.toNumber());
            }
        });

        // it('Revoke credentials, round 10', async() => {
        //     await revokeCreds(180, 200); 
        // });
        
        it('Verify credentials', async() => {
            // await verifyCred(1); 
            await verifyCred(10); 
            await verifyCred(20);
            await verifyCred(30);
            await verifyCred(40);
            await verifyCred(50);
            await verifyCred(60);
            await verifyCred(70);
            await verifyCred(80); 
            await verifyCred(90);
            await verifyCred(100);      
            await verifyCred(110);
            await verifyCred(120);
            await verifyCred(130);
            await verifyCred(140);
            await verifyCred(150);
            await verifyCred(160);
            await verifyCred(170);
            await verifyCred(180);
            await verifyCred(190);
            // await verifyCred(200);            
        });
    }); 
});