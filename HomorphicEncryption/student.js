async function studentMain(degreeIssuanceTimestamp, degreeThresholdTimestamp) {
    const SEAL = require('node-seal');
    const fs = require('fs');

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

    const context = seal.Context(parms, // Encryption Parameters
        true, // ExpandModChain
        securityLevel // Enforce a security level
    );

    if (!context.parametersSet()) {
        throw new Error('Could not set the parameters in the given context. Please try different encryption parameters.')
    }

    const encoder = seal.BatchEncoder(context);
    const keyGenerator = seal.KeyGenerator(context);
    const publicKey = keyGenerator.createPublicKey();
    const secretKey = keyGenerator.secretKey();
    const encryptor = seal.Encryptor(context, publicKey);
    const evaluator = seal.Evaluator(context);

    // Encode the numbers
    const plainTextA = encoder.encode(Int32Array.from([degreeIssuanceTimestamp]));
    const plainTextB = encoder.encode(Int32Array.from([degreeThresholdTimestamp]));

    // Encrypt the PlainTexts
    const cipherTextA = encryptor.encrypt(plainTextA);
    const cipherTextB = encryptor.encrypt(plainTextB);

    // Subtract A from B and store it in cipherTextResult
    const cipherTextResult = seal.CipherText();
    evaluator.sub(cipherTextB, cipherTextA, cipherTextResult);

    // Save the results
    fs.writeFileSync('studentData.json', JSON.stringify({
        parms: parms.save(),
        publicKey: publicKey.save(),
        secretKey: secretKey.save(),
        cipherTextResult: cipherTextResult.save()
    }));

    console.log("File written");


}

module.exports = {studentMain};
