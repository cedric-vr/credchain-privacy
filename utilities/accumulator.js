
var crypto = require('crypto');
var bigInt = require("big-integer");

// https://www.npmjs.com/package/big-integer

function generatePrimes() {
    let p = crypto.generatePrimeSync(1024, {bigint: true});
    let q = crypto.generatePrimeSync(1024, {bigint: true});
    return p * q; 
}

function hashToPrime(x, numberOfBits, nonce) {
    while (true) {
        let num = hashToLength(x + nonce, numberOfBits); 
        if (crypto.checkPrimeSync(num)) {
            return [num, nonce]; 
        }
        nonce += 1; 
    }     
}

function hashToLength(x, numberOfBits) {
    let randomString = ""; 
    let numberOfBlocks = Math.floor(numberOfBits / 256); 
    let hash = crypto.createHash('sha256'); 
    for (let i = 0; i < numberOfBlocks; i++) {
        randomString += hash.update(String(x + i)); 
    }
    randomString = hash.digest('hex');

    if (numberOfBits % 256 > 0) {
        let rem = Math.floor((numberOfBits % 256) / 4); 
        randomString = randomString.slice(rem * 2); 
    }

    let digit = BigInt('0x' + randomString); // in BigInt 
    // return digit.toString(10);            // convert to number 
    return digit
}

function generateAccumulator() {
    let n = generatePrimes(); 
    let rand = bigInt.randBetween(0, n); 
    let a0 = bigInt(rand).modPow(2, n); 
    return [n, a0.value];
}

module.exports = { generateAccumulator, hashToPrime }