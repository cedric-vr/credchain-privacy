var bigInt = require("big-integer");

const { web3, assert, artifacts } = require("hardhat");
const { generateCredential } = require("../utilities/credential.js"); 
const { gen, add, genMemWit, genNonMemWit, verMem, verNonMem, generatePrimes, hashToPrime } = require("../utilities/accumulator.js"); 
const { initBitmap, getBitmapData, getStaticAccData, checkInclusionBitmap } = require("../utilities/bitmap.js"); 

// const { storeEpochPrimes, endEpoch } = require("./epoch.js");
const { storeStaticAccData, readStaticAccProducts, updateProducts } = require("../utilities/product.js");

const { emptyProducts, emptyStaticAccData } = require("../utilities/product"); 
const { revoke, verify } = require("../revocation/revocation"); 

const { performance } = require('perf_hooks');

// using the following approach for testing: 
// https://hardhat.org/hardhat-runner/docs/other-guides/truffle-testing

const DID = artifacts.require("DID"); 
const Cred = artifacts.require("Credentials"); 
const Admin = artifacts.require("AdminAccounts"); 
const Issuer = artifacts.require("IssuerRegistry"); 
const SubAcc = artifacts.require("SubAccumulator"); 
const Acc = artifacts.require("Accumulator"); 


function update_product(x, data, products) {
	product_base = 1; 
	for (let i = 0; i < data.length - 1; i++) {
		product_base = bigInt(product_base).multiply(data[i]);
		products[i] = bigInt(products[i]).multiply(x); 
	}
	products.push(product_base); 
}


describe("Testing verification on-chain", function() {
	let accounts;
	let holder;
	let issuer; 

	let issuer_; 
	let issuer_Pri;

	let n; 
	let g; 

	// bitmap capacity 
	let capacity = 20; // up to uin256 max elements 

	// contract instances 
	let adminRegistryInstance; 
	let issuerRegistryInstance; 
	let didRegistryInstance; 
	let credRegistryInstance; 
	let subAccInstance; 
	let accInstance; 

    // user / holder of credential_a provides to verifier 
    // credential a is valid 
    let epoch_a;                    // when credential was issued 
    let credentialHash_a; 
    // credential b is not valid 
    let epoch_b;
    let credentialHash_b; 

    // for testing 
    let credentials = []            // imitage various users that hold credentials   

	// IPFS storage of products of credentials 
	let data = []
	let products = []

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

			// calculate how many hash function needed and update in contract
			await initBitmap(subAccInstance, capacity); 
			// clean up from previous tests 
			emptyProducts();
			emptyStaticAccData(); 
		});

		it('Deploying and generating global accumulator', async() => {
			[n, g] = gen(); 
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

    describe("Issuance", function() {
        it('Issuing large number of credentials', async() => {
            let [ currentBitmap, hashCount, count, capacity, currentEpoch ] = await getBitmapData(subAccInstance);
			let inclusionSet = [ 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 
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

			// using only dynamic accumulator: n, g 
			// for each credential to revoke, compute witness, emit witness and product of other credentials to update 
			// data -> array of revoked primes 
			// product -> array of products for revoked primes  

            let [revokedCredential, revokedPrime] = credentials[5]; 
			// updated acc with revoked credential 
			let acc0 = add(g, n, revokedPrime); 
			// store new revoked prime 
			data.push(revokedPrime); 
			// update produces with new prime 
			update_product(revokedPrime, data, products); 

			var startTime = performance.now();
			let accHex = "0x" + bigInt(acc0).toString(16); 
			// update latest acc in contract 
			await accInstance.update(accHex); 
			var endTime = performance.now();
			console.log(`Call to update on-chain acc took ${endTime - startTime} milliseconds`)


			let [revokedCredential_a, revokedPrime_a] = credentials[6]; 
			// updated acc with revoked credential 
			let acc1 = add(acc0, n, revokedPrime_a); 
			// store new revoked prime 
			data.push(revokedPrime_a); 
			// update produces with new prime 
			update_product(revokedPrime_a, data, products); 

			var startTime = performance.now();
			accHex = "0x" + bigInt(acc1).toString(16); 
			// update latest acc in contract 
			await accInstance.update(accHex); 
			var endTime = performance.now();
			console.log(`Call to update on-chain acc took ${endTime - startTime} milliseconds`)


			let [revokedCredential_b, revokedPrime_b] = credentials[7]; 
			// updated acc with revoked credential 
			let acc2 = add(acc1, n, revokedPrime_b); 
			// store new revoked prime 
			data.push(revokedPrime_b); 
			// update produces with new prime 
			update_product(revokedPrime_b, data, products); 

			var startTime = performance.now();
			accHex = "0x" + bigInt(acc2).toString(16); 
			// update latest acc in contract 
			await accInstance.update(accHex); 
			var endTime = performance.now();
			console.log(`Call to update on-chain acc took ${endTime - startTime} milliseconds`)

			// console.log("last acc:", acc2); 

			var startTime = performance.now();
			// assume user computes this locally 
			// witness for cred a 
			let w_a = bigInt(g).modPow(products[1], n); 
			// proof that credential was revoked 
			let proof_a = (bigInt(w_a).modPow(revokedPrime_a, n)).equals(acc2);
			// console.log(proof_a); 
			var endTime = performance.now();
			console.log(`Call to calculate witness took ${endTime - startTime} milliseconds`)
			
			// now revoked new credential 
			let [revokedCredential_c, revokedPrime_c] = credentials[8]; 
			// updated acc with revoked credential 
			let acc3 = add(acc2, n, revokedPrime_c); 
			// store new revoked prime 
			data.push(revokedPrime_c); 
			// update produces with new prime 
			update_product(revokedPrime_c, data, products); 


			var startTime = performance.now();
			accHex = "0x" + bigInt(acc3).toString(16); 
			// update latest acc in contract 
			await accInstance.update(accHex); 
			var endTime = performance.now();
			console.log(`Call to update on-chain acc took ${endTime - startTime} milliseconds`)


			// now this is not working for cred a 
			proof_a = (bigInt(w_a).modPow(revokedPrime_a, n)).equals(acc3);
			console.log(proof_a);
			

			var startTime = performance.now();
			// a updated witness 
			w_a = bigInt(g).modPow(products[1], n); 
			console.log(w_a); 
			var endTime = performance.now();
			console.log(`Call to update witness took ${endTime - startTime} milliseconds`)

			var startTime = performance.now();
			proof_a = (bigInt(w_a).modPow(revokedPrime_a, n)).equals(acc3);
			console.log(proof_a); 
			var endTime = performance.now();
			console.log(`Call to verification of witness took ${endTime - startTime} milliseconds`)


			// take part of list for revokation 
            // let credentialsToRevoke = credentials.slice(0, 40); 

            // for (let [cred, prime] of credentialsToRevoke) {
            //     await revoke(cred, subAccInstance, accInstance); 
            // }

			let acc_prev = g; 
			let acc_new; 
			
			for (let i = 0; i < 40; i++) {
				// now revoked new credential 
				let [revokedCredential, revokedPrime] = credentials[i]; 
				// updated acc with revoked credential 
				acc_new = add(acc_prev, n, revokedPrime_c); 
				acc_prev = acc_new; 
				// store new revoked prime 
				data.push(revokedPrime); 
				// update produces with new prime 
				update_product(revokedPrime, data, products); 
			}

			// 40 cred -> 100 ms to revoke 


        });
    });
});