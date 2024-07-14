const targetNumber = Math.floor(Date.now() / 1000);
console.log("Target Number:\t\t" + targetNumber);

const chosenNumber = 1687263332;
console.log("Chosen Number:\t\t" + chosenNumber);

// Function to prove that the number chosen by Person A is less than the given number (2024)
function proveNumberLessThan2024(chosenNumber) {
    // Perform bitwise AND operation
    return chosenNumber & targetNumber;
}

// Prove that the chosen number is less than 2024
const proof = proveNumberLessThan2024(chosenNumber);

console.log("Bitwise AND Result:\t" + proof);

// Person B checks the proof
if (proof < chosenNumber) {
    console.log("The chosen number is smaller than", targetNumber);
} else {
    console.log("The chosen number is LARGER than", targetNumber);
}
/*

// -----------------------------------------------------------------

// Function to get all potential values for a given bitwise AND result (proof)
function getPossibleValues(proof) {
    const potentialValues = [];

    // Generate all potential numbers by setting the bits of targetNumber that are 0
    const zeroBitPositions = [];
    for (let i = 0; i < 32; i++) {
        if ((targetNumber & (1 << i)) === 0) {
            zeroBitPositions.push(i);
        }
    }

    const numCombinations = 1 << zeroBitPositions.length;
    for (let i = 0; i < numCombinations; i++) {
        let potentialValue = proof;
        for (let j = 0; j < zeroBitPositions.length; j++) {
            if ((i & (1 << j)) !== 0) {
                potentialValue |= (1 << zeroBitPositions[j]);
            }
        }
        if (potentialValue >= 0) {
            potentialValues.push(potentialValue);
        }    }

    return potentialValues;
}
possibleValues = getPossibleValues(proof);
console.log("Possible Values:", possibleValues);
// console.table(possibleValues)
console.log("MIN:", possibleValues[0]);
console.log("MAX:", possibleValues[possibleValues.length - 1]);
console.log("Amount:", possibleValues.length);
*/

// ---------------------------------------------------------------------------





const fs = require('fs');
const path = require('path');

// Function to run the check for all numbers in the specified range
function checkNumbersInRange(start, end) {
    const invalidNumbers = [];

    for (let chosenNumber = start; chosenNumber <= end; chosenNumber++) {
        const proof = proveNumberLessThan2024(chosenNumber);
        if (proof >= chosenNumber) {
            invalidNumbers.push(chosenNumber);
        }
    }

    return invalidNumbers;
}

// Function to convert Unix timestamp to human-readable date
function convertTimestampToDate(unixTimestamp) {
    const date = new Date(unixTimestamp * 1000); // Convert to milliseconds
    return date.toISOString(); // Convert to ISO string format
}

// Function to generate CSV from the invalid numbers
function generateCSV(invalidNumbers) {
    let csvContent = "Unix Timestamp,Date\n"; // CSV header

    invalidNumbers.forEach(unixTimestamp => {
        const date = convertTimestampToDate(unixTimestamp);
        csvContent += `${unixTimestamp},${date}\n`;
    });

    return csvContent;
}

// Define the range
const startTimestamp = 0; // Unix timestamp for 1970-01-01
const endTimestamp = targetNumber; // Unix timestamp for NOW

// Run the check and output the result
const invalidNumbers = checkNumbersInRange(startTimestamp, endTimestamp);
console.log("Invalid Numbers Count:", invalidNumbers.length);

// Generate CSV content
const csvContent = generateCSV(invalidNumbers);

// Write CSV content to a file
const filePath = path.join(__dirname, 'InvalidDates.csv');
fs.writeFileSync(filePath, csvContent, 'utf8');

const chanceOfFalseNumber = (100 / targetNumber * invalidNumbers.length).toFixed(5);
console.log("Chance of false number: " + chanceOfFalseNumber + "%");

console.log(`CSV file created at ${filePath}`);
