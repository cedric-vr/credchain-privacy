const { generateZKP } = require("./student.js");
const { verifyZKP } = require("./company.js");
const pidusage = require('pidusage');
const { performance, PerformanceObserver } = require('perf_hooks');

const degreeThresholdTimestamp = "1262304000";  // Unix timestamp: Fri Jan 01 2010 00:00:00
const degreeIssuanceTimestamp = "1500000000";   // Unix timestamp: Fri Jul 14 2017 02:40:00

const cpuMaxGHz = 4.2; // Maximum clock speed in GHz

async function measureFunctionExecution(func, label, ...args) {
    performance.mark(`${label}-start`);
    const result = await func(...args);
    performance.mark(`${label}-end`);
    performance.measure(label, `${label}-start`, `${label}-end`);
    const { cpu, memory } = await pidusage(process.pid);
    const duration = performance.getEntriesByName(label)[0].duration;
    performance.clearMarks();
    performance.clearMeasures();
    return { cpu, memory, duration, result };
}

function calculateStats(values) {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);
    return { avg, max, min };
}

async function main() {
    const obs = new PerformanceObserver((items) => {});
    obs.observe({ entryTypes: ['measure'] });

    let initialStats = await pidusage(process.pid);

    const runs = 10;
    let generateZKPStats = [];
    let verifyZKPStats = [];

    for (let i = 0; i < runs; i++) {
        console.log(`Run ${i}/${runs}:`);

        const generateStats = await measureFunctionExecution(generateZKP, 'generateZKP', degreeIssuanceTimestamp, degreeThresholdTimestamp);
        generateZKPStats.push(generateStats);

        const verifyStats = await measureFunctionExecution(verifyZKP, 'verifyZKP', generateStats.result.proof, generateStats.result.vk);
        verifyZKPStats.push(verifyStats);
    }

    const generateZKPCPU = generateZKPStats.map(stat => stat.cpu);
    const generateZKPMemory = generateZKPStats.map(stat => stat.memory);
    const generateZKPDuration = generateZKPStats.map(stat => stat.duration);

    const verifyZKPCPU = verifyZKPStats.map(stat => stat.cpu);
    const verifyZKPMemory = verifyZKPStats.map(stat => stat.memory);
    const verifyZKPDuration = verifyZKPStats.map(stat => stat.duration);

    const generateZKPCPUStats = calculateStats(generateZKPCPU);
    const generateZKPMemoryStats = calculateStats(generateZKPMemory);
    const generateZKPDurationStats = calculateStats(generateZKPDuration);

    const verifyZKPCPUStats = calculateStats(verifyZKPCPU);
    const verifyZKPMemoryStats = calculateStats(verifyZKPMemory);
    const verifyZKPDurationStats = calculateStats(verifyZKPDuration);

    console.log("\nGenerateZKP Stats:");
    console.log(`CPU:\n\tAvg: ${generateZKPCPUStats.avg.toFixed(2)}%, Max: ${generateZKPCPUStats.max.toFixed(2)}%, Min: ${generateZKPCPUStats.min.toFixed(2)}%`);
    console.log(`Memory:\n\tAvg: ${(generateZKPMemoryStats.avg / 1024 / 1024).toFixed(2)}MB, Max: ${(generateZKPMemoryStats.max / 1024 / 1024).toFixed(2)}MB, Min: ${(generateZKPMemoryStats.min / 1024 / 1024).toFixed(2)}MB`);
    console.log(`Duration:\n\tAvg: ${generateZKPDurationStats.avg.toFixed(2)}ms, Max: ${generateZKPDurationStats.max.toFixed(2)}ms, Min: ${generateZKPDurationStats.min.toFixed(2)}ms`);

    console.log("\nVerifyZKP Stats:");
    console.log(`CPU:\n\tAvg: ${verifyZKPCPUStats.avg.toFixed(2)}%, Max: ${verifyZKPCPUStats.max.toFixed(2)}%, Min: ${verifyZKPCPUStats.min.toFixed(2)}%`);
    console.log(`Memory:\n\tAvg: ${(verifyZKPMemoryStats.avg / 1024 / 1024).toFixed(2)}MB, Max: ${(verifyZKPMemoryStats.max / 1024 / 1024).toFixed(2)}MB, Min: ${(verifyZKPMemoryStats.min / 1024 / 1024).toFixed(2)}MB`);
    console.log(`Duration:\n\tAvg: ${verifyZKPDurationStats.avg.toFixed(2)}ms, Max: ${verifyZKPDurationStats.max.toFixed(2)}ms, Min: ${verifyZKPDurationStats.min.toFixed(2)}ms`);
}

main().catch(console.error);
