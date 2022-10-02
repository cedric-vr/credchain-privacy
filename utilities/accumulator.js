
var crypto = require('crypto');
var bigInt = require("big-integer");

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
    let p = crypto.generatePrimeSync(2048, {bigint: true});
    let q = crypto.generatePrimeSync(2048, {bigint: true});
    return p * q; 
}

function gen() {
    let n = generatePrimes(); 
    let g = bigInt.randBetween(0, n); 
    return [n, g];
}

function add(acc, n, x) {
    // acc = acc^x mod n 
    return bigInt(acc).modPow(x, n); 
}

function genWit(g, n, x, arr) {
    let product = 1; 
    // calculate the product of primes except x 
    for (let i = 0; i < arr.length; i++) {
        if (x != arr[i]) {
            product = bigInt(product).multiply(arr[i]); 
        }
    }
    // w = g^product mod n 
    let w = bigInt(g).modPow(product, n); 
    return w; 
}

function ver(acc, n, w, x) {
    // acc = w^x mod n 
    return ((bigInt(w).modPow(x, n)).equals(acc)); 
}

module.exports = { gen, add, genWit, ver, hashToPrime }