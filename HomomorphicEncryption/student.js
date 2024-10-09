const SEAL = require('node-seal');
const fs = require('fs');
const crypto = require("crypto");

async function studentMain(degreeIssuanceTimestamp, setupData) {
    const seal = await SEAL();
    const securityLevel = seal.SecurityLevel.tc128;
    const bitSizeFloat = 40;
    const rand = generateSecureRandomFloat();

    // Load the context with saved parameters
    const parmsFromFile = seal.EncryptionParameters();
    parmsFromFile.load(setupData.parms);

    const context = seal.Context(parmsFromFile, true, securityLevel);

    const publicKeyFromFile = seal.PublicKey();
    publicKeyFromFile.load(context, setupData.publicKey);

    const cDegreeThresholdTimestamp = seal.CipherText();
    cDegreeThresholdTimestamp.load(context, setupData.cipherTextThreshold);

    const evaluator = seal.Evaluator(context);
    const ckksEncoder = seal.CKKSEncoder(context);
    const encryptor = seal.Encryptor(context, publicKeyFromFile);

    const pRand = seal.PlainText();
    ckksEncoder.encode(Float64Array.from([rand]), Math.pow(2, bitSizeFloat), pRand);

    const pDegreeIssuanceTimestamp = seal.PlainText();
    ckksEncoder.encode(Float64Array.from([degreeIssuanceTimestamp]), Math.pow(2, bitSizeFloat), pDegreeIssuanceTimestamp);

    const cDegreeIssuanceTimestamp = seal.CipherText();
    encryptor.encrypt(pDegreeIssuanceTimestamp, cDegreeIssuanceTimestamp);

    const cResultSubtraction = seal.CipherText();
    evaluator.sub(cDegreeThresholdTimestamp, cDegreeIssuanceTimestamp, cResultSubtraction);

    const cResultMultiplication = seal.CipherText();
    evaluator.multiplyPlain(cResultSubtraction, pRand, cResultMultiplication);


    // Create the JSON object
    const studentData = {
        cipherTextResult: cResultMultiplication.save(),
    };

    // Save the results to file
    fs.writeFileSync('./HomomorphicEncryption/studentData.json', JSON.stringify(studentData));

    return studentData;
}

function generateSecureRandomFloat() {
    const magnitudes = [1, 0.1, 0.01, 0.001];  // Define supported magnitudes

    // Randomly choose a magnitude
    const randomMagnitudeIndex = crypto.getRandomValues(new Uint32Array(1))[0] % magnitudes.length;
    const chosenMagnitude = magnitudes[randomMagnitudeIndex];

    // Generate a secure random float between 0 and 1
    const randomBuffer = new Uint32Array(1);
    crypto.getRandomValues(randomBuffer);
    const randomFloat = randomBuffer[0] / (0xFFFFFFFF + 1);

    // Scale the random float by the chosen magnitude
    const scaledFloat = randomFloat * chosenMagnitude;
    return parseFloat(scaledFloat.toFixed(5));
}

module.exports = { studentMain };
