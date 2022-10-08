
var crypto = require('crypto');
var bigInt = require("big-integer");

const primeSize = 128; 

// https://www.npmjs.com/package/big-integer

function xgcd(b, a) {
    let x0 = 1n; x1 = 0n; y0 = 0n; y1 = 1n; 

    while (a != 0) {
        let q = bigInt(b).divide(a); 
        let bb = a; 
        a = bigInt(b).mod(a); 
        b = bb; 

        let x00 = x1; 
        let x1a = bigInt(q).multiply(x1); 
        x1 = bigInt(x0).subtract(x1a); 
        x0 = x00; 

        let y00 = y1; 
        let y1a = bigInt(q).multiply(y1); 
        y1 = bigInt(y0).subtract(y1a); 
        y0 = y00; 
    }

    return [ b, x0, y0 ]; 
}

function bezouteCoefficients(a, b) {
    let o = xgcd(a, b); 
    return [ o[1], o[2] ]
}

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
    // let n = 47; 
    let g = bigInt.randBetween(0, n); 
    return [n, g];
}

function add(acc, n, x) {
    // acc = acc^x mod n 
    return bigInt(acc).modPow(x, n); 
}

function genMemWit(g, n, x, arr) {
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

function genNonMemWit(g, n, x, arr) {
    let product = 1; 
    let d = 1; 
    // calculate the product of primes except x 
    for (let i = 0; i < arr.length; i++) {
        if (x != arr[i]) {
            product = bigInt(product).multiply(arr[i]); 
        }
    }

    let [ a, b ] = bezouteCoefficients(x, product); 

    if (a < 0n) {
        let positiveA = bigInt(-a); 
        let inverse_g = bigInt(g).modInv(n);
        d = bigInt(inverse_g).modPow(positiveA, n); 
    } 
    else {
        d = bigInt(g).modPow(a, n); 
    }

    return [ d, b ]; 
}

function verMem(acc, n, w, x) {
    // acc = w^x mod n 
    return ((bigInt(w).modPow(x, n)).equals(acc)); 
}

function verNonMem(g, acc, d, b, x, n) {
    let secondPower;

    if (b < 0) {
        let positiveB = bigInt(-b); 
        let inverse_acc = bigInt(acc).modInv(n);
        secondPower = bigInt(inverse_acc).modPow(positiveB, n); 
    }
    else {
        secondPower = bigInt(acc).modPow(b, n); 
    }

    let k = bigInt(d).modPow(x, n); 
    let j = bigInt(k).multiply(secondPower);
    return bigInt(j).mod(n).equals(g); 
}



module.exports = { gen, add, genMemWit, genNonMemWit, verMem, verNonMem, generatePrimes, hashToPrime }