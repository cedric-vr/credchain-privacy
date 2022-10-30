
const { addToBitmap, getBitmapData, getStaticAccData, checkInclusionBitmap, checkInclusionGlobal, getGlobalAccData, verifyBitmap } = require("../utilities/bitmap");
const { hashToPrime } = require("../utilities/accumulator");

const { getStaticAccInRange } = require("../utilities/product"); 

var bigInt = require("big-integer");

// issuer function 
async function revoke(credential, subAccInstance, accInstance) {
    // credential is represented by a prime and stored at the local device of user, computed once the credential issued
    // issuer does not know prime, so it is computed before revocation 
    let [ credentialPrime, nonce ] = hashToPrime(credential, 128, 0n); 
    // when issuer revokes a credential, it is always added to the bitmap, issuer does not know which one 
    await addToBitmap(subAccInstance, accInstance, credentialPrime); 
}

// verifier function 
async function verify(credential, epoch, subAccInstance, accInstance) {
    let [ currentBitmap, hashCount, count, capacity, currentEpoch ] = await getBitmapData(subAccInstance); 
	let [ credentialPrime, nonce ] = hashToPrime(credential, 128, 0n); 

    // if currentEpoch == epoch provided
    if (currentEpoch.toNumber() === epoch) {
        // only check the inclusion in the current bitmap 
        let checkCurrentBitmap = await checkInclusionBitmap(subAccInstance, currentBitmap, hashCount, credentialPrime);
        // the credential has been revoked 
        if (checkCurrentBitmap === true) { return false; } 
    }
    // if currentEpoch != epoch 
    else {
        // retrieve bitmap and corresponding staticAcc based on provided epoch
        let [ pastBitmap, pastStaticAcc ] = await getStaticAccData(accInstance, epoch); 

        // check the inclusion of provided credential with retrieved bitmap (inclusion in corresponding bitmap)
        let checkRelatedBitmap = await checkInclusionBitmap(subAccInstance, pastBitmap, hashCount, credentialPrime); 
        // true if cred included in bitmap, the credential has been revoked 
        if (checkRelatedBitmap === true) { return false; } 

        // check if the issuance bitmap was in fact part of history 
        let checkBitmapInclusion = await verifyBitmap(accInstance, epoch); 
        // console.log("1", checkBitmapInclusion); 
        // proof failed, cannot trust this bitmap 
        if (checkBitmapInclusion === false) { return false; } 

        // if the previous check returns false, the credential not in the bitmap retrieved though provided epoch 
        // check the inclusion of the static accumulator in the global accumulator to verify its reliability 
        // let checkStaticAcc = await checkInclusionGlobal(accInstance, pastStaticAcc, epoch); 

        // let checkStaticAcc_ = await checkInclusionGlobal_storage(accInstance, pastStaticAcc, epoch); 
        // console.log(checkStaticAcc_); 

        // the bitmap is not part of global accumulator, thus can't trust provided credential and corresponding acc
        // if (checkStaticAcc === false) { return false; } 

        // if the previous check returns true, the static acc is a member of global acc and can be trusted 
        // check the subsequent bitmaps for credential exclusion and verify their membership in global acc 
        for (let i = epoch + 1; i < currentEpoch.toNumber(); i++) {
            // console.log("loop", i); 
            // check all the bitmaps up to the current as its a special case to verify 
            // retrieve bitmap and static acc for the epoch i 
            let [ pastBitmap_i, pastStaticAcc_i ] = await getStaticAccData(accInstance, i); 

            // console.log(`bitmap ${i} >>> ${pastBitmap_i.toString()}`)
            // console.log(`credential prime ${credentialPrime}`)

            // check the inclusion of the credential in that bitmap in epoch i 
            let checkSubsequent = await checkInclusionBitmap(subAccInstance, pastBitmap_i, hashCount, credentialPrime);
            // console.log("2", checkSubsequent); 
            // if the inclusion check return true, then credential has been revoked in subsequent epoch i 
            if (checkSubsequent === true) { return false; }
            // alternative on-chain verifiaction goes here instead of next few lines 
            // alternative verify bitmap value in the past accumulator 
            
            //  check if the bitmap was in fact part of history 
            let checkBitmapInclusionSub = await verifyBitmap(accInstance, i); 
            // console.log("3", checkBitmapInclusionSub); 
            // proof failed, cannot trust this bitmap 
            if (checkBitmapInclusionSub === false) { return false; } 
            
            // if the return false, the credential was not included in bitmap i, verify the correctness of that bitmap 
            // let checkSubsequentAcc = await checkInclusionGlobal(accInstance, pastStaticAcc_i, i)
            // if yields false, then bitmap value was not part of the history and possibly forged 
            // if (checkSubsequentAcc === false) { return false; }
            
            // if previous returns true, the bitmap is part of global accumulator and thus history 
        }

        // check the current bitmap separately since it does not have corresponding static acc yet 
        [ currentBitmap, hashCount, count, capacity, epoch ]  = await getBitmapData(subAccInstance); 
        // check the inclusion of the credential in current bitmap 
        let checkCurrBitmap = await checkInclusionBitmap(subAccInstance, currentBitmap, hashCount, credentialPrime);
        // the credential has been revoked 
        if (checkCurrBitmap === true) { return false; } 
    }

    // all the checks passed and credential is valid
    return true; 
}

// // verifier function 
// async function verify(credential, epoch, subAccInstance, accInstance) {
//     let [ currentBitmap, hashCount, count, capacity, currentEpoch ] = await getBitmapData(subAccInstance); 
// 	let [ credentialPrime, nonce ] = hashToPrime(credential, 128, 0n); 

//     // if currentEpoch == epoch provided
//     if (currentEpoch.toNumber() === epoch) {
//         // only check the inclusion in the current bitmap 
//         let checkCurrentBitmap = await checkInclusionBitmap(subAccInstance, currentBitmap, hashCount, credentialPrime);
//         // the credential has been revoked 
//         if (checkCurrentBitmap === true) { return false; } 
//     }
//     // if currentEpoch != epoch 
//     else {
//         // retrieve bitmap and corresponding staticAcc based on provided epoch
//         let [ pastBitmap, pastStaticAcc ] = await getStaticAccData(accInstance, epoch); 

//         // check the inclusion of provided credential with retrieved bitmap (inclusion in corresponding bitmap)
//         let checkRelatedBitmap = await checkInclusionBitmap(subAccInstance, pastBitmap, hashCount, credentialPrime); 
//         // true if cred included in bitmap, the credential has been revoked 
//         // console.log("1")
//         if (checkRelatedBitmap === true) { return false; } 

//         // check if the issuance bitmap was in fact part of history 
//         let checkBitmapInclusion = await verifyBitmap(accInstance, epoch, currentEpoch.toNumber()); 
//         // console.log("2")
//         // proof failed, cannot trust this bitmap 
//         if (checkBitmapInclusion === false) { return false; } 

       

//         // if the previous check returns false, the credential not in the bitmap retrieved though provided epoch 
//         // check the inclusion of the static accumulator in the global accumulator to verify its reliability 
//         // let checkStaticAcc = await checkInclusionGlobal(accInstance, pastStaticAcc, epoch); 

//         // let checkStaticAcc_ = await checkInclusionGlobal_storage(accInstance, pastStaticAcc, epoch); 
//         // console.log(checkStaticAcc_); 

//         // the bitmap is not part of global accumulator, thus can't trust provided credential and corresponding acc
//         // if (checkStaticAcc === false) { return false; } 

//         // if the previous check returns true, the static acc is a member of global acc and can be trusted 
//         // check the subsequent bitmaps for credential exclusion and verify their membership in global acc 
//         for (let i = epoch + 1; i < currentEpoch.toNumber(); i++) {
//             // check all the bitmaps up to the current as its a special case to verify 
//             // retrieve bitmap and static acc for the epoch i 
//             let [ pastBitmap_i, pastStaticAcc_i ] = await getStaticAccData(accInstance, i); 
//             // check the inclusion of the credential in that bitmap in epoch i 
//             let checkSubsequent = await checkInclusionBitmap(subAccInstance, pastBitmap_i, hashCount, credentialPrime);
//             // console.log("3")
//             // if the inclusion check return true, then credential has been revoked in subsequent epoch i 
//             if (checkSubsequent === true) { return false; }

//             // console.log("credential epoch:", epoch); 
//             // console.log("current i:", i); 
//             // console.log("current epoch:", currentEpoch.toNumber()); 

//             // check the bitmap proof 
//             // check if the bitmap was in fact part of history 
//             let checkBitmapInclusionSub = await verifyBitmap(accInstance, i, currentEpoch.toNumber()); 
//             // console.log("loop:", i);
//             // proof failed, cannot trust this bitmap 
//             if (checkBitmapInclusionSub === false) { return false; } 
            
//             // alternative on-chain verifiaction goes here instead of next few lines 

//             // alternative verify bitmap value in the past accumulator 
//             // let [ pastGlobalAcc_i, pastWitness_i, n ] = await getGlobalAccData(accInstance, i); 
//             // check if pastWitness evaluated to pastGlobalAcc 
//             // convert to bigInt before check 
//             // let w = pastWitness_i;
//             // let x = pastStaticAcc_i; 
//             // let acc = pastGlobalAcc_i
//             // (bigInt(w).modPow(x, n)).equals(acc); 
//             // if returns true, then the bitmap was part of accumulator history 
//             //      credential verified, return 
//             // if returns false, bitmap was not part of accumulator history
//             //      credential cannot be verified, return false

//             // if the return false, the credential was not included in bitmap i, verify the correctness of that bitmap 
//             // let checkSubsequentAcc = await checkInclusionGlobal(accInstance, pastStaticAcc_i, i)
//             // if yields false, then bitmap value was not part of the history and possibly forged 
//             // if (checkSubsequentAcc === false) { return false; }
            
//             // if previous returns true, the bitmap is part of global accumulator and thus history 
//         }

//         // check the current bitmap separately since it does not have corresponding static acc yet 
//         [ currentBitmap, hashCount, count, capacity, epoch ]  = await getBitmapData(subAccInstance); 
//         // check the inclusion of the credential in current bitmap 
//         let checkCurrBitmap = await checkInclusionBitmap(subAccInstance, currentBitmap, hashCount, credentialPrime);
//         // console.log("5")
//         // the credential has been revoked 
//         if (checkCurrBitmap === true) { return false; } 
//     }

//     // all the checks passed and credential is valid
//     return true; 
// }


// const { readStaticAccData, readStaticAccProducts } = require("../utilities/product"); 
// var bigInt = require("big-integer");
// var util = require('ethereumjs-util');

// alternative on-chain verification process 
// let arr = readStaticAccData().map(a => a.acc);
// // item as string 
// let pastStaticAcc_i_str = bigInt(pastStaticAcc_i).toString(); 
// // find idex of a static acc for retrieving the product 
// let index = arr.indexOf(pastStaticAcc_i_str);
// // get the product of the item 
// let product = readStaticAccProducts()[index];     
// // get data about accumulator 
// let [ currentAcc, n, g ] = await getGlobalAccData(accInstance);
// // witness for static acc in question 
// let w = bigInt(bigInt(g).modPow(product, n)).toString(); 

// // currently return error because e expects to be bytes32, not bytes memory 
// // possible to modify the onchain code to accept bytes memory instead 
// let checkSubsequentAcc = await accInstance.verifyElement.call(w, pastStaticAcc_i_str);
// console.log("on-chain verification returned:", checkSubsequentAcc); 


module.exports = { revoke, verify }