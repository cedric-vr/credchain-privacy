const fs = require('fs');
const { ethers } = require('ethers');
const path = require('path');

// Default values
let ETH_PRICE_IN_USD = 2600;  // Default price of 1 ETH in USD
let GAS_PRICE_GWEI = 4;       // Default gas price in Gwei
let storeOnChain = false;     // Default

// Get command-line arguments
const args = process.argv.slice(2);

// Parse command-line arguments
args.forEach(arg => {
    if (arg.startsWith('--ethPrice=')) {
        ETH_PRICE_IN_USD = parseFloat(arg.split('=')[1]);
    } else if (arg.startsWith('--gasPriceGwei=')) {
        GAS_PRICE_GWEI = parseFloat(arg.split('=')[1]);
    } else if (arg === '--storeOnChain') {
        storeOnChain = true;
    }
});

// Paths to JSON files
const paths = [
    './HomomorphicEncryption/companySetupData.json',
    './HomomorphicEncryption/studentData.json',
    './ZKP/verificationKey.json',
    './ZKP/proof.json'
];

/**
 * Reads a JSON file from the given path and estimates the gas required
 * to store its data on the Ethereum blockchain.
 *
 * @param {string} filePath - Path to the JSON file
 * @param {number} ethPriceInUsd - Current price of ETH in USD
 * @param {number} gasPriceGwei - Gas price in Gwei
 * @param {boolean} storeOnChain - Whether to include storage costs
 */
function estimateGas(filePath, ethPriceInUsd, gasPriceGwei, storeOnChain) {
    try {
        // Resolve the absolute path
        const absolutePath = path.resolve(filePath);

        // Extract the filename and the last folder name
        const fileName = path.basename(absolutePath);
        const lastFolder = path.basename(path.dirname(absolutePath));
        const displayPath = path.join(lastFolder, fileName);

        // Read the file
        const fileContent = fs.readFileSync(absolutePath, 'utf-8');
        const jsonData = JSON.parse(fileContent);

        // Convert JSON data to a string and calculate its size
        const dataString = JSON.stringify(jsonData);
        const dataSizeBytes = Buffer.byteLength(dataString, 'utf-8');
        const dataSizeKilobytes = dataSizeBytes / 1024;

        // Estimate gas required
        let totalGas;
        const baseTransactionCost = 21000;
        const gasPerNonZeroByte = 16;
        const gasPerZeroByte = 4;
        const sLoadGasCost = 2100;

        let gasForData = 0;
        for (const char of dataString) {
            if (char === '0') {
                gasForData += gasPerZeroByte;
            } else {
                gasForData += gasPerNonZeroByte;
            }
        }

        const storageCostPerSlot = 20000; // Cost for writing to a storage slot
        const numberOfStorageSlots = Math.ceil(dataSizeBytes / 32); // Data is stored in 32-byte slots
        if (storeOnChain) {
            totalGas = baseTransactionCost + gasForData + numberOfStorageSlots * (storageCostPerSlot + sLoadGasCost);
        } else {
            totalGas = baseTransactionCost + gasForData;
        }

        // Convert gas price from Gwei to ETH
        const gasPriceEth = ethers.utils.parseUnits(gasPriceGwei.toString(), 'gwei');

        // Calculate gas cost in ETH and USD
        const gasCostEth = gasPriceEth.mul(ethers.BigNumber.from(totalGas));
        const gasCostUsd = parseFloat(ethers.utils.formatUnits(gasCostEth, 'ether')) * ethPriceInUsd;

        console.log("==========================================================")
        console.log(`File name: ${displayPath}`);
        console.log(`Data size: ${dataSizeKilobytes.toFixed(2)} KB (${dataSizeBytes} bytes)`);

        console.log(`Estimated Gas Used: ${totalGas} gas`);
        console.log(`Estimated Gas Cost: ${ethers.utils.formatUnits(gasCostEth, 'ether')} ETH`);
        console.log(`Estimated Gas Cost in USD: $${gasCostUsd.toFixed(2)}\n`);

    } catch (error) {
        console.error('Error estimating gas:', error);
    }
}

async function runEstimations() {
    for (const path of paths) {
        await estimateGas(path, ETH_PRICE_IN_USD, GAS_PRICE_GWEI, storeOnChain);
        await new Promise(r => setTimeout(r, 300));  // Delay to ensure proper logging
    }

    console.log("==========================================================")
    console.log("==========================================================")
    console.log("Calculations with");
    console.log("ETH Price (USD):", ETH_PRICE_IN_USD);
    console.log("Gas Price (Gwei):", GAS_PRICE_GWEI);
    console.log("Store On Chain:", storeOnChain);
}

runEstimations();
