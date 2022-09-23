
var crypto = require('crypto');
var bigInt = require("big-integer");

// https://www.npmjs.com/package/big-integer

function generatePrimes() {
    let p = crypto.generatePrimeSync(1024, {bigint: true});
    let q = crypto.generatePrimeSync(1024, {bigint: true});
    return p * q; 
}

function generateAccumulator() {
    let n = generatePrimes(); 
    let rand = bigInt.randBetween(0, n); 
    let a0 = bigInt(rand).modPow(2, n); 
    return [n, a0.value];
}

module.exports = { generateAccumulator }