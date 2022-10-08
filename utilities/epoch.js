
const { gen, add } = require("../utilities/accumulator.js"); 

// for testing, keep the array of primes for each epoch here 
// otherwise, we can use decentralisede storage to store it 
let epochPrimes = []; 

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

function endEpoch() {
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

module.exports = { getEpochPrimes, storeEpochPrimes, endEpoch }