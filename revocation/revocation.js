
const { addToBitmap, getBitmapData, getStaticAccData, checkInclusionBitmap, verifyBitmap } = require("../utilities/bitmap");
const { hashToPrime } = require("../utilities/accumulator");

// issuer function 
async function revoke(credential, subAccInstance, accInstance, issuer) {
    // credential is represented by a prime and stored at the local device of user, computed once the credential issued
    // issuer does not know prime, so it is computed before revocation 
    let [ credentialPrime, nonce ] = hashToPrime(credential, 128, 0n); 
    // when issuer revokes a credential, it is always added to the bitmap, issuer does not know which one 
    await addToBitmap(subAccInstance, accInstance, credentialPrime, issuer); 
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
        if (checkRelatedBitmap === true) { 
            // verify bitmap 
            let verifyBitmapRevoked = await verifyBitmap(accInstance, epoch); 
            // if the bitmap is true history, then credential was revoked 
            if (verifyBitmapRevoked === true) { return false; }
            // otherwise, the bitmap cannot be trusted and need to return something else - undefined ?? 
        } 

        // check if the issuance bitmap was in fact part of history 
        let checkBitmapInclusion = await verifyBitmap(accInstance, epoch); 
        // proof failed, cannot trust this bitmap 
        if (checkBitmapInclusion === false) { return false; } 

        // if the previous check returns true, the static acc is a member of global acc and can be trusted 
        // check the subsequent bitmaps for credential exclusion and verify their membership in global acc 
        for (let i = epoch + 1; i < currentEpoch.toNumber(); i++) {
            // check all the bitmaps up to the current as its a special case to verify 
            // retrieve bitmap and static acc for the epoch i 
            let [ pastBitmap_i, pastStaticAcc_i ] = await getStaticAccData(accInstance, i); 

            // check the inclusion of the credential in that bitmap in epoch i 
            let checkSubsequent = await checkInclusionBitmap(subAccInstance, pastBitmap_i, hashCount, credentialPrime);
            // console.log("2", checkSubsequent); 
            // if the inclusion check return true, then credential has been revoked in subsequent epoch i 
            if (checkSubsequent === true) { return false; }
            // alternative on-chain verifiaction goes here instead of next few lines 
            // alternative verify bitmap value in the past accumulator 
            
            //  check if the bitmap was in fact part of history 
            let checkBitmapInclusionSub = await verifyBitmap(accInstance, i); 
            // proof failed, cannot trust this bitmap 
            if (checkBitmapInclusionSub === false) { return false; } 
            
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

module.exports = { revoke, verify }