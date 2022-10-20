var bigInt = require("big-integer");

// const { ethers } = require("hardhat");
const { add } = require("./accumulator.js"); 
const { storeEpochPrimes, endEpoch } = require("./epoch.js");
const { storeStaticAccData, readStaticAccProducts, updateProducts } = require("./product.js");

const { storeWitness, readWitness, updateWitness } = require("./witness"); 

async function initBitmap(instance, capacity) {
    // get the hash count based on capacity 
    let hashCount = await instance.getHashCount(capacity);
    // update the info in contract 
    await instance.updateHashCount(hashCount, capacity); 
}

async function addToBitmap(bitmapInstance, accInstance, element) {
    let [ bitmap, hashCount, count, capacity, epoch ] = await getBitmapData(bitmapInstance); 
    // add prime to the array, ideally this would be the distributed storage 
    storeEpochPrimes(element); // credential 
    // converts prime number to hex string 
    let elementHex = "0x" + element.toString(16); 

    // console.log("count:", count.toNumber());
    // console.log("capacity", capacity.toNumber()); 
    // console.log("epoch", epoch.toNumber(), "; element", element); 

    // capacity reached, current data is packed and new epoch starts
    if (count.toNumber() + 10 == capacity.toNumber()) {
        // console.log("created new bitmap...")
        // packs current epoch primes into static accumulator x 
        let staticAcc = endEpoch(); // acc is prime 
        // updated global accumulator and static acc hex 
        let [ globalAccHex, staticAccHex ] = await addToGlobal(accInstance, staticAcc); 
        // store the data first 
        storeStaticAccData(epoch.toNumber(), staticAcc.toString(), 1); 
        // then update products data for each element 
        updateProducts(staticAcc);

        // get n, g values 
        let [ currentAcc, n, g ] = await getGlobalAccData(accInstance);
        // get the current product for the x 
        let products = readStaticAccProducts(); 
        let x_product = products[epoch - 1]; 
        // calculate w 
        let w = bigInt(g).modPow(x_product, n); 
        // store new witness 
        storeWitness(w); 
        // update witnesses 
        updateWitness(n, g); 

        // update data inside the contract 
        await accInstance.update(bitmap, staticAccHex, globalAccHex); 
        // reset bitmap 
        bitmap = 0; 
        // update epoch in the smart contract 
        await bitmapInstance.updateEpoch(); 
    }
    
    // what if more than 1 issuers call the addToBitmap function? 
    // TODO: lock function for updating bitmap 
    bitmap = await bitmapInstance.addToBitmap(bitmap, hashCount, elementHex);
    await bitmapInstance.updateBitmap(bitmap); 
}

async function getBitmapData(instance) {
    // returns bitmap, hashCount, count, capacity, epoch
    let data = await instance.getFilter(); 
    return [ data[0], data[1], data[2], data[3], data[4] ]; 
}

async function checkInclusionBitmap(instance, bitmap, hashCount, element) {
    // fetch the current bitmap first and then check if contains 
    let elementHex = "0x" + element.toString(16);
    let inclusion = await instance.falsePositive(bitmap, hashCount, elementHex); 
    return inclusion; 
}

async function addToGlobal(accInstance, x) {
    // let data = await accInstance.getAccumulator(); 
    let [ currentAcc, n, g ] = await getGlobalAccData(accInstance);
    // add new element to the current accumulator 
    let accNew = add(currentAcc, n, x); // x is static accumulator 
    let accNewHex = "0x" + bigInt(accNew).toString(16); 
    let xHex = "0x" + bigInt(x).toString(16);
    return [ accNewHex, xHex ]; 
}

// check inclusion of x in global acc 
// async function checkInclusionGlobal(accInstance, x, epoch) {
//     let [ currentAcc, n, g ] = await getGlobalAccData(accInstance);
//     // this part can be replaced by quering storage for witness of x
//     // and avoid the computation of the witness 
//     let products = readStaticAccProducts(); 
//     let x_product = products[epoch - 1]; 
//     // witness for acc x 
//     let w = bigInt(g).modPow(x_product, n); 
//     // verify witness, true if w == current acc
//     return (bigInt(w).modPow(x, n)).equals(currentAcc); 
// }

async function checkInclusionGlobal(accInstance, x, epoch) {
    let [ currentAcc, n, g ] = await getGlobalAccData(accInstance);
    let data = readWitness(); 
    let w = data[epoch - 1]; 
    return (bigInt(w).modPow(x, n)).equals(currentAcc); 
}

async function getGlobalAccData(accInstance) {
    let data = await accInstance.getGlobalAcc(); 
    // convert to prime numbers 
    let acc = bigInt(data[0].slice(2), 16); 
    let n = bigInt(data[1].slice(2), 16); 
    let g = bigInt(data[2].slice(2), 16); 
    return [ acc, n, g ]
}

async function getStaticAccData(accInstance, id) {
    let data = await accInstance.getStaticAcc(id);
    let bitmap = data[0]; 
    let acc = bigInt(data[1].slice(2), 16); 
    return [ bitmap, acc ]; 
}


module.exports = { initBitmap, addToBitmap, getBitmapData, getStaticAccData, getGlobalAccData, checkInclusionBitmap, checkInclusionGlobal }