const { studentMain } = require("./student.js");
const { companyMain } = require("./company.js");

const degreeThresholdTimestamp = "1262304000";  // Unix timestamp: Fri Jan 01 2010 00:00:00
const degreeIssuanceTimestamp = "1500000000";   // Unix timestamp: Fri Jul 14 2017 02:40:00

async function main() {
    const pidusage = require('pidusage');
    const { performance, PerformanceObserver } = require('perf_hooks');

    // Measure time
    const obs = new PerformanceObserver((items) => {
        console.log(`Duration: ${items.getEntries()[0].duration} ms`);
        performance.clearMarks();
    });
    obs.observe({ entryTypes: ['measure'] });

    // Start time measurement
    performance.mark('start');

    const studentData = await studentMain(degreeIssuanceTimestamp, degreeThresholdTimestamp);
    const validIssuanceTimestamp = await companyMain(studentData);
    console.log("Valid Degree Issuance Timestamp:", validIssuanceTimestamp);

    // End time measurement
    performance.mark('end');
    performance.measure('Duration', 'start', 'end');

    // Measure CPU and memory usage
    pidusage(process.pid, (err, stats) => {
        if (!err) {
            console.log(`CPU: ${stats.cpu}%`);
            console.log(`Memory: ${stats.memory / 1024 / 1024}MB`);
        }
    });

}

main().catch(console.error);

