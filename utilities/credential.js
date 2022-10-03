// var Web3 = require('web3');

var crypto = require('crypto');
var util = require('ethereumjs-util');

async function generateCredential(holderInfo, holderAccount, issuerAccount, issuerPrivateKey, epoch) {

    let now = new Date(); 
    let credentialID = web3.utils.sha3(issuerAccount + now); 

    // Create the credential. Whatever the id repo query responded with is now the claim.
    var credential = {
        "id": credentialID, 
        "holder": holderAccount,
        "issuer": issuerAccount, 
        "created": now.toLocaleDateString(),
        "epoch": epoch, 
        "claim": holderInfo, 
    };

    // the previous did not work, replaced with using web3 utilities sha and sign 
    let credentialHash = JSON.stringify(holderInfo);
    credentialHash = web3.utils.sha3(credentialHash); 
    let sig = web3.eth.sign(credentialHash, issuerPrivateKey); 

    return [ credential, credentialHash, sig ];
}


module.exports = { generateCredential }