var bigInt = require("big-integer");

const { ethers } = require("hardhat");
const { gen, add, genMemWit, genNonMemWit, verMem, verNonMem, hashToPrime } = require("../utilities/accumulator.js"); 

// for testing, keep the array of primes for each epoch here 
// otherwise, we can use decentralisede storage to store it 
let epochPrimes = []; 

// let epochPrimes = [ 73, 11, 59, 3, 7 ]

// let epochWitnes = []; 

// function to return the stored epoch primes
// can be changed to database query and return 
function getEpochPrimes() {
    return epochPrimes; 
}

// arbitrary function to store credential primes somewhere 
// fix: change to the distributes storage (e.g., IPFS)
function storeEpochPrime(prime) {
    epochPrimes.push(prime); 
}

async function endEpoch() {
    // generate accumulator parameters 
    let [n, g] = gen();
    let acc = g; 

    // add all the primes in storage to the accumulator 
    for (let p = 0; p < epochPrimes.length; p++) {
        acc = add(acc, n, epochPrimes[p]); 
    }

    // let x = 83; 
    // let [ d, b ] = genNonMemWit(g, n, x, epochPrimes); 
    // let v1 = verNonMem(g, acc, d, b, x, n); 
    // console.log(v1); 

    return acc; 

    // send acc and bitmap to SC for storage 
    

    // // generate witness for each prime in the storage
    // for (let p = 0; p < epochPrimes.length; p++) {
    //     let w = genWit(g, n, epochPrimes[p], epochPrimes); 
    //     epochWitnes.push( [ epochPrimes[p], w ]); 
    // }

    // let x0 = epochPrimes[3]; 
    // let w0 = epochWitnes[3][1]; 
    // let v0 = ver(acc, n, w0, x0); 
    // console.log(v0); 

    // 1. aggregate epochPrimes storage to (static) accumulator value = acc_s 
    // let acc = genEpochAcc(acc0, n); 
    // console.log("epoch accumulator: ", acc); 

    // 2. for each prime in epochPrime, compute witness and emit from contract (???)
    // let w0 = genWitness(n, acc0, epochPrimes[0]); 

    // verify witness 
    // let proof = w0.modPow(epochPrimes[0], n); 

    // console.log(proof); 


    // 3. add acc_s to global dynamic accumulator 
    // 4. update global accumulator value 
    // 5. add bitmap to mapping under id => bitmap 
}

module.exports = { getEpochPrimes, storeEpochPrime, endEpoch }