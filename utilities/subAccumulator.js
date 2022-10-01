var bigInt = require("big-integer");

const { ethers } = require("hardhat");
const { gen, add, hashToPrime } = require("../utilities/accumulator.js"); 

// for testing, keep the array of primes for each epoch here 
// otherwise, we can use decentralisede storage to store it 
let epochPrimes = []; 

// let n = ethers.BigNumber.from("47643528160891675565126238547163111887484326886055461416775020064289531390604564705648563220827741441560905225590804091264357726140010074764429939594692182602235322413599096016182557617562288701004156654709452086576034870336750119695378089965791470985478710785584849145500150725644610695795125276924863689844490798629599870574966646813654060926330005592211440615022872009220682541631879141125958326535287959828944991795484308179430662029514851051991144010839809825876366320420647768580310468491284575397858605962168068225300630426537785377598473023539626567846166766986870774130243291659609017875777145878601303912717");

// helper function 
function displayArray() {
    for (let p = 0; p < epochPrimes.length; p++) {
        console.log(epochPrimes[p]); 
    }
}

// arbitrary function to store credential primes somewhere 
// fix: change to the distributes storage (e.g., IPFS)
function storePrime(prime) {
    epochPrimes.push(prime); 
}

// for each item in epochPrimes, add to acc 
function genEpochAcc(n, acc) {
    // generate new accumulator 
    // let [n, acc] = gen(); 

    // add each element 
    for (let p = 0; p < epochPrimes.length; p++) {
        acc = add(n, acc, epochPrimes[p]); 
    }
    return [n, acc]; 
}

function genWitness(n, acc0, x) {
    console.log("accumulator:", acc0); 

    let product = 1n; 

    // console.log("generating witness for:", x); 

    for (let p = 0; p < epochPrimes.length; p++) {
        if (x != epochPrimes[p]) {
            product = bigInt(product).multiply(epochPrimes[p]); 
        }
    }

    // acc^product mod n 
    let w = bigInt(acc0).modPow(product, n);
    console.log(w); 

    // let p1 = bigInt(w).modPow(x, n); 
    // let p2 = bigInt(acc).mod(n); 

    // let proof = bigInt(w).modPow(x, n); 
    // console.log(proof); 
    // console.log(p1); 
    // console.log(p2); 
    
    return w; 
}

async function initBitmap(instance, capacity) {
    // get the hash count based on capacity 
    let hashCount = await instance.getHashCount(capacity);
    // update the info in contract 
    await instance.updateHashCount(hashCount, capacity); 
}

async function endEpoch() {

    let [n, acc0] = gen(); 

    // 1. aggregate epochPrimes storage to (static) accumulator value = acc_s 
    let acc = genEpochAcc(n, acc0); 
    // console.log("epoch accumulator: ", acc); 

    // 2. for each prime in epochPrime, compute witness and emit from contract (???)
    let w0 = genWitness(n, acc0, epochPrimes[0]); 

    // verify witness 
    // let proof = w0.modPow(epochPrimes[0], n); 

    // console.log(proof); 


    // 3. add acc_s to global dynamic accumulator 
    // 4. update global accumulator value 
    // 5. add bitmap to mapping under id => bitmap 
}

async function addToBitmap(instance, credentialHash, credentialPrime, issuer) {
    
    let [ bitmap, hashCount, count, capacity ] = await getBitmapData(instance); 

    // add prime to the array, ideally this would be the distributed storage 
    storePrime(credentialPrime); 

    // converts prime number to hex string 
    let credentialPrimeHex = "0x" + credentialPrime.toString(16); 
    // converts hex string back to original prime 
    let primeHexToInt = BigInt(credentialPrimeHex); 

    if (count.toNumber() + 1 == capacity.toNumber()) {
        // capacity reached and new epoch starts
        // call function to pack everything and start anew 
        await endEpoch(); 
        
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

module.exports = { initBitmap, addToBitmap, getBitmapData, checkInclusion, packBitmap, displayArray }