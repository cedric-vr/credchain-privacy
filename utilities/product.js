
var bigInt = require("big-integer");

let staticAccData = [];
let products = []; 

let product = 1n; 

function updateProduct(x) {
    product = bigInt(product).multiply(x); 
}

function getProduct() {
    return product; 
}


// assume this is to access distributes storage, e.g., IPFS 
function storeStaticAccData(epoch, acc, product) {
    // staticAccData[epoch] = [bitmap, acc, accHex, product];
    // staticAccData.push( [epoch, bitmap, acc, accHex, product] ); 
    staticAccData.push( 
        {
            "epoch": epoch,
            "acc": acc,
            "product": product
        } 
    )
}

// assume this is to access distributed storage 
function readStaticAccData() {
    return staticAccData; 
}

// assume this is to access distributed storage 
function readStaticAccProducts() {
    return products; 
}

function getStaticAccInRange(from, to) {
    let range = []
    for (let i = from; i < to; i++) {
        range.push(staticAccData[i]); 
        // console.log(p); 
    }
    return range; 
}   

function updateProducts(new_x) {
    // product of other accumulators 
    let product = 1;
    // when adding new element to global accumulator, need to compute 
    // product of previous accumulators and store 
    let data = readStaticAccData(); 

    for (let i = 0; i < data.length - 1; i++) {
        product = bigInt(product).multiply(staticAccData[i].acc);
        products[i] = bigInt(products[i]).multiply(new_x); 
    }

    // console.log("product", product);

    products.push(product); 
}

function emptyProducts() {
    products = []; 
}

function emptyStaticAccData() {
    staticAccData = []; 
}

module.exports = { getStaticAccInRange, updateProduct, getProduct, storeStaticAccData, readStaticAccData, emptyStaticAccData, readStaticAccProducts, updateProducts, emptyProducts }