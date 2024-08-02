const fs = require('fs');

async function generateZKP(degreeIssuanceTimestamp, degreeThresholdTimestamp) {
    let { initialize } = await import("zokrates-js");
    // Initialize ZoKrates
    const zokratesProvider = await initialize();

    // Compile ZoKrates program
    const source = `
        def main(private field degreeTimestamp, field thresholdTimestamp) -> bool {
            return degreeTimestamp > thresholdTimestamp;
        }
    `;
    const artifacts = zokratesProvider.compile(source);

    // Setup phase
    const keypair = zokratesProvider.setup(artifacts.program);
    // console.log(keypair);

    // Compute witness
    const { witness } = zokratesProvider.computeWitness(artifacts, [degreeIssuanceTimestamp, degreeThresholdTimestamp]);
    // console.log('Witness output (is_valid):', witness);

    // Generate proof
    const proof = zokratesProvider.generateProof(artifacts.program, witness, keypair.pk);

    // Save proof and verification key to a file
    fs.writeFileSync('proof.json', JSON.stringify(proof));
    fs.writeFileSync('verification_key.json', JSON.stringify(keypair.vk));

    // console.log('Proof generated and saved to proof.json');
    // console.log('Verification key saved to verification_key.json');

    return { proof, vk: keypair.vk };

}

module.exports = { generateZKP };
