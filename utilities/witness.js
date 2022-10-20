
var bigInt = require("big-integer");

const { readStaticAccProducts } = require("./product"); 

let witnesses = []; 

// assume this is to access distributes storage, e.g., IPFS 
function storeWitness(witness) {
    witnesses.push(witness); 
}

// assume this is to access distributed storage 
function readWitness() {
    return witnesses; 
}

// when new epoch starts, need to update all witnesses in the storage 
function updateWitness(n, g) {

    let data = readWitness(); 
    let products = readStaticAccProducts(); 

    let updated_data = []

    for (let i = 0; i < data.length; i++) {
        let x_product = products[i];  
        let new_w = bigInt(g).modPow(x_product, n); 
        updated_data.push(new_w); 
    }

    witnesses = updated_data; 
}

module.exports = { storeWitness, readWitness, updateWitness } 