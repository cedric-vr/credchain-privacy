const fs = require('fs');
const { ethers } = require('ethers');
const path = require('path');

const ETH_PRICE_IN_USD = 3200;  // Price of 1 ETH in USD
const GAS_PRICE_GWEI = 20;      // Default gas price in Gwei
const storeOnChain = false;

const paths = [
    './HomomorphicEncryption/companySetupData.json',
    './HomomorphicEncryption/studentData.json',
    './ZKP/verificationKey.json',
    './ZKP/proof.json'
]

/**
 * Reads a JSON file from the given path and estimates the gas required
 * to store its data on the Ethereum blockchain.
 *
 * @param {string} filePath - Path to the JSON file
 * @param {number} [ethPriceInUsd=ETH_PRICE_IN_USD] - Current price of ETH in USD
 * @param {number} [gasPriceGwei=GAS_PRICE_GWEI] - Gas price in Gwei
 * @param {boolean} [storeOnChain=false] - Whether to include storage costs
 */
function estimateGas(filePath, ethPriceInUsd = ETH_PRICE_IN_USD, gasPriceGwei = GAS_PRICE_GWEI, storeOnChain = false) {
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
        const gasPerNonZeroByte = 68;
        const gasPerZeroByte = 4;

        let gasForData = 0;
        for (const char of dataString) {
            if (char === '0') {
                gasForData += gasPerZeroByte;
            } else {
                gasForData += gasPerNonZeroByte;
            }
        }

        const storageCostPerSlot = 20000; // Example cost for writing to a storage slot
        const numberOfStorageSlots = Math.ceil(dataSizeBytes / 32); // Assume data is stored in 32-byte slots
        if (storeOnChain) {
            totalGas = baseTransactionCost + gasForData + (storageCostPerSlot * numberOfStorageSlots);
        } else {
            totalGas = baseTransactionCost + gasForData;
        }

        // Convert gas price from Gwei to ETH
        const gasPriceEth = ethers.parseUnits(gasPriceGwei.toString(), 'gwei');

        // Calculate gas cost in ETH and USD
        const gasCostEth = gasPriceEth * BigInt(totalGas);
        const gasCostUsd = parseFloat(ethers.formatUnits(gasCostEth, 'ether')) * ethPriceInUsd;

        console.log("==========================================================")
        console.log(`File name: ${displayPath}`);
        console.log(`Data size: ${dataSizeKilobytes.toFixed(2)} KB (${dataSizeBytes} bytes)`);

        console.log(`Estimated Gas Used: ${totalGas} gas`);
        console.log(`Estimated Gas Cost: ${ethers.formatUnits(gasCostEth, 'ether')} ETH`);
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
}

runEstimations();
