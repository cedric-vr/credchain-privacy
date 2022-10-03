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

async function addToBitmap(bitmapInstance, accInstance, element, issuer) {
    
    let [ bitmap, hashCount, count, capacity, epoch ] = await getBitmapData(bitmapInstance); 

    // add prime to the array, ideally this would be the distributed storage 
    storeEpochPrime(element); 

    // converts prime number to hex string 
    let elementHex = "0x" + element.toString(16); 
    // converts hex string back to original prime 
    // let primeHexToInt = BigInt(credentialPrimeHex); 

    // capacity reached, current data is packed and new epoch starts
    if (count.toNumber() + 10 == capacity.toNumber()) {

        console.log("adding to global..."); 
        // packs current epoch primes into static accumulator x 
        let acc = await endEpoch(); 

        await addToGlobal(bitmapInstance, accInstance, acc, bitmap); 

        // reset bitmap 
        bitmap = 0; 
        // update epoch in the smart contract 
        // await bitmapInstance.updateEpoch(); 
    }
    
    // what if more than 1 issuers call the addToBitmap function? 
    // TODO: lock function for updating bitmap 

    bitmap = await bitmapInstance.addToBitmap(bitmap, hashCount, elementHex, { from: issuer });
    await bitmapInstance.updateBitmap(bitmap); 
}

async function addToGlobal(bitmapInstance, accInstance, x, bitmap) {
    let data = await accInstance.getAccumulator(); 
    
    // convert to prime numbers 
    let acc0 = bigInt(data[0].slice(2), 16); 
    let n = bigInt(data[1].slice(2), 16); 

    // add new element to the current accumulator 
    let acc1 = add(acc0, n, x); 
    let acc1Hex = "0x" + bigInt(acc1).toString(16); 

    // update values in SC 
    await accInstance.update(bitmap, acc1Hex); 

    // let res = await accInstance.getBitmap(1); 

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