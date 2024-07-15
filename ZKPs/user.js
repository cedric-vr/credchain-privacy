const util = require("util");
const fs = require('fs');

async function generateZKP(degreeIssuanceTimestamp, degreeThresholdTimestamp) {
    let { initialize } = await import("zokrates-js");
    // Initialize ZoKrates
    const zokratesProvider = await initialize();

    // Compile ZoKrates program
    const source = `
        def main(private field degreeYear, field thresholdYear) -> bool {
            field lower_bound = 0;
        
            bool is_valid = (degreeYear >= lower_bound) && (degreeYear > thresholdYear);
            return is_valid;
        }
    `;
    const artifacts = zokratesProvider.compile(source);

    // Setup phase
    const keypair = zokratesProvider.setup(artifacts.program);

    // Compute witness
    const { witness } = zokratesProvider.computeWitness(artifacts, [degreeIssuanceTimestamp, degreeThresholdTimestamp]);
    console.log('Witness output (is_valid):', witness);

    // Generate proof
    const proof = zokratesProvider.generateProof(artifacts.program, witness, keypair.pk);

    // Save proof and verification key to a file
    fs.writeFileSync('proof.json', JSON.stringify(proof));
    fs.writeFileSync('verification_key.json', JSON.stringify(keypair.vk));

    console.log('Proof generated and saved to proof.json');
    console.log('Verification key saved to verification_key.json');

    return { proof, vk: keypair.vk };

}

module.exports = { generateZKP };
