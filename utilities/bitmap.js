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

async function addToBitmap(instance, credentialHash, credentialPrime, issuer) {
    
    let [ bitmap, hashCount, count, capacity ] = await getBitmapData(instance); 

    // add prime to the array, ideally this would be the distributed storage 
    // storeEpochPrime(credentialPrime); 

    // converts prime number to hex string 
    let credentialPrimeHex = "0x" + credentialPrime.toString(16); 
    // converts hex string back to original prime 
    let primeHexToInt = BigInt(credentialPrimeHex); 

    // capacity reached, current data is packed and new epoch starts
    if (count.toNumber() + 10 == capacity.toNumber()) {
        // packs current epoch primes into accumulator 
        let acc = await endEpoch(); 

        // console.log(acc); 


        // id = hash(acc + bitmap)
        // let bitmapHash = web3.utils.sha3(bitmap);

        // the capacity has been reached
        // issuer does this
        // calculate the id for bitmap = h(bitmap + group key) 
        //      group key between all issuers, key manager is admin account 
        
        // 

        // let res = await accInstance.add.call(bitmap); 
        // acc = ethers.BigNumber.from(res[0].toString()).toBigInt(); 
        // console.log(acc); 

        // reset bitmap 
        bitmap = 0; 
    }
    
    // console.log("before:    ", bitmap.toString(2).slice(0, 20));
    // console.log("credential hash:", credentialHash); 
    // console.log("credential prime:", credentialPrime);
    // console.log(credentialPrime.toString(16)); 
    // console.log(typeof credentialPrime.toString(16)); 
    

    // let bytes = web3.utils.hexToBytes("0x" + credentialPrime.toString(16)); 

    // let bytes = ethers.utils.formatBytes32String(credentialPrime.toString(16));
    // console.log("bytes:", bytes); 

    // console.log("bitmap:", bitmap), 
    // console.log("hash count:", hashCount); 

    bitmap = await instance.addToBitmap(bitmap, hashCount, credentialPrimeHex, { from: issuer });

    // bitmap = await instance.addToBitmap(bitmap, hashCount, credentialHash, { from: issuer });
    await instance.updateBitmap(bitmap); 

    // console.log("after:     ", bitmap.toString(2).slice(0, 20));
    // console.log("")
    // let bitArray = bitmap.toString(2).slice(0, 20); 
    // for (let bit = 0; bit < bitArray.length; bit++) {
    //     console.log(bit, ":", bitArray[bit]); 
    // }
}

async function getBitmapData(instance) {
    // returns bitmap, hashCount, count, capacity
    let data = await instance.getFilter(); 
    return [ data[0], data[1], data[2], data[3] ]; 
}

async function checkInclusion(instance, credentialHash) {
    // fetch the current bitmap first and then check if contains 
    let [ bitmap, hashCount, count, capacity ] = await getBitmapData(instance); 
    let inclusion = await instance.falsePositive(bitmap, hashCount, credentialHash); 
    return inclusion; 
}

module.exports = { initBitmap, addToBitmap, getBitmapData, checkInclusion }