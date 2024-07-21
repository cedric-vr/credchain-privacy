const SEAL = require('node-seal');
const fs = require('fs');

async function companyMain(data) {
    const seal = await SEAL();
    const securityLevel = seal.SecurityLevel.tc128;

    // Load the context with saved parameters
    const parmsFromFile = seal.EncryptionParameters();
    parmsFromFile.load(data.parms);

    const contextFromFile = seal.Context(parmsFromFile, true, securityLevel);

    const publicKeyFromFile = seal.PublicKey();
    publicKeyFromFile.load(contextFromFile, data.publicKey);

    const cipherTextAFromFile = seal.CipherText();
    cipherTextAFromFile.load(contextFromFile, data.cipherTextA);

    const cipherTextBFromFile = seal.CipherText();
    cipherTextBFromFile.load(contextFromFile, data.cipherTextB);

    const cipherTextResultFromFile = seal.CipherText();
    try {
        cipherTextResultFromFile.load(contextFromFile, data.cipherTextResult);
    } catch (error) {
        // Error occurs for "wrong" format, meaning if the result has been altered
        console.log("Encrypted results NOT identical");
        return false;
    }

    // Company performs the same computation
    const evaluatorFromFile = seal.Evaluator(contextFromFile);
    const cipherTextResult = seal.CipherText();
    evaluatorFromFile.sub(cipherTextBFromFile, cipherTextAFromFile, cipherTextResult);

    // Convert ciphertexts to strings for comparison
    const companyResultString = cipherTextResult.save();
    const studentResultString = cipherTextResultFromFile.save();

    // Compare the company's computed encrypted result with the student's encrypted result
    const isResultValid = companyResultString === studentResultString;

    if (isResultValid) {
        console.log("Encrypted results identical");
    } else {
        console.log("Encrypted results NOT identical");
    }

    return isResultValid;
}

module.exports = { companyMain };
