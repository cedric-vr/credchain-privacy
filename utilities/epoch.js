var bigInt = require("big-integer");

const { ethers } = require("hardhat");
const { gen, add, genWit, ver, hashToPrime } = require("../utilities/accumulator.js"); 

// for testing, keep the array of primes for each epoch here 
// otherwise, we can use decentralisede storage to store it 
let epochPrimes = []; 
let epochWitnes = []; 

// let n = ethers.BigNumber.from("47643528160891675565126238547163111887484326886055461416775020064289531390604564705648563220827741441560905225590804091264357726140010074764429939594692182602235322413599096016182557617562288701004156654709452086576034870336750119695378089965791470985478710785584849145500150725644610695795125276924863689844490798629599870574966646813654060926330005592211440615022872009220682541631879141125958326535287959828944991795484308179430662029514851051991144010839809825876366320420647768580310468491284575397858605962168068225300630426537785377598473023539626567846166766986870774130243291659609017875777145878601303912717");

// helper function 
function displayArray() {
    for (let p = 0; p < epochPrimes.length; p++) {
        console.log(epochPrimes[p]); 
    }
}

// arbitrary function to store credential primes somewhere 
// fix: change to the distributes storage (e.g., IPFS)
function storePrime(prime) {
    epochPrimes.push(prime); 
}

// for each item in epochPrimes, add to acc 
function genEpochAcc(n, acc) {
    // add each element 
    for (let p = 0; p < epochPrimes.length; p++) {
        acc = add(n, acc, epochPrimes[p]); 
    }
    return [n, acc]; 
}

function genWitness(n, acc0, x) {
    console.log("accumulator:", acc0); 

    let product = 1n; 

    // console.log("generating witness for:", x); 

    for (let p = 0; p < epochPrimes.length; p++) {
        if (x != epochPrimes[p]) {
            product = bigInt(product).multiply(epochPrimes[p]); 
        }
    }

    // acc^product mod n 
    let w = bigInt(acc0).modPow(product, n);
    console.log(w); 

    // let p1 = bigInt(w).modPow(x, n); 
    // let p2 = bigInt(acc).mod(n); 

    // let proof = bigInt(w).modPow(x, n); 
    // console.log(proof); 
    // console.log(p1); 
    // console.log(p2); 
    
    return w; 
}


function endEpoch() {

    let [n, g] = gen();
    let acc = g; 

    for (let p = 0; p < epochPrimes.length; p++) {
        acc = add(acc, n, epochPrimes[p]); 
    }


    for (let p = 0; p < epochPrimes.length; p++) {
        let w = genWit(g, n, epochPrimes[p], epochPrimes); 
        epochWitnes.push( [ epochPrimes[p], w ]); 
    }

    console.log("prime:", epochWitnes[0][0]); 
    console.log("witness:", epochWitnes[0][1]); 
    console.log(""); 

    let x0 = epochPrimes[3]; 
    let w0 = epochWitnes[3][1]; 
    let v0 = ver(acc, n, w0, x0); 

    // console.log((bigInt(w0).modPow(x0, n)).equals(acc)); 
    // console.log(w0); 
    // console.log(bigInt(w0).modPow(x0, n)); 

    console.log(v0); 

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

module.exports = { displayArray, storePrime, genEpochAcc, genWitness, endEpoch }