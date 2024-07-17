async function companyMain(data) {
    const SEAL = require('node-seal')
    const fs = require('fs');

    const seal = await SEAL();
    const securityLevel = seal.SecurityLevel.tc128;

    // Read out data from .json
    // const data = JSON.parse(fs.readFileSync('studentData.json'));

    // Load the context with saved parameters
    const parmsFromFile = seal.EncryptionParameters();
    parmsFromFile.load(data.parms);

    const contextFromFile = seal.Context(parmsFromFile, true, securityLevel);

    const publicKeyFromFile = seal.PublicKey();
    publicKeyFromFile.load(contextFromFile, data.publicKey);

    const secretKeyFromFile = seal.SecretKey();
    secretKeyFromFile.load(contextFromFile, data.secretKey);

    const cipherTextResultFromFile = seal.CipherText();
    cipherTextResultFromFile.load(contextFromFile, data.cipherTextResult);

    const decryptorFromFile = seal.Decryptor(contextFromFile, secretKeyFromFile);
    const encoderFromFile = seal.BatchEncoder(contextFromFile);

    // Decrypt the CipherText Result
    const decryptedPlainTextResultFromFile = decryptorFromFile.decrypt(cipherTextResultFromFile);

    // Decode the PlainText Result
    const decodedArrayResultFromFile = encoderFromFile.decode(decryptedPlainTextResultFromFile);
    // console.log('Decoded result from file:', decodedArrayResultFromFile[0]);

    if (decodedArrayResultFromFile[0] > 0) {
        console.log("INVALID Issuance Date");
        return false;
    } else {
        console.log("valid Issuance Date");
        return true;
    }

}

module.exports = {companyMain};