var bigInt = require("big-integer");

const { web3, assert, artifacts, ethers } = require("hardhat");
const { generateCredential } = require("../utilities/credential.js"); 
const { gen, add, hashToPrime } = require("../utilities/accumulator.js"); 
const { initBitmap, addToBitmap, getBitmapData, checkInclusion, packBitmap, displayArray } = require("../utilities/subAccumulator.js"); 

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
	let n; 
	let acc; 
	let nHex;
	let accHex;
	let hashCount; 
	let bitmap; 
	let count; 
	let capacity = 20; 

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

		n = ethers.BigNumber.from("47643528160891675565126238547163111887484326886055461416775020064289531390604564705648563220827741441560905225590804091264357726140010074764429939594692182602235322413599096016182557617562288701004156654709452086576034870336750119695378089965791470985478710785584849145500150725644610695795125276924863689844490798629599870574966646813654060926330005592211440615022872009220682541631879141125958326535287959828944991795484308179430662029514851051991144010839809825876366320420647768580310468491284575397858605962168068225300630426537785377598473023539626567846166766986870774130243291659609017875777145878601303912717");
		nHex = n.toHexString();
		acc = ethers.BigNumber.from("17621266142382773614174615728319434627798107601747459646923814612135306245239728690235558002873486695714654363593317636509697669735992222587382420031191701735716188803558390063319837464175593673626492342085018391742136535089257681463192646155736401392584374451461767247472372907736539198332120662694079838142023338060903355511387646740263822910524133939154298424025389806555329961771450633023197173425632660853135910539771780537991916594062284735066180890207436461519486678562728387426850939558582439018870640771157770670431250181084395223118074668046630229539607588897912554661801318180267638637813554796080464807716");
		accHex = acc.toHexString();
	});

	describe("Deployment", function() {
		it('Deploying the Admin registry contract', async() => {
			adminRegistryInstance = await Admin.new(); 
			await web3.eth.getBalance(adminRegistryInstance.address).then((balance) => {
				assert.equal(balance, 0, "check balance of the contract"); 
			});
		});

		it('Deploying the Issuers Registry contract', async() => {
			issuerRegistryInstance = await Cred.new(adminRegistryInstance.address); 
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

		it('Deploying and generating sub-accumulator', async() => {
			subAccInstance = await SubAcc.new(); 
			await web3.eth.getBalance(subAccInstance.address).then((balance) => {
				assert.equal(balance, 0, "check balance of the contract"); 
			});
		});

		it('Deploying and generating global accumulator', async() => {
			accInstance = await Acc.new(issuerRegistryInstance.address, accHex, nHex); 
			await web3.eth.getBalance(accInstance.address).then((balance) => {
				assert.equal(balance, 0, "check balance of the contract"); 
			});
		});

		it('Generating accumulators', async() => {
			// first know how many hash function needed for # of elements 
			// then update that number in the contract 
			await initBitmap(subAccInstance, capacity); 

			// fetch the filter data from the contract 
			let result = await getBitmapData(subAccInstance); 
			assert.equal(capacity, result[3].words[0], "checing the capacity stored"); 

			// hashCount = await subAccInstance.getHashCount(capacity); 

			// generate off-chain 
			// load the accumulator value to contract 
			[n, acc] = gen(); 

			// let x = bigInt.randBetween(2, 256); 
			// let [h, nonce] = hashToPrime(x, 256, 0); 
			
			// console.log(h); 
			// console.log(nonce); 

			// let x = BigInt(credentialHash); // convert credential hash to big int 
			// let x = BigInt('0x' + 'e0f05da93a0f5a86a3be5fc0e301606513c9f7e59dac2357348aa0f2f47db984'); 
			// convert the credential to a prime 
			// let [credentialPrime, nonce] = hashToPrime(x, 128, 0n); 
			// console.log("resulting prime hash:", credentialPrime); 

			// store the prime in the SC? 
			
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

				await addToBitmap(subAccInstance, x[1], credentialPrime, accounts[9]); 
				await packBitmap(subAccInstance, acc); 
			}

			// displayArray(); 

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
