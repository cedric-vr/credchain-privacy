const SEAL = require('node-seal');
const fs = require('fs');

async function companySetup(degreeThresholdTimestamp) {
    const seal = await SEAL();
    const schemeType = seal.SchemeType.bfv;
    const securityLevel = seal.SecurityLevel.tc128;
    const polyModulusDegree = 4096;
    const bitSizes = [36, 36, 37];
    const bitSize = 20;

    const parms = seal.EncryptionParameters(schemeType);

    // Set the PolyModulusDegree
    parms.setPolyModulusDegree(polyModulusDegree);

    // Create a suitable set of CoeffModulus primes
    parms.setCoeffModulus(seal.CoeffModulus.Create(polyModulusDegree, Int32Array.from(bitSizes)));

    // Set the PlainModulus to a prime of bitSize 20.
    parms.setPlainModulus(seal.PlainModulus.Batching(polyModulusDegree, bitSize));

    const context = seal.Context(parms,   // Encryption Parameters
        true,                       // ExpandModChain
        securityLevel                             // Enforce security level
    );

    if (!context.parametersSet()) {
        throw new Error("Could not set the parameters in the given context. Please try different encryption parameters.")
    }

    const encoder = seal.BatchEncoder(context);
    const keyGenerator = seal.KeyGenerator(context);
    const publicKey = keyGenerator.createPublicKey();
    const encryptor = seal.Encryptor(context, publicKey);

    // Encode the numbers
    const plainText = encoder.encode(Int32Array.from([degreeThresholdTimestamp]));

    // Encrypt the PlainTexts
    const cipherText = encryptor.encrypt(plainText);

    // Create the JSON object
    const companySetupData = {
        parms: parms.save(),
        publicKey: publicKey.save(),
        cipherTextThreshold: cipherText.save(),
    };

    return companySetupData;
}

async function companyMain(studentData, setupData) {
    const seal = await SEAL();
    const securityLevel = seal.SecurityLevel.tc128;

    // Load the context with saved parameters
    const parmsFromFile = seal.EncryptionParameters();
    parmsFromFile.load(setupData.parms);

    const context = seal.Context(parmsFromFile, true, securityLevel);

    const publicKey = seal.PublicKey();
    publicKey.load(context, setupData.publicKey);

    const cipherTextThresholdDate = seal.CipherText();
    cipherTextThresholdDate.load(context, setupData.cipherTextThreshold);

    const cipherTextIssuanceDateStudent = seal.CipherText();
    cipherTextIssuanceDateStudent.load(context, studentData.cipherTextIssuanceDate);

    const cipherTextResultStudent = seal.CipherText();
    try {
        cipherTextResultStudent.load(context, studentData.cipherTextResult);
    } catch (error) {
        // Error occurs for "wrong" format, meaning if the result has been altered
        console.log("\tIncompatible cipher text format.");
        return false;
    }

    // Company performs the same computation
    const evaluator = seal.Evaluator(context);
    const cipherTextResult = seal.CipherText();
    evaluator.sub(cipherTextThresholdDate, cipherTextIssuanceDateStudent, cipherTextResult);

    // Convert ciphertexts to strings for comparison
    const companyResultString = cipherTextResult.save();
    const studentResultString = cipherTextResultStudent.save();

    // Compare the company's computed encrypted result with the student's encrypted result
    const isResultValid = companyResultString === studentResultString;

    if (isResultValid) {
        console.log("\tEncrypted results identical");
    } else {
        console.log("\tEncrypted results NOT identical");
    }

    return isResultValid;
}

module.exports = { companyMain, companySetup };
