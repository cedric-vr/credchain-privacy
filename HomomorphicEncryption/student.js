const SEAL = require('node-seal');
const fs = require('fs');

async function studentMain(degreeIssuanceTimestamp, setupData) {
    const seal = await SEAL();
    const securityLevel = seal.SecurityLevel.tc128;

    // Load the context with saved parameters
    const parmsFromFile = seal.EncryptionParameters();
    parmsFromFile.load(setupData.parms);

    const contextFromFile = seal.Context(parmsFromFile, true, securityLevel);

    const publicKeyFromFile = seal.PublicKey();
    publicKeyFromFile.load(contextFromFile, setupData.publicKey);

    const cipherTextFromFile = seal.CipherText();
    cipherTextFromFile.load(contextFromFile, setupData.cipherTextThreshold);

    const encoder = seal.BatchEncoder(contextFromFile);
    const encryptor = seal.Encryptor(contextFromFile, publicKeyFromFile);
    const evaluator = seal.Evaluator(contextFromFile);

    // Encode the numbers
    const plainText = encoder.encode(Int32Array.from([degreeIssuanceTimestamp]));

    // Encrypt the PlainTexts
    const cipherText = encryptor.encrypt(plainText);

    // Subtract A from B and store it in cipherTextResult
    const cipherTextResult = seal.CipherText();
    evaluator.sub(cipherTextFromFile, cipherText, cipherTextResult);

    // Create the JSON object
    const studentData = {
        cipherTextIssuanceDate: cipherText.save(),
        cipherTextResult: cipherTextResult.save()
    };

    // Save the results to file
    // fs.writeFileSync('./HomomorphicEncryption/studentData.json', JSON.stringify(studentData));

    return studentData;
}

module.exports = { studentMain };
