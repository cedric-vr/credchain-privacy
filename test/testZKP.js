var bigInt = require("big-integer");

const { web3, assert, artifacts } = require("hardhat");
const { generateCredential } = require("../utilities/credential.js");
const { gen, hashToPrime } = require("../utilities/accumulator.js");
const { initBitmap, addToBitmap, getBitmapData, getStaticAccData, checkInclusionBitmap, checkInclusionGlobal } = require("../utilities/bitmap.js");
const { storeEpochPrimes } = require("../utilities/epoch.js");
const { emptyProducts, emptyStaticAccData } = require("../utilities/product");
const { generateZKP } = require("../ZKPs/user.js");
const { verifyZKP } = require("../ZKPs/verifier.js");

const { verify } = require("../revocation/revocation");

// using the following approach for testing:
// https://hardhat.org/hardhat-runner/docs/other-guides/truffle-testing

const DID = artifacts.require("DID");
const Cred = artifacts.require("Credentials");
const Admin = artifacts.require("AdminAccounts");
const Issuer = artifacts.require("IssuerRegistry");
const SubAcc = artifacts.require("SubAccumulator");
const Acc = artifacts.require("Accumulator");


describe("DID Registry", function() {
    let accounts;
    let holder;
    let issuer;

    let issuer_;
    let issuer_Pri;

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
        // issuer = accounts[2];
        // create an account with public/private keys
        issuer_ = web3.eth.accounts.create();
        issuer_Pri = issuer_.privateKey;
        issuer = issuer_.address;
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

            // calculate how many hash functions needed and update in contract
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

    describe("Add issuer to the registry", function() {
        it('Adding issuer', async() => {
            await issuerRegistryInstance.addIssuer(issuer);
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

// ===================================================================================================================

    describe("Credential issuance and ZKP verification for correct Issuance Timestamp", function() {
        let proof, vk, credential, credentialHash, sig, epoch, credentialPrime;

        it("Issuer generates a ZKP for a credential", async function() {
            // Case: Issuance Date must be larger than Threshold Date
            const degreeThresholdTimestamp = "1262304000";  // Unix timestamp: Fri Jan 01 2010 00:00:00
            const degreeIssuanceTimestamp = "1500000000";   // Unix timestamp: Fri Jul 14 2017 02:40:00
            const result = await generateZKP(degreeIssuanceTimestamp, degreeThresholdTimestamp);
            proof = result.proof;
            vk = result.vk;

            assert.isNotNull(proof, "Proof should not be null");
            assert.isNotNull(vk, "Verification key should not be null");

            // Generate credential
            let [bitmap, hashCount, count, capacity, epoch] = await getBitmapData(subAccInstance);
            [credential, credentialHash, sig] = await generateCredential('some claim', holder, issuer, "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", epoch.toNumber());
            [credentialPrime, nonce] = hashToPrime(credentialHash, 128, 0n);
            storeEpochPrimes(credentialPrime);

            await credRegistryInstance.addCredential(credential.id, credential.issuer, credential.holder, credentialHash, sig, 100, credential.epoch);
            await credRegistryInstance.getCredential(credential.id).then((result) => {
                assert.equal(result[1], holder, "the credential holder is the same");
            });
        });

        it("User sends the ZKP and VK to the verifier", async function() {
            // Simulate user sending the proof and VK to the verifier
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
            assert.isNotNull(proof, "Proof should not be null when sent");
            assert.isNotNull(vk, "Verification key should not be null when sent");
        });

        it("Verifier verifies the ZKP and checks bitmap", async function() {
            const isVerified = await verifyZKP(proof, vk);
            assert.isTrue(isVerified, "Proof should be valid");

            // Verifier retrieving the bitmap and verify credential exclusion
            let [currentBitmap, hashCount, count, capacity, currentEpoch] = await getBitmapData(subAccInstance);
            await checkInclusionBitmap(subAccInstance, currentBitmap, hashCount, credentialPrime).then((result) => {
                assert.isFalse(result, "the credential is not in bitmap, hence valid");
            });
        });
    });

    describe("Credential issuance and ZKP verification for incorrect Issuance Timestamp", function() {
        let proof, vk, credential, credentialHash, sig, epoch, credentialPrime;

        it("Issuer generates a ZKP for a credential", async function() {
            // Case: Issuance Date must be larger than Threshold Date
            const degreeThresholdTimestamp = "1262304000";  // Unix timestamp: Fri Jan 01 2010 00:00:00
            const degreeIssuanceTimestamp = "1000000000";   // Unix timestamp: Sun Sep 09 2001 01:46:40
            const result = await generateZKP(degreeIssuanceTimestamp, degreeThresholdTimestamp);
            proof = result.proof;
            vk = result.vk;

            assert.isNotNull(proof, "Proof should not be null");
            assert.isNotNull(vk, "Verification key should not be null");

            // Generate credential
            let [bitmap, hashCount, count, capacity, epoch] = await getBitmapData(subAccInstance);
            [credential, credentialHash, sig] = await generateCredential('some claim', holder, issuer, "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", epoch.toNumber());
            [credentialPrime, nonce] = hashToPrime(credentialHash, 128, 0n);
            storeEpochPrimes(credentialPrime);

            await credRegistryInstance.addCredential(credential.id, credential.issuer, credential.holder, credentialHash, sig, 100, credential.epoch);
            await credRegistryInstance.getCredential(credential.id).then((result) => {
                assert.equal(result[1], holder, "the credential holder is the same");
            });
        });

        it("User sends the ZKP and VK to the verifier", async function() {
            // Simulate user sending the proof and VK to the verifier
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
            assert.isNotNull(proof, "Proof should not be null when sent");
            assert.isNotNull(vk, "Verification key should not be null when sent");
        });

        it("Verifier verifies the ZKP and checks bitmap", async function() {
            const isVerified = await verifyZKP(proof, vk);
            assert.isTrue(isVerified, "Proof should be valid");

            // Verifier retrieving the bitmap and verify credential exclusion
            let [currentBitmap, hashCount, count, capacity, currentEpoch] = await getBitmapData(subAccInstance);
            await checkInclusionBitmap(subAccInstance, currentBitmap, hashCount, credentialPrime).then((result) => {
                assert.isFalse(result, "the credential is not in bitmap, hence valid");
            });
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

        it('Verifying valid credential exclusion during issuance epoch', async() => {
            var startTime = performance.now();
            let verification = await verify(credentialHash, epoch, subAccInstance, accInstance);
            var endTime = performance.now();
            // console.log(`Call to verification of invalid credential took ${endTime - startTime} milliseconds`)

            await verify(credentialHash, epoch, subAccInstance, accInstance).then((result) => {
                assert.isTrue(result, "the credential is valid");
            });
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
                await addToBitmap(subAccInstance, accInstance, credentialPrime, issuer_Pri);
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

    });
});
