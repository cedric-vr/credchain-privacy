// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const { ethers } = require("hardhat");
const { gen } = require("../utilities/accumulator.js"); 
const { initBitmap } = require("../utilities/bitmap.js"); 

var bigInt = require("big-integer");

require("@nomiclabs/hardhat-web3");

async function main() {
	let capacity = 50;
	let [n, acc] = gen(); 
	// when adding bytes to contract, need to concat with "0x"
	let nHex = "0x" + bigInt(n).toString(16); // convert back to bigInt with bigInt(nHex.slice(2), 16)
	let accHex = "0x" + bigInt(acc).toString(16); 

	// DID Registry contract to deploy 
	const IdentityRegistry = await ethers.getContractFactory('DID'); 
	const identityReg = await IdentityRegistry.deploy(); 
	await identityReg.deployed(); 
	console.log("DID Registry has been deployed to:", identityReg.address); 

	// Credential registry contract to deploy 
	const CredentialRegistry = await ethers.getContractFactory('Credentials');
	const credentialReg = await CredentialRegistry.deploy(); 
	await credentialReg.deployed();
	console.log("Credentials Registry has been deployed to:", credentialReg.address); 

	// admin account registry 
	const AdminRegistry = await ethers.getContractFactory('AdminAccounts');
	const adminReg = await AdminRegistry.deploy(); 
	await adminReg.deployed(); 
	console.log("Admins Registry has been deployed to:", adminReg.address); 

	// issuer registry 
	const IssuerRegistry = await ethers.getContractFactory('Issuers'); 
	const issuerReg = await IssuerRegistry.deploy(adminReg.address); 
	await issuerReg.deployed(); 
	console.log("Issuers Registry has been deployed to:", issuerReg.address); 

	// // sub-accumulator 
	const SubAccumulator = await ethers.getContractFactory('SubAccumulator'); 
	const subAcc = await SubAccumulator.deploy(issuerReg.address);
	await subAcc.deployed(); 
	console.log("Sub-Accumulator has been deployed to:", subAcc.address); 

	// calculate how many hash function needed and update in contract
	await initBitmap(subAcc, capacity); 

	const Accumulator = await ethers.getContractFactory('Accumulator'); 
	const globAcc = await Accumulator.deploy(issuerReg.address, subAcc.address, accHex, nHex); 
	await globAcc.deployed();
	console.log("Global accumulator has been deployed to:", globAcc.address); 
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
