const { generateZKP } = require("./student.js");
const { verifyZKP } = require("./company.js");
const pidusage = require('pidusage');
const { performance, PerformanceObserver } = require('perf_hooks');
const fs = require('fs');
const { Parser } = require('json2csv');

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
    return { cpu: Number(cpu.toFixed(2)), memory: Number((memory / 1024 / 1024).toFixed(2)), duration: Number(duration.toFixed(2)), result };
}

function calculateStats(values) {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);
    return { avg: Number(avg.toFixed(2)), max: Number(max.toFixed(2)), min: Number(min.toFixed(2)) };
}

async function ZKPperformance(runs) {
    console.log("Running Zero-Knowledge Proof Performance Test.")
    const obs = new PerformanceObserver((items) => {});
    obs.observe({ entryTypes: ['measure'] });

    let initialStats = await pidusage(process.pid);

    let generateZKPStats = [];
    let verifyZKPStats = [];

    for (let i = 0; i < runs; i++) {
        console.log(`Run ${i + 1}/${runs}:`);

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
    console.log(`CPU:\n\tAvg: ${generateZKPCPUStats.avg}%, Max: ${generateZKPCPUStats.max}%, Min: ${generateZKPCPUStats.min}%`);
    console.log(`Memory:\n\tAvg: ${generateZKPMemoryStats.avg}MB, Max: ${generateZKPMemoryStats.max}MB, Min: ${generateZKPMemoryStats.min}MB`);
    console.log(`Duration:\n\tAvg: ${generateZKPDurationStats.avg}ms, Max: ${generateZKPDurationStats.max}ms, Min: ${generateZKPDurationStats.min}ms`);

    console.log("\nVerifyZKP Stats:");
    console.log(`CPU:\n\tAvg: ${verifyZKPCPUStats.avg}%, Max: ${verifyZKPCPUStats.max}%, Min: ${verifyZKPCPUStats.min}%`);
    console.log(`Memory:\n\tAvg: ${verifyZKPMemoryStats.avg}MB, Max: ${verifyZKPMemoryStats.max}MB, Min: ${verifyZKPMemoryStats.min}MB`);
    console.log(`Duration:\n\tAvg: ${verifyZKPDurationStats.avg}ms, Max: ${verifyZKPDurationStats.max}ms, Min: ${verifyZKPDurationStats.min}ms`);

    // Prepare data for CSV
    const csvData = [];
    for (let i = 0; i < runs; i++) {
        csvData.push({
            run: i + 1,
            generateZKPCPU: generateZKPCPU[i],
            generateZKPMemory: generateZKPMemory[i],
            generateZKPDuration: generateZKPDuration[i],
            verifyZKPCPU: verifyZKPCPU[i],
            verifyZKPMemory: verifyZKPMemory[i],
            verifyZKPDuration: verifyZKPDuration[i]
        });
    }

    const fields = ['run', 'generateZKPCPU', 'generateZKPMemory', 'generateZKPDuration', 'verifyZKPCPU', 'verifyZKPMemory', 'verifyZKPDuration'];
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(csvData);

    fs.writeFileSync('./evaluation/ZKP_performance_data.csv', csv);
    console.log('Performance data saved to ZKP_performance_data.csv');
}

// ZKPperformance().catch(console.error);
module.exports = { ZKP_performance: ZKPperformance };
