const SEAL = require('node-seal');
const fs = require('fs');

async function companySetup(degreeThresholdTimestamp) {
    const seal = await SEAL();
    const schemeType = seal.SchemeType.ckks;
    const securityLevel = seal.SecurityLevel.tc128;
    const polyModulusDegree = 8192;
    const bitSizes = [60,20,20,20,20,60];
    const bitSizeFloat = 40;

    const parms = seal.EncryptionParameters(schemeType);
    parms.setPolyModulusDegree(polyModulusDegree);
    parms.setCoeffModulus(seal.CoeffModulus.Create(polyModulusDegree, Int32Array.from(bitSizes)));

    const context = seal.Context(parms, true, securityLevel);
    if (!context.parametersSet()) {
        throw new Error('Could not set the parameters in the given context. Please try different encryption parameters.');
    }

    const keyGenerator = seal.KeyGenerator(context);
    const secretKey = keyGenerator.secretKey();
    const publicKey = keyGenerator.createPublicKey();

    const ckksEncoder = seal.CKKSEncoder(context);
    const encryptor = seal.Encryptor(context, publicKey);


    // Encode number
    const pDegreeThresholdTimestamp = seal.PlainText();
    ckksEncoder.encode(Float64Array.from([degreeThresholdTimestamp]), Math.pow(2, bitSizeFloat), pDegreeThresholdTimestamp);

    // Encrypt PlainText
    const cDegreeThresholdTimestamp = seal.CipherText();
    encryptor.encrypt(pDegreeThresholdTimestamp, cDegreeThresholdTimestamp);


    // Create the JSON objects
    const companySetupData = {
        parms: parms.save(),
        publicKey: publicKey.save(),
        cipherTextThreshold: cDegreeThresholdTimestamp.save(),
    };

    const companySecretKey = {
        secretKey: secretKey.save()
    }

    // Save the results to file
    fs.writeFileSync('./HomomorphicEncryption/companySetupData.json', JSON.stringify(companySetupData));
    fs.writeFileSync('./HomomorphicEncryption/companySecretKey.json', JSON.stringify(companySecretKey));

    return { companySetupData, companySecretKey };
}

async function companyMain(studentData, setupData, sk) {
    const seal = await SEAL();
    const securityLevel = seal.SecurityLevel.tc128;

    try {
        // Load the context with saved parameters
        const parmsFromFile = seal.EncryptionParameters();
        parmsFromFile.load(setupData.parms);

        const context = seal.Context(parmsFromFile, true, securityLevel);

        const publicKey = seal.PublicKey();
        publicKey.load(context, setupData.publicKey);

        const secretKey = seal.SecretKey();
        secretKey.load(context, sk.secretKey);

        const decryptor = seal.Decryptor(context, secretKey);
        const ckksEncoder = seal.CKKSEncoder(context);

        const cResultStudent = seal.CipherText();
        cResultStudent.load(context, studentData.cipherTextResult);

        const pResultStudent = seal.PlainText();
        decryptor.decrypt(cResultStudent, pResultStudent);

        const resultStudent = ckksEncoder.decode(pResultStudent);
        console.log("\tDecoded Result:", resultStudent[0]);

        const result = parseFloat(resultStudent[0]);
        if (result <= 0) {
            console.log("\tVALID Issuance Date");
            return true;
        } else {
            console.log("\tINVALID Issuance Date");
            return false;
        }

    } catch (error) {
        console.log("\tIncompatible encryption parameters or ciphertext format:", error.message);
        console.log("\tTAMPERED DATA");
        return false
    }

}

module.exports = { companyMain, companySetup };
