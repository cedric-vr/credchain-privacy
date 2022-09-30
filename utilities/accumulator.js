
var crypto = require('crypto');
var bigInt = require("big-integer");

// const { primalityTest } = require("primality-test");

const primeSize = 128; 

// https://www.npmjs.com/package/big-integer

function hashToPrime(x, numberOfBits, nonce) {
    while (true) {
        let num = hashToLength(x + nonce, numberOfBits); 
        if (bigInt(num).isProbablePrime()) {
            return [num, nonce]; 
        }
        nonce += 1n; 
    }     
}

function hashToLength(x, numberOfBits) {
    let randomString = ""; 
    let numberOfBlocks = Math.ceil(numberOfBits / 256); 
    let hash = crypto.createHash('sha256'); 

    for (let i = 0; i < numberOfBlocks; i++) {
        randomString += hash.update(String(x + BigInt('0x' + i))); 
    }
    randomString = hash.digest('hex');

    if (numberOfBits % 256 > 0) {
        let rem = parseInt((numberOfBits % 256) / 4); 
        randomString = randomString.slice(rem); 
    }

    return BigInt('0x' + randomString); 
}

function generatePrimes() {
    let p = crypto.generatePrimeSync(1024, {bigint: true});
    let q = crypto.generatePrimeSync(1024, {bigint: true});
    return p * q; 
}

function gen() {
    let n = generatePrimes(); 
    let g = bigInt.randBetween(0, n); 
    let acc = bigInt(g).modPow(2, n); 
    return [n, acc.value];
}

function add(acc0, x) {
    // convert to prime before adding here? 
    // let [ hashPrime, nonce ] = hashToPrime(credential, x, primeSize); 
    let acc = bigInt(x).modPow(acc0, n); 
    return acc; 
}

module.exports = { gen, add, hashToPrime }