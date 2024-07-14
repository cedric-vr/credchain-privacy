const { sendProof } = require('./personA');

const { sendTargetNumber, verifyProof } = require('./personB');


// Person B sends the target number to Person A
sendTargetNumber();

// Person A creates the proof with the bitwise AND operation and sends it to Person B
sendProof();

// Person B verifies the proof
verifyProof();


