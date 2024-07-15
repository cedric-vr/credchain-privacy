const { studentMain } = require("./student.js");
const { companyMain } = require("./company.js");

const degreeThresholdTimestamp = "1262304000";  // Unix timestamp: Fri Jan 01 2010 00:00:00
const degreeIssuanceTimestamp = "1500000000";   // Unix timestamp: Fri Jul 14 2017 02:40:00

async function main() {
    const studentData = await studentMain(degreeIssuanceTimestamp, degreeThresholdTimestamp);
    await companyMain(studentData);
}

main();
