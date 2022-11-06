var bigInt = require("big-integer");
const { web3 } = require("hardhat");

const { add } = require("./accumulator.js"); 
const { endEpoch, updateEpochProduct, getEpochProduct } = require("./epoch.js");
const { readWitness } = require("./witness"); 

async function initBitmap(instance, capacity) {
    // get the hash count based on capacity 
    let hashCount = await instance.getHashCount(capacity);
    // update the info in contract 
    await instance.updateHashCount(hashCount, capacity); 
}

async function addToBitmap(bitmapInstance, accInstance, element, issuer) {
    let [ bitmap, hashCount, count, capacity, epoch ] = await getBitmapData(bitmapInstance); 
    // no need to record every revoked credential, only their final prime 
    updateEpochProduct(element); 

    // converts prime number to hex string 
    let elementHex = "0x" + element.toString(16); 

    // capacity reached, current data is packed and new epoch starts
    if (count.toNumber() + 10 == capacity.toNumber()) {
        // get current product number
        let epochProduct = getEpochProduct(); 
        // packs current epoch primes into static accumulator x 
        let staticAcc = endEpoch(epochProduct); // acc is prime 
        // updated global accumulator and static acc hex 
        let [ newAcc, newAccHex, staticAccHex, currentAccHex ] = await addToGlobal(accInstance, staticAcc); 
        // all the data for accumulator update
        let data = bitmap.toString() + ";" + staticAcc.toString() + ";" + newAccHex.toString();
        // sign values for update
        let sign = web3.eth.accounts.sign(data, issuer); 

        // transaction hash 
        let receipt; 
        // update data inside the contract 
        await accInstance.update(bitmap, staticAccHex, newAccHex, sign.messageHash, sign.signature).then((result) => {
            receipt = result.receipt.transactionHash;
            
        });
        // issuer to sign tx receipt 
        sign = web3.eth.accounts.sign(receipt, issuer);
        // store tx in the contract 
        await accInstance.updateTx(epoch, receipt, sign.messageHash, sign.signature); 
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

async function verifyBitmap(accInstance, epoch) {
    // verification result to return 
    let res; 

    let n = await accInstance.getModulus(); 
    n = bigInt(n.slice(2), 16); 

    // verify bitmap signature for this epoch_j
    // if true, the bitmap was added by the authoritsed issuer 
    await accInstance.verifyBitmapSignature(epoch).then((result) => {
        if (result === false) { return false; }
    });
    // verify txhash signature for the epoch_j
    await accInstance.verifyTransactionSignature(epoch).then((result) => {
        if (result === false) { return false; }
    });

    // for epoch_j, get the staticAcc_j 
    let staticAccHex = await accInstance.getStaticAcc(epoch);
    // for epoch_j, get the globalAcc_j
    let globalAccHex = await accInstance.getCurrGlobalAcc(epoch);
    let globalAcc = bigInt(globalAccHex.slice(2), 16); 

    let nextStaticAccHex = await accInstance.getNextStaticAcc(epoch);
    // there is a future epoch 
    if (nextStaticAccHex != null) {
        let nextStaticAcc = bigInt(nextStaticAccHex.slice(2), 16); 
        let nextGlobalAcc = bigInt(globalAcc).modPow(nextStaticAcc, n);
        let nextGlobalAccHex = "0x" + nextGlobalAcc.toString(16); 

        // get the txHash for acc_x  
        let txHash = await accInstance.getTx(nextGlobalAccHex);
        // retrieve transaction from the blockchain for acc_x
        let tx = await web3.eth.getTransactionReceipt(txHash);
        let pastHash = tx.logs[0].data;

        // calculate and verify hash on-chain 
        await accInstance.verifyHash(globalAccHex, nextGlobalAccHex, pastHash).then((result) => {
            if (result === true) { res = true; }
            else { res = false; }
        });
    }
    // there is no future epoch 
    else {
        let data = await accInstance.getGlobalAcc(); 
        let currentAcc = data[0]; 
        if (currentAcc === globalAccHex) { res = true }
        else { res = false }
    }

    return res; 
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
    let accNew = add(currentAcc, n, x); // x is static accumulator 
    let accNewHex = "0x" + bigInt(accNew).toString(16); 
    let xHex = "0x" + bigInt(x).toString(16);
    let currentAccHex = "0x" + bigInt(currentAcc).toString(16); 
    return [ accNew, accNewHex, xHex, currentAccHex ]; 
}

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
    return [ acc, n, g ]; 
}

async function getStaticAccData(accInstance, id) {
    let data = await accInstance.getStaticAcc(id);
    let bitmap = data[0]; 
    let acc = bigInt(data[1].slice(2), 16); 
    return [ bitmap, acc ]; 
}


module.exports = { initBitmap, addToBitmap, getBitmapData, getStaticAccData, getGlobalAccData, checkInclusionBitmap, checkInclusionGlobal, verifyBitmap }
