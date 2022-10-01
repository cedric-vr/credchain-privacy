
const { gen, add, hashToPrime } = require("../utilities/accumulator.js"); 

// for testing, keep the array of primes for each epoch here 
// otherwise, we can use decentralisede storage to store it 
let epochPrimes = []; 

async function initBitmap(instance, capacity) {
    // get the hash count based on capacity 
    let hashCount = await instance.getHashCount(capacity);
    // update the info in contract 
    await instance.updateHashCount(hashCount, capacity); 
}

async function addToBitmap(instance, credentialHash, credentialPrime, issuer) {
    
    let [ bitmap, hashCount, count, capacity ] = await getBitmapData(instance); 

    console.log("original:", credentialPrime); 
    
    let credentialPrimeHex = "0x" + credentialPrime.toString(16); 
    console.log("prime hex:", credentialPrimeHex);

    let primeHexToInt = BigInt(credentialPrimeHex); 
    console.log("convert: ", primeHexToInt); 

    if (count.toString() + 1 == capacity.toString()) {
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

async function packBitmap(instance, accumulator) {

    let [ bitmap, hashCount, count, capacity ] = await getBitmapData(instance); 

    // console.log(bitmap[0].words); 
    // console.log(bitmap[2].words[0], bitmap[3].words[0]); 

    // for (let i = 0; i < bitmap[0].words.length - 1; i++) {
    //     console.log(bitmap[0].words[i]); 
    // }

    let bitmapHash = web3.utils.sha3(bitmap);

    // generate a prime for the bitmap hash 
    let [ bitmapPrime, nonce ] = hashToPrime(BigInt(bitmapHash), 256, 0n); 

    // console.log(bitmapPrime); 
}

async function getBitmapData(instance) {
    let data = await instance.getFilter(); 
    return [ data[0], data[1], data[2], data[3] ]; 
}

async function checkInclusion(instance, credentialHash) {
    // fetch the current bitmap first and then check if contains 
    let [ bitmap, hashCount, count, capacity ] = await getBitmapData(instance); 
    let inclusion = await instance.falsePositive(bitmap, hashCount, credentialHash); 
    return inclusion; 
}

module.exports = { initBitmap, addToBitmap, getBitmapData, checkInclusion, packBitmap }