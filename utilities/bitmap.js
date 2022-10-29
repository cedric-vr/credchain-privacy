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

// async function addToBitmap(bitmapInstance, accInstance, element) {
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

async function addToBitmap(bitmapInstance, accInstance, element) {
    let [ bitmap, hashCount, count, capacity, epoch ] = await getBitmapData(bitmapInstance); 
    // add prime to the array, ideally this would be the distributed storage 
    storeEpochPrimes(element); // credential 

    // when new element revoked, update overall epoch product, which is p * p * ... p
    // where p is each element being revoked 
    // updateEpochProduct(element); 

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
        let [ accNew, accNewHex, staticAccHex ] = await addToGlobal(accInstance, staticAcc); 
        // store the data first 

        var startTime = performance.now();
        storeStaticAccData(epoch.toNumber(), staticAcc.toString(), 1); 
        // then update products data for each element 
        updateProducts(staticAcc);
        var endTime = performance.now(); 
        console.log(`Computing product took: ${endTime - startTime}`); 


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

            

        // get n, g values 
        let [ currentAcc, n, g ] = await getGlobalAccData(accInstance);
        // get the current product for the x 
        let products = readStaticAccProducts(); 
        let x_product = products[epoch - 1]; 

        var startTime = performance.now();
        // calculate w for the staticAcc 
        let w = bigInt(g).modPow(x_product, n);         // the most time consuming part because product grows 
        var endTime = performance.now(); 
        console.log(`Computing witness took: ${endTime - startTime} ms`); 
        console.log(); 

        // convert to hex 
        let wHex = "0x" + w.toString(16);

        // store new witness 
        // storeWitness(w); 
        // update witnesses 
        // updateWitness(n, g); 

        // transaction hash 
        let receipt; 
        // update data inside the contract 
        await accInstance.update(bitmap, staticAccHex, accNewHex, wHex).then((result) => {
            receipt = result.receipt.transactionHash;
        });
        // store tx in the contract 
        await accInstance.updateTx(receipt, epoch); 

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
    let txHash = await accInstance.getTx(epoch); 
    let tx = await web3.eth.getTransactionReceipt(txHash);
    let data = tx.logs[0].data; 

    // option 1: proof already stored in the tx 
    // let proofPrime = bigInt(data.slice(194, 1218), 16); 
    // let globalAccPrime = bigInt(data.slice(1282), 16); 
    // return bigInt(proofPrime).equals(globalAccPrime); 

    // option 2: calculate the proof and verify 
    let [ bitmap, staticAcc ] = await getStaticAccData(accInstance, epoch); 
    let [ acc, n, g ] = await getGlobalAccData(accInstance); 
    let witnessPrime = bigInt(data.slice(194, 1218), 16); 
    let globalAccPrime = bigInt(data.slice(1282), 16); 

    let proof = bigInt(witnessPrime).modPow(staticAcc, n);
    // console.log("result:", bigInt(proof).equals(globalAccPrime))
    return bigInt(proof).equals(globalAccPrime); 

    // option 3: 
    // let [ bitmap, staticAcc ] = await getStaticAccData(accInstance, epoch); 
    // let [ currentAcc, n, g ] = await getGlobalAccData(accInstance); 
    // let pastAccPrime = bigInt(data.slice(130), 16); // past acc 
    // // retrieve the missing staticAccs data from storage 
    // let missingAccs = getStaticAccInRange(epoch, currentEpoch - 1); 
    // let missingProduct = 1n; 
    // for (let i = 0; i < missingAccs.length; i++) {
    //     missingProduct = bigInt(missingProduct).multiply(missingAccs[i].acc);
    // }
    // let proof = bigInt(pastAccPrime).modPow(missingProduct, n); 
    // return bigInt(currentAcc).equals(proof)
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