// var Web3 = require('web3');

var crypto = require('crypto');
var util = require('ethereumjs-util');

async function generateCredential(holderInfo, issuerAccount, holderAccount, issuerPrivateKey) {

    // Unique credential ID is the hash of time and issuer account
    // var now = new Date();
    // var sha256 = crypto.createHash('sha256');
    // var credentialID = sha256.update(issuerAccount + now);
    // credentialID = sha256.digest('hex');
    // console.log("one:", credentialID);  

    let now = new Date(); 
    let credentialID = web3.utils.sha3(issuerAccount + now); 

    // Create the credential. Whatever the id repo query responded with is now the claim.
    var credential = {
        "id": credentialID, 
        "holder": holderAccount,
        "issuer": issuerAccount, 
        "created": now.toLocaleDateString(),
        "claim": holderInfo, 
    };

    // Generate the credential hash
    // var credentialHash = JSON.stringify(holderInfo);
    // credentialHash = util.sha256(credentialHash);

    // Generate the signature
    // issuerPrivateKey = util.toBuffer(issuerPrivateKey);
    // var sig = util.ecsign(credentialHash, issuerPrivateKey);

    // the previous did not work, replaced with using web3 utilities sha and sign 
    let credentialHash = JSON.stringify(holderInfo);
    credentialHash = web3.utils.sha3(credentialHash); 
    let sig = web3.eth.sign(credentialHash, issuerPrivateKey); 
    
    //sig = JSON.stringify(sig);
    //credentialHash = util.bufferToHex(credentialHash);

    return [credential, credentialHash, sig];
}


module.exports = { generateCredential }