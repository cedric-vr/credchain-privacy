const { studentMain } = require("./student.js");
const { companyMain } = require("./company.js");
const pidusage = require('pidusage');
const { performance, PerformanceObserver } = require('perf_hooks');
const fs = require('fs');

const degreeThresholdTimestamp = 1262304000;  // Unix timestamp: Fri Jan 01 2010 00:00:00
const degreeIssuanceTimestamp = 1500000000;   // Unix timestamp: Fri Jul 14 2017 02:40:00

const cpuMaxGHz = 4.2; // Maximum clock speed in GHz

async function main() {
    // Set up performance observer
    const obs = new PerformanceObserver((items) => {
        console.log(`Duration: ${items.getEntries()[0].duration} ms`);
        performance.clearMarks();
    });
    obs.observe({ entryTypes: ['measure'] });

    const start = Date.now();
    while (Date.now() - start < 1000) {
        // Busy-wait for 1 second in order to get CPU measurement results
    }

    // Measure initial CPU and memory usage
    let initialStats = await pidusage(process.pid);

    // Start time measurement
    performance.mark('start');

    // Run the functions
    const studentData = await studentMain(degreeIssuanceTimestamp, degreeThresholdTimestamp);
    const validIssuanceTimestamp = await companyMain(studentData);
    console.log("Valid Degree Issuance Timestamp:", validIssuanceTimestamp);

    // End time measurement
    performance.mark('end');
    performance.measure('Duration', 'start', 'end');

    console.log(`\nInitial CPU: ${initialStats.cpu}% (${((initialStats.cpu / 100) * cpuMaxGHz).toFixed(2)} GHz)`);
    console.log(`Initial Memory: ${(initialStats.memory / 1024 / 1024).toFixed(2)}MB`);

    // Measure final CPU and memory usage
    let finalStats = await pidusage(process.pid);
    console.log(`Final CPU: ${finalStats.cpu.toFixed(2)}% (${((finalStats.cpu / 100) * cpuMaxGHz).toFixed(2)} GHz)`);
    console.log(`Final Memory: ${(finalStats.memory / 1024 / 1024).toFixed(2)}MB`);

    // Average CPU and memory usage
    let averageCPUUsage = (initialStats.cpu + finalStats.cpu) / 2;
    let averageMemoryUsage = (initialStats.memory + finalStats.memory) / 2 / 1024 / 1024;

    console.log(`Average CPU: ${averageCPUUsage.toFixed(2)}% (${((averageCPUUsage / 100) * cpuMaxGHz).toFixed(2)} GHz)`);
    console.log(`Average Memory: ${averageMemoryUsage.toFixed(2)}MB`);
}

main().catch(console.error);
