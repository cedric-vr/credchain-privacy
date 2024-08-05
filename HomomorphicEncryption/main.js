const { studentMain } = require("./student.js");
const { companyMain } = require("./company.js");
const { companySetup } = require("./company");
const pidusage = require('pidusage');
const { performance, PerformanceObserver } = require('perf_hooks');

const degreeThresholdTimestamp = 1262304000;  // Unix timestamp: Fri Jan 01 2010 00:00:00
const degreeIssuanceTimestamp = 1500000000;   // Unix timestamp: Fri Jul 14 2017 02:40:00

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
    let companySetupStats = [];
    let studentMainStats = [];
    let companyMainStats = [];

    for (let i = 0; i < runs; i++) {
        console.log(`Run ${i}/${runs}:`);

        const setupStats = await measureFunctionExecution(companySetup, 'companySetup', degreeThresholdTimestamp);
        companySetupStats.push(setupStats);

        const studentStats = await measureFunctionExecution(studentMain, 'studentMain', degreeIssuanceTimestamp, setupStats.result);
        studentMainStats.push(studentStats);

        const companyStats = await measureFunctionExecution(companyMain, 'companyMain', studentStats.result, setupStats.result);
        companyMainStats.push(companyStats);
    }

    const companySetupCPU = companySetupStats.map(stat => stat.cpu);
    const companySetupMemory = companySetupStats.map(stat => stat.memory);
    const companySetupDuration = companySetupStats.map(stat => stat.duration);

    const studentMainCPU = studentMainStats.map(stat => stat.cpu);
    const studentMainMemory = studentMainStats.map(stat => stat.memory);
    const studentMainDuration = studentMainStats.map(stat => stat.duration);

    const companyMainCPU = companyMainStats.map(stat => stat.cpu);
    const companyMainMemory = companyMainStats.map(stat => stat.memory);
    const companyMainDuration = companyMainStats.map(stat => stat.duration);

    const companySetupCPUStats = calculateStats(companySetupCPU);
    const companySetupMemoryStats = calculateStats(companySetupMemory);
    const companySetupDurationStats = calculateStats(companySetupDuration);

    const studentMainCPUStats = calculateStats(studentMainCPU);
    const studentMainMemoryStats = calculateStats(studentMainMemory);
    const studentMainDurationStats = calculateStats(studentMainDuration);

    const companyMainCPUStats = calculateStats(companyMainCPU);
    const companyMainMemoryStats = calculateStats(companyMainMemory);
    const companyMainDurationStats = calculateStats(companyMainDuration);

    console.log("\nCompanySetup Stats:");
    console.log(`CPU:\n\tAvg: ${companySetupCPUStats.avg.toFixed(2)}%, Max: ${companySetupCPUStats.max.toFixed(2)}%, Min: ${companySetupCPUStats.min.toFixed(2)}%`);
    console.log(`Memory:\n\tAvg: ${(companySetupMemoryStats.avg / 1024 / 1024).toFixed(2)}MB, Max: ${(companySetupMemoryStats.max / 1024 / 1024).toFixed(2)}MB, Min: ${(companySetupMemoryStats.min / 1024 / 1024).toFixed(2)}MB`);
    console.log(`Duration:\n\tAvg: ${companySetupDurationStats.avg.toFixed(2)}ms, Max: ${companySetupDurationStats.max.toFixed(2)}ms, Min: ${companySetupDurationStats.min.toFixed(2)}ms`);

    console.log("\nStudentMain Stats:");
    console.log(`CPU:\n\tAvg: ${studentMainCPUStats.avg.toFixed(2)}%, Max: ${studentMainCPUStats.max.toFixed(2)}%, Min: ${studentMainCPUStats.min.toFixed(2)}%`);
    console.log(`Memory:\n\tAvg: ${(studentMainMemoryStats.avg / 1024 / 1024).toFixed(2)}MB, Max: ${(studentMainMemoryStats.max / 1024 / 1024).toFixed(2)}MB, Min: ${(studentMainMemoryStats.min / 1024 / 1024).toFixed(2)}MB`);
    console.log(`Duration:\n\tAvg: ${studentMainDurationStats.avg.toFixed(2)}ms, Max: ${studentMainDurationStats.max.toFixed(2)}ms, Min: ${studentMainDurationStats.min.toFixed(2)}ms`);

    console.log("\nCompanyMain Stats:");
    console.log(`CPU:\n\tAvg: ${companyMainCPUStats.avg.toFixed(2)}%, Max: ${companyMainCPUStats.max.toFixed(2)}%, Min: ${companyMainCPUStats.min.toFixed(2)}%`);
    console.log(`Memory:\n\tAvg: ${(companyMainMemoryStats.avg / 1024 / 1024).toFixed(2)}MB, Max: ${(companyMainMemoryStats.max / 1024 / 1024).toFixed(2)}MB, Min: ${(companyMainMemoryStats.min / 1024 / 1024).toFixed(2)}MB`);
    console.log(`Duration:\n\tAvg: ${companyMainDurationStats.avg.toFixed(2)}ms, Max: ${companyMainDurationStats.max.toFixed(2)}ms, Min: ${companyMainDurationStats.min.toFixed(2)}ms`);
}

main().catch(console.error);
