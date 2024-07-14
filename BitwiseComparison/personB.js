const fs = require('fs');
const targetNumber = 1704063601;
console.log({targetNumber});


function sendTargetNumber() {
    console.log("Person B: Sending target number to Person A...", targetNumber);
    fs.writeFileSync('targetNumber.json', JSON.stringify({ targetNumber }), 'utf8');
}

function verifyProof() {
    const data = fs.readFileSync('proof.json', 'utf8');
    const { proof } = JSON.parse(data);
    console.log("Person B: Received proof from Person A...", proof);

    console.log("Person B: Bitwise AND Result: " + proof);

    if (proof < targetNumber) {
        console.log("Person B: The chosen number is less than 2024.");
    } else {
        console.log("Person B: The chosen number is NOT less than 2024.");
    }
}

module.exports = { sendTargetNumber, verifyProof };


