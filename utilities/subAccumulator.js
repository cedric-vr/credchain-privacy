
const { gen, add, hashToPrime } = require("../utilities/accumulator.js"); 

async function initBitmap(instance, capacity) {
    // get the hash count based on capacity 
    let hashCount = await instance.getHashCount(capacity);
    // update the info in contract 
    await instance.updateHashCount(hashCount, capacity); 
}

async function addToBitmap(accInstance, subAccInstance, credentialHash, issuer) {
    let fetch = await subAccInstance.getFilter(); 
    let bitmap = fetch[0]; 
    let hashCount = fetch[1]; 
    let count = fetch[2].words[0]; 
    let capacity = fetch[3].words[0]; 

    // console.log(count); 
    // console.log(capacity); 

    if (count + 1 == capacity) {
        // the capacity has been reached
        // issuer does this
        // calculate the id for bitmap = h(bitmap + group key) 
        //      group key between all issuers, key manager is admin account 
        
        // 

        let res = await accInstance.add.call(bitmap); 

        console.log("latest accumulator value:", res[0].toString()); 
        console.log("bitmap:", res[1].toString()); 

        // reset bitmap 
        bitmap = 0; 
    }
    
    // // check if the capacity is reached before adding cred 
    // if (bitmap.words[0] == 0) {
    //     // if there is no bitmap, then new 
    //     bitmap = await instance.addToBitmap(0, hashCount, credentialHash);
    // }
    // else if (count.words[0] + 1 == capacity.words[0]) {
    //     // console.log("capacity reached"); 
    //     // wrap the existing bit map and create new 
    // }
    // else {
    //     console.log(capacity, count); 
    // }

    // console.log(credentialHash); 
    // console.log("hash count", hashCount.toString());
    // console.log("capacity", capacity.toString()); 
    // console.log("count", count.toString()); 
    
    bitmap = await subAccInstance.addToBitmap(bitmap, hashCount, credentialHash, { from: issuer });
    await subAccInstance.updateBitmap(bitmap); 

    // fetch = await subAccInstance.getFilter();
    // console.log("updated bitmap", fetch[0].toString()); 
    // console.log("updated bitmap in binary", fetch[0].toString(2));  
    // console.log("")
}

async function packBitmap(instance, accumulator) {
    let bitmap = await getBitmapData(instance);

    // console.log(bitmap[0].words); 
    // console.log(bitmap[2].words[0], bitmap[3].words[0]); 

    // for (let i = 0; i < bitmap[0].words.length - 1; i++) {
    //     console.log(bitmap[0].words[i]); 
    // }

    let bitmapHash = web3.utils.sha3(bitmap[0]);

    // generate a prime for the bitmap hash 
    let [ bitmapPrime, nonce ] = hashToPrime(BigInt(bitmapHash), 256, 0n); 

    // console.log(bitmapPrime); 
}

async function getBitmapData(instance) {
    let fetch = await instance.getFilter(); 
    return [ fetch[0], fetch[1], fetch[2], fetch[3] ]; 
}

async function checkInclusion(instance, credentialHash) {
    // fetch the current bitmap first and then check if contains 
    let fetch = await instance.getFilter(); 
    let inclusion = await instance.falsePositive(fetch[0], fetch[1], credentialHash); 
    return inclusion; 
}

module.exports = { initBitmap, addToBitmap, getBitmapData, checkInclusion, packBitmap }