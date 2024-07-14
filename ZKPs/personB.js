const fs = require('fs');

async function verifyProof() {
    let { initialize } = await import("zokrates-js");

    // Initialize ZoKrates
    const zokratesProvider = await initialize();

    // Load proof and verification key from files
    const proof = JSON.parse(fs.readFileSync('proof.json'));
    const vk = JSON.parse(fs.readFileSync('verification_key.json'));

    // Verify proof
    const isVerified = zokratesProvider.verify(vk, proof);

    console.log('Proof:', proof);
    console.log('Is the proof valid?', isVerified);
}

verifyProof().catch(console.error);
