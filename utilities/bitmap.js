var bigInt = require("big-integer");

const { ethers } = require("hardhat");
const { gen, add, genMemWit, genNonMemWit, ver, hashToPrime } = require("./accumulator.js"); 
const { getEpochPrimes, storeEpochPrime, endEpoch } = require("./epoch.js");

let staticAccData = [];
let products = []; 

// assume this is to access distributes storage, e.g., IPFS 
function storeStaticAccData(epoch, acc, product) {
    // staticAccData[epoch] = [bitmap, acc, accHex, product];
    // staticAccData.push( [epoch, bitmap, acc, accHex, product] ); 
    staticAccData.push( 
        {
            "epoch": epoch,
            "acc": acc,
            "product": product
        } 
    )
}

// assume this is to access distributed storage 
function readStaticAccData() {
    return staticAccData; 
}

// assume this is to access distributed storage 
function readStaticAccProducts() {
    return products; 
}

function updateProducts(new_x) {
    // product of other accumulators 
    let product = 1;
    // when adding new element to global accumulator, need to compute 
    // product of previous accumulators and store 
    let data = readStaticAccData(); 

    for (let i = 0; i < data.length - 1; i++) {
        product = bigInt(product).multiply(staticAccData[i].acc);
        products[i] = bigInt(products[i]).multiply(new_x); 
    }
    products.push(product); 
}

async function initBitmap(instance, capacity) {
    // get the hash count based on capacity 
    let hashCount = await instance.getHashCount(capacity);
    // update the info in contract 
    await instance.updateHashCount(hashCount, capacity); 
}

async function addToBitmap(bitmapInstance, accInstance, element, issuer) {
    
    let [ bitmap, hashCount, count, capacity, epoch ] = await getBitmapData(bitmapInstance); 
    // add prime to the array, ideally this would be the distributed storage 
    storeEpochPrime(element); // credential 
    // converts prime number to hex string 
    let elementHex = "0x" + element.toString(16); 

    // capacity reached, current data is packed and new epoch starts
    if (count.toNumber() + 10 == capacity.toNumber()) {
        // packs current epoch primes into static accumulator x 
        let staticAcc = await endEpoch(); // acc is prime 

        // updated global accumulator and static acc hex 
        let [ globalAccHex, staticAccHex ] = await addToGlobal(bitmapInstance, accInstance, staticAcc, bitmap); 
        
        // store the data first 
        storeStaticAccData(epoch.toNumber(), staticAcc.toString(), 1); 

        // then update products data for each element 
        updateProducts(staticAcc);

        // update data inside the contract 
        await accInstance.update(bitmap, staticAccHex, globalAccHex); 

        // reset bitmap 
        bitmap = 0; 
        // update epoch in the smart contract 
        await bitmapInstance.updateEpoch(); 
    }
    
    // what if more than 1 issuers call the addToBitmap function? 
    // TODO: lock function for updating bitmap 

    bitmap = await bitmapInstance.addToBitmap(bitmap, hashCount, elementHex, { from: issuer });
    await bitmapInstance.updateBitmap(bitmap); 
}

async function addToGlobal(bitmapInstance, accInstance, x, bitmap) {
    // let data = await accInstance.getAccumulator(); 
    let [ currentAcc, n, g ] = await getGlobalAccData(accInstance);

    // add new element to the current accumulator 
    let accNew = add(currentAcc, n, x); // x is static accumulator 
    let accNewHex = "0x" + bigInt(accNew).toString(16); 
    let xHex = "0x" + bigInt(x).toString(16);

    return [ accNewHex, xHex ]; 
}

// check inclusion of x in global acc 
async function checkInclusionGlobal(bitmapInstance, accInstance, x, epoch) {
    let [ currentAcc, n, g ] = await getGlobalAccData(accInstance);

    // get the data from storage 
    let data = readStaticAccData(); 
    let products = readStaticAccProducts(); 
    let x_product = products[epoch - 1]; ; 

    if (epoch - 1 < products.length) {
        // raise error 
    }

    // witness for acc x 
    let w = bigInt(g).modPow(x_product, n); 

    // verify witness 
    return (bigInt(w).modPow(x, n)).equals(currentAcc); 
}

async function getStaticAccData(accInstance, id) {
    let data = await accInstance.getStaticAcc(id);
    let bitmap = data[0]; 
    let acc = bigInt(data[1].slice(2), 16); 
    return [ bitmap, acc ]; 
}

async function getGlobalAccData(accInstance) {
    let data = await accInstance.getGlobalAcc(); 
    // convert to prime numbers 
    let acc = bigInt(data[0].slice(2), 16); 
    let n = bigInt(data[1].slice(2), 16); 
    let g = bigInt(data[2].slice(2), 16); 
    return [ acc, n, g ]
}

async function getBitmapData(instance) {
    // returns bitmap, hashCount, count, capacity, epoch
    let data = await instance.getFilter(); 
    return [ data[0], data[1], data[2], data[3], data[4] ]; 
}

async function checkInclusionBitmap(instance, bitmap, hashCount, element) {
    // fetch the current bitmap first and then check if contains 
    // let [ bitmap, hashCount, count, capacity, epoch ] = await getBitmapData(instance); 
    let elementHex = "0x" + element.toString(16);
    let inclusion = await instance.falsePositive(bitmap, hashCount, elementHex); 
    return inclusion; 
}

module.exports = { 
    initBitmap, 
    addToBitmap, 
    getBitmapData, 
    getStaticAccData,
    checkInclusionBitmap, 
    checkInclusionGlobal 
}