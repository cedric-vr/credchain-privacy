
const { gen, add } = require("../utilities/accumulator.js"); 

var bigInt = require("big-integer");

// for testing, keep the array of primes for each epoch here 
// otherwise, we can use decentralisede storage to store it 
let epochPrimes = []; 

let product = 1n; 

function getEpochProduct() {
    return product; 
}

function updateEpochProduct(x) {
    // console.log("new element", x);
    product = bigInt(product).multiply(x);
}

// function to return the stored epoch primes
// can be changed to database query and return 
function getEpochPrimes() {
    return epochPrimes; 
}

// arbitrary function to store credential primes somewhere 
// fix: change to the distributes storage (e.g., IPFS)
function storeEpochPrimes(prime) {
    epochPrimes.push(prime); 
}

function emptyEpochPrimes() {
    epochPrimes = [];
}

function _endEpoch() {
    let primes = getEpochPrimes(); 
    let [n, g] = gen();
    let acc = g; 
    // add all the primes in storage to the accumulator 
    for (let p = 0; p < primes.length; p++) {
        acc = add(acc, n, primes[p]); 
    }
    // re-establish epoch primes to empty?
    emptyEpochPrimes(); 
    return acc; 
}

function endEpoch(_product) {
    // let primes = getEpochPrimes(); 
    let [n, g] = gen();
    // let acc = g; 

    // let product = primes.reduce((a, b) => a * b);
    let acc = bigInt(g).modPow(_product, n); 

    // console.log("with product\n", accUpd); 

    // add all the primes in storage to the accumulator 
    // for (let p = 0; p < primes.length; p++) {
    //     acc = add(acc, n, primes[p]); 
    // }

    // console.log("with add\n", acc); 

    // re-establish epoch primes to empty?
    // emptyEpochPrimes(); 
    product = 1n; // reset product 
    return acc; 
}

module.exports = { getEpochPrimes, storeEpochPrimes, endEpoch, updateEpochProduct, getEpochProduct }