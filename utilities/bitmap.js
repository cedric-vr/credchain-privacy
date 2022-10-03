var bigInt = require("big-integer");

const { ethers } = require("hardhat");
const { gen, add, genMemWit, genNonMemWit, ver, hashToPrime } = require("./accumulator.js"); 
const { getEpochPrimes, storeEpochPrime, endEpoch } = require("./epoch.js");


async function initBitmap(instance, capacity) {
    // get the hash count based on capacity 
    let hashCount = await instance.getHashCount(capacity);
    // update the info in contract 
    await instance.updateHashCount(hashCount, capacity); 
}

async function addToBitmap(instance, element, issuer) {
    
    let [ bitmap, hashCount, count, capacity, epoch ] = await getBitmapData(instance); 

    // add prime to the array, ideally this would be the distributed storage 
    storeEpochPrime(element); 

    // converts prime number to hex string 
    let elementHex = "0x" + element.toString(16); 
    // converts hex string back to original prime 
    // let primeHexToInt = BigInt(credentialPrimeHex); 

    // capacity reached, current data is packed and new epoch starts
    if (count.toNumber() + 10 == capacity.toNumber()) {
        // packs current epoch primes into static accumulator 
        let acc = await endEpoch(); 

        // let res = await accInstance.add.call(bitmap); 
        // acc = ethers.BigNumber.from(res[0].toString()).toBigInt(); 
        // console.log(acc); 

        // reset bitmap 
        bitmap = 0; 
        // update epoch in the smart contract 
        await instance.updateEpoch(); 
    }
    
    // what if more than 1 issuers call the addToBitmap function? 
    // TODO: lock function for reading and updating bitmap 

    bitmap = await instance.addToBitmap(bitmap, hashCount, elementHex, { from: issuer });
    await instance.updateBitmap(bitmap); 
}

async function getBitmapData(instance) {
    // returns bitmap, hashCount, count, capacity, epoch
    let data = await instance.getFilter(); 
    return [ data[0], data[1], data[2], data[3], data[4] ]; 
}

async function checkInclusion(instance, bitmap, hashCount, element) {
    // fetch the current bitmap first and then check if contains 
    // let [ bitmap, hashCount, count, capacity, epoch ] = await getBitmapData(instance); 
    let elementHex = "0x" + element.toString(16);
    let inclusion = await instance.falsePositive(bitmap, hashCount, elementHex); 
    return inclusion; 
}

module.exports = { initBitmap, addToBitmap, getBitmapData, checkInclusion }