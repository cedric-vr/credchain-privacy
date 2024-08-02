const fs = require('fs');

async function verifyZKP(proof, vk) {
    const { initialize } = await import("zokrates-js");

    // Initialize ZoKrates
    const zokratesProvider = await initialize();

    // Verify proof
    const isVerified = zokratesProvider.verify(vk, proof);

    // console.log('Proof:', proof);
    // console.log('Is the proof valid?', isVerified);

    // Interpret the result based on the inputs
    const result = proof.inputs[1];
    if (result === '0x0000000000000000000000000000000000000000000000000000000000000001') {
        console.log('\tThe Issuance Date is after the Threshold Date.');
    } else if (result === '0x0000000000000000000000000000000000000000000000000000000000000000') {
        console.log('\tThe Issuance Date is before the Threshold Date and therefore INVALID.');
    } else {
        console.log('\tUnexpected result in proof inputs.');
        return false;
    }

    return isVerified;
}

module.exports = { verifyZKP };
