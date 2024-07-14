const fs = require('fs');
const chosenNumber = 1720817636;
console.log({chosenNumber});


function proveNumberLessThan() {
    const data = fs.readFileSync('targetNumber.json', 'utf8');
    const { targetNumber } = JSON.parse(data);

    // Return the result of the bitwise AND operation
    return chosenNumber & targetNumber;
}

function sendProof() {
    const data = fs.readFileSync('targetNumber.json', 'utf8');
    const { targetNumber } = JSON.parse(data);
    console.log("Person A: Received target number from Person B...", targetNumber);

    const proof = proveNumberLessThan();
    console.log("Person A: Sending proof to Person B...", proof);
    fs.writeFileSync('proof.json', JSON.stringify({ proof }), 'utf8');
    return proof;
}

module.exports = { sendProof };