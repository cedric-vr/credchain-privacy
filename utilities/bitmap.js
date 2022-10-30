var bigInt = require("big-integer");
const { web3 } = require("hardhat");

// const { ethers } = require("hardhat");
const { add } = require("./accumulator.js"); 
const { storeEpochPrimes, endEpoch, updateEpochProduct, getEpochProduct } = require("./epoch.js");
const { storeStaticAccData, readStaticAccProducts, updateProducts, updateProduct, getProduct, readStaticAccData, getStaticAccInRange } = require("./product.js");

const { storeWitness, readWitness, updateWitness } = require("./witness"); 

const { storeCredential, storeWitnessUser } = require("./userStorage"); 

let witness; 

async function initBitmap(instance, capacity) {
    // get the hash count based on capacity 
    let hashCount = await instance.getHashCount(capacity);
    // update the info in contract 
    await instance.updateHashCount(hashCount, capacity); 
}

// async function _addToBitmap(bitmapInstance, accInstance, element) {
//     let [ bitmap, hashCount, count, capacity, epoch ] = await getBitmapData(bitmapInstance); 
//     // add prime to the array, ideally this would be the distributed storage 
//     // storeEpochPrimes(element); // credential 

//     // when new element revoked, update overall epoch product, which is p * p * ... p
//     // where p is each element being revoked 
//     // no need to record every revoked credential, only their final prime 
//     updateEpochProduct(element); 

//     // converts prime number to hex string 
//     let elementHex = "0x" + element.toString(16); 

//     // console.log("count:", count.toNumber());
//     // console.log("capacity", capacity.toNumber()); 
//     // console.log("epoch", epoch.toNumber(), "; element", element); 

//     // capacity reached, current data is packed and new epoch starts
//     if (count.toNumber() + 10 == capacity.toNumber()) {
//         // get current product number
//         let epochProduct = getEpochProduct(); 

//         // packs current epoch primes into static accumulator x 
//         let staticAcc = endEpoch(epochProduct); // acc is prime 
        
//         // updated global accumulator and static acc hex 
//         let [ accNew, accNewHex, staticAccHex ] = await addToGlobal(accInstance, staticAcc); 
        
//         var startTime = performance.now();
//         // store the data first 
//         storeStaticAccData(epoch.toNumber(), staticAcc.toString(), 1); 
//         // then update products data for each element 
//         updateProducts(staticAcc);
//         var endTime = performance.now(); 
//         console.log(`Computing product took: ${endTime - startTime}`); 


//         // get n, g values 
//         let [ currentAcc, n, g ] = await getGlobalAccData(accInstance);
//         // get the current product for the x 
//         let products = readStaticAccProducts(); 
//         let x_product = products[epoch - 1]; 

//         var startTime = performance.now();
//         // calculate w for the staticAcc 
//         let w = bigInt(g).modPow(x_product, n);         // the most time consuming part because product grows 
//         var endTime = performance.now(); 
//         console.log(`Computing witness took: ${endTime - startTime} ms`); 
//         console.log(); 
//         // convert to hex 
//         let wHex = "0x" + w.toString(16);
//         // transaction hash 
//         let receipt; 
//         // update data inside the contract 
//         await accInstance.update(bitmap, staticAccHex, accNewHex, wHex).then((result) => {
//             receipt = result.receipt.transactionHash;
//         });
//         // store tx in the contract 
//         await accInstance.updateTx(receipt, epoch); 

//         // reset bitmap 
//         bitmap = 0; 
//         // update epoch in the smart contract 
//         await bitmapInstance.updateEpoch(); 
//     }
    
//     // what if more than 1 issuers call the addToBitmap function? 
//     // TODO: lock function for updating bitmap 
//     bitmap = await bitmapInstance.addToBitmap(bitmap, hashCount, elementHex);
//     await bitmapInstance.updateBitmap(bitmap); 
// }

async function addToBitmap(bitmapInstance, accInstance, element) {
    let [ bitmap, hashCount, count, capacity, epoch ] = await getBitmapData(bitmapInstance); 
    // add prime to the array, ideally this would be the distributed storage 
    // storeEpochPrimes(element); // credential 

    // when new element revoked, update overall epoch product, which is p * p * ... p
    // where p is each element being revoked 
    // no need to record every revoked credential, only their final prime 
    updateEpochProduct(element); 

    // converts prime number to hex string 
    let elementHex = "0x" + element.toString(16); 

    // console.log("count:", count.toNumber());
    // console.log("capacity", capacity.toNumber()); 
    // console.log("epoch", epoch.toNumber(), "; element", element); 

    // capacity reached, current data is packed and new epoch starts
    if (count.toNumber() + 10 == capacity.toNumber()) {

        // get n, g values 
        // let [ currentAcc, n, g ] = await getGlobalAccData(accInstance);

        // get current product number
        let epochProduct = getEpochProduct(); 
        // epochProduct = bigInt(epochProduct).mod(n); 

        // console.log(epochProduct); 
        // console.log(epochProduct.toString().length); 

        // packs current epoch primes into static accumulator x 
        let staticAcc = endEpoch(epochProduct); // acc is prime 

        // console.log(staticAcc);
        // var startTime = performance.now();
        // console.log(bigInt(g).modPow(epochProduct, n)); 
        // var endTime = performance.now(); 
        // console.log(`Computing static acc took: ${endTime - startTime} ms`); 
        
        // updated global accumulator and static acc hex 
        let [ newAcc, newAccHex, staticAccHex ] = await addToGlobal(accInstance, staticAcc); 
        
        // var startTime = performance.now();
        // store the data first 
        // storeStaticAccData(epoch.toNumber(), staticAcc.toString(), 1); 
        // then update products data for each element 
        // updateProducts(staticAcc);
        // var endTime = performance.now(); 
        // console.log(`Computing product took: ${endTime - startTime}`); 

        // get the current product for the x 
        // let products = readStaticAccProducts(); 
        // let x_product = products[epoch - 1]; 

        // var startTime = performance.now();
        // calculate w for the staticAcc 
        // let w = bigInt(g).modPow(x_product, n);         // the most time consuming part because product grows 
        // var endTime = performance.now(); 
        // console.log(`Computing witness took: ${endTime - startTime} ms`); 
        // console.log(); 
        // convert to hex 
        // let wHex = "0x" + w.toString(16);

        // we know previousAcc and newAcc 
        // hash(previousAcc, newAcc)

        // transaction hash 
        let receipt; 
        // update data inside the contract 
        await accInstance.update(bitmap, staticAccHex, newAccHex).then((result) => {
            receipt = result.receipt.transactionHash;
        });
        // store tx in the contract 
        // newGlobalAcc => txHash 
        await accInstance.updateTx(epoch, receipt); 

        // console.log("stroed txHash:", receipt);

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

async function verifyBitmap(accInstance, epoch, currentEpoch) {

    let n = await accInstance.getModulus(); 
    n = bigInt(n.slice(2), 16); 

    let txHash = await accInstance.getTx(epoch); 
    // console.log(txHash); 
    let tx = await web3.eth.getTransactionReceipt(txHash);
    // console.log(tx)

    // recovered tx of the previous state
    // can get the past global acc and hash of (acci, accj)


    let pastStaticAcc = bigInt((tx.logs[0].data).slice(130), 16);
    let pastGlobalAcc = bigInt((tx.logs[1].data).slice(130), 16);
    let pastHash = tx.logs[2].data;

    let accj = bigInt(pastGlobalAcc).modPow(pastStaticAcc, n); 

    let acciHex = "0x" + pastGlobalAcc.toString(16); 
    let accjHex = "0x" + accj.toString(16); 

    if (acciHex.length % 2 != 0) {
        acciHex = "0x0" + pastGlobalAcc.toString(16); 
    }
    if (accjHex.length % 2 != 0) {
        accjHex = "0x0" + accj.toString(16); 
    }

    let calcHash = web3.utils.soliditySha3(acciHex, accjHex);

    console.log(calcHash); 
    console.log(pastHash); 
    console.log(calcHash === pastHash); 
    return(calcHash === pastHash); 

    // let [ currentAcc, n, g ] = await getGlobalAccData(accInstance);
    // let data = await accInstance.getBitmap(epoch); 

    // let bitmap = data[0]; 
    // let staticAcc = bigInt(data[1].slice(2), 16); 
    // let acci = bigInt(data[2].slice(2), 16); 
    // // to get its related global acc, add staticAcc to acc_i 
    // let accj = bigInt(acci).modPow(staticAcc, n); 
    // let accjHex = "0x" + accj.toString(16); 
    // let acciHex = data[2]; 
    // let txHash = await accInstance.getHistory(accjHex); 
    // let tx = await web3.eth.getTransactionReceipt(txHash);
    // // console.log("retrieved txHash:", tx); 

    // let retrievedHash = tx.logs[0].data; 
    // // console.log("hash from tx", retrievedHash); 

    // if (acciHex.length % 2 != 0) {
    //     acciHex = "0x0" + acci.toString(16); 
    // }
    // if (accjHex.length % 2 != 0) {
    //     accjHex = "0x0" + accj.toString(16); 
    // }

    // let computedHash = web3.utils.soliditySha3(acciHex, accjHex);
    // // console.log("hash computed", computedHash); 
    // // console.log("hashes same:", retrievedHash === computedHash)
    // // console.log("")
    // return (retrievedHash === computedHash);
}

async function _verifyBitmap(accInstance, epoch, currentEpoch) {
    let txHash = await accInstance.getTx(epoch); 
    let tx = await web3.eth.getTransactionReceipt(txHash);
    let data = tx.logs[0].data; 

    // option 2: calculate the proof and verify  ---- the working one 
    let [ bitmap, staticAcc ] = await getStaticAccData(accInstance, epoch); 
    let [ acc, n, g ] = await getGlobalAccData(accInstance); 
    let witnessPrime = bigInt(data.slice(194, 1218), 16); 
    let globalAccPrime = bigInt(data.slice(1282), 16); 
    let proof = bigInt(witnessPrime).modPow(staticAcc, n);
    // console.log("result:", bigInt(proof).equals(globalAccPrime))
    return bigInt(proof).equals(globalAccPrime);  
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
    return [ accNew, accNewHex, xHex ]; 
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
    return [ acc, n, g ]; 
}

async function getPastGlobalAccData(accInstance, id) {
    let data = await accInstance.getPastGlobalAcc(id); 
    let acc = bigInt(data[0].slice(2), 16); 
    let witness = bigInt(data[1].slice(2), 16); 
    let n = bigInt(data[2].slice(2), 16); 
    return [ acc, witness, n ]; 
}

async function getStaticAccData(accInstance, id) {
    let data = await accInstance.getStaticAcc(id);
    let bitmap = data[0]; 
    let acc = bigInt(data[1].slice(2), 16); 
    return [ bitmap, acc ]; 
}


module.exports = { initBitmap, addToBitmap, getBitmapData, getStaticAccData, getGlobalAccData, checkInclusionBitmap, checkInclusionGlobal, verifyBitmap }





// async function _addToBitmap(bitmapInstance, accInstance, element) {
//     let [ bitmap, hashCount, count, capacity, epoch ] = await getBitmapData(bitmapInstance); 

//     // when new element revoked, update overall epoch product, which is p * p * ... p
//     // where p is each element being revoked 
//     updateEpochProduct(element); 

//     // add prime to the array, ideally this would be the distributed storage 
//     // storeEpochPrimes(element); // credential 
//     // converts prime number to hex string 
//     let elementHex = "0x" + element.toString(16); 

//     // console.log("count:", count.toNumber());
//     // console.log("capacity", capacity.toNumber()); 
//     // console.log("epoch", epoch.toNumber(), "; element", element); 

//     // capacity reached, current data is packed and new epoch starts
//     if (count.toNumber() + 10 == capacity.toNumber()) {
//         // get current product number
//         let epochProduct = getEpochProduct(); 

//         var startTime = performance.now();
//         // packs current epoch primes into static accumulator x 
//         let staticAcc = endEpoch(epochProduct); // acc is prime 
//         var endTime = performance.now();
//         // console.log(`       > 1 Call to endEpoch(epochPrime) took ${endTime - startTime} ms`)

//         // add staticAcc to Acc
//         var startTime = performance.now();
//         let [ currentAcc, n, g ] = await getGlobalAccData(accInstance);
//         var endTime = performance.now();
//         // console.log(`       > 2 Call to getGlobalAccData() took ${endTime - startTime} ms`)

//         var startTime = performance.now();
//         // add new element to the current accumulator - bigInt(acc).modPow(x, n), acc^staticAcc mod n 
//         let accNew = add(currentAcc, n, staticAcc); // x is static accumulator 
//         var endTime = performance.now();
//         // console.log(`       > 3 Call to add(currentAcc, n, staticAcc) took ${endTime - startTime} ms`)

//         var startTime = performance.now();
//         storeStaticAccData(epoch.toNumber(), staticAcc.toString(), 1); 
//         updateProducts(staticAcc); 
//         var endTime = performance.now();
//         // console.log(`       > 3.1 Call to updateProducts(staticAcc) took ${endTime - startTime} ms`)

//         let accNewHex = "0x" + bigInt(accNew).toString(16); 
//         let staticAccHex = "0x" + bigInt(staticAcc).toString(16);

//         // get product for static acc 
//         let accProduct = getProduct(); 

//         // var startTime = performance.now();
//         // calculate w 
//         // let w = bigInt(g).modPow(accProduct, n); 
//         // var endTime = performance.now();
//         // console.log(`       > 4 Call to compute witness took ${endTime - startTime} ms`)

//         var startTime = performance.now();
//         // update products info 
//         updateProduct(staticAcc);
//         var endTime = performance.now();
//         // console.log(`       > 5 Call to updateProduct(staticAcc) took ${endTime - startTime} ms`)
//         // witness as hex 
//         // let wHex = "0x" + w.toString(16);

//         // transaction hash 
//         let receipt; 
//         var startTime = performance.now();
//         // update data inside the contract 
//         await accInstance.update(bitmap, staticAccHex, accNewHex /*, wHex */).then((result) => {
//             receipt = result.receipt.transactionHash;
//         });
//         // store tx in the contract 
//         await accInstance.updateTx(receipt, epoch); 
//         var endTime = performance.now();
//         // console.log(`       > 6 Call to update contract took ${endTime - startTime} ms`)

//         // reset bitmap 
//         bitmap = 0; 
//         // update epoch in the smart contract 
//         await bitmapInstance.updateEpoch(); 
//     }
    
//     // what if more than 1 issuers call the addToBitmap function? 
//     // TODO: lock function for updating bitmap 
//     bitmap = await bitmapInstance.addToBitmap(bitmap, hashCount, elementHex);
//     await bitmapInstance.updateBitmap(bitmap); 
// }




// epoch product is the product of all revoked credentials during epoch 
        // product = p1 * p2 * ... pn 
        
        // staticAcc = g^product mod n 
        // globalAcc = currentAcc^staticAcc mod n 

        // if globalAcc = currentAcc^product mod n 


        // why do we need product of static accs? 
        //      > to compute witness for a staticAcc, we need a product of all other staticAccs
        //        contributing to the globalAcc 

        // why do we need a witness of staticAcc? 
        //      > witness is necessary to verify the presence of staticAcc in globalAcc 
        //        witness of statiAcc and its related globalAcc are stored in TX 
        //        there is no need to update witness with new staticAcc because we only 
        //        verify the presence of staticAcc in past globalAcc, not the current one 
        //      > tx infromation has to be updated only once, and then any update functions 
        //        has to be locked for that bitmap 
        
        // can we remove witness and still be sure that the staticAcc was in fact past of current globalAcc history? 

        // this approach is still low frequency update because number of revoked credentials 
        // is less than number of wintess updates performed !!! 
        // mapping epoch => { bitmap, staticAcc, txHash }
        // txHash                                   ^ { witness, pastGlobalAcc }
        //                                                 ^ g ^ staticAcc_product mod n 
        //                                                 ^ expensive to compute, exponential 

        // verify true if (witness ^ staticAcc mod n) == pastGlobalAcc 
        //                ((g ^ staticAcc_product mod n) ^ staticAcc) mod n == pastGlobalAcc 
        //                          ^ grows exponentially with each new staticAcc

        // mapping epoch => { bitmap, staticAcc, txHash, historyHash }
        //                                                    ^ hash( { staticAcc, pastGlobalAcc }, txHash )
        //                                          ^ { staticAcc, pastGlobalAcc }
        
        // verify validity of bitmap: 
        //      1. get {staticAcc, pastGlobalAcc} though txHash 
        //      2. take hash({staticAcc, pastGlobalAcc}, txHash)
        //      3. if newHash == historyHash, then true 

        // each staticAcc has a mapping in Accumulator contract and thus transaction 
        // this prooves the bitmap was in the history? 

        // mapping epoch => { bitmap, statiAcc, pastGlobalAcc }
        // 