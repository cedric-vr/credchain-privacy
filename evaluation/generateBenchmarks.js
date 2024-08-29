const { ZKP_performance } = require("../ZKP/ZKPperformance");
const { HE_performance } = require("../HomomorphicEncryption/HEperformance");

async function main() {
    // Get the number of runs from command-line arguments
    const args = process.argv.slice(2); // Get all arguments after the first two (node and script path)
    const runs = parseInt(args[0], 10); // Parse the first argument as an integer

    // Use 10 as the default value if no valid argument is provided
    const numberOfRuns = isNaN(runs) ? 50 : runs;

    await ZKP_performance(numberOfRuns);
    console.log("\n==================================================");
    await HE_performance(numberOfRuns);
}

main();
