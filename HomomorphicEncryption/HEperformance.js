const { studentMain } = require("./student.js");
const { companyMain } = require("./company.js");
const { companySetup } = require("./company");
const pidusage = require('pidusage');
const { performance, PerformanceObserver } = require('perf_hooks');
const fs = require('fs');
const { Parser } = require('json2csv');

const degreeThresholdTimestamp = 1262304000;  // Unix timestamp: Fri Jan 01 2010 00:00:00
const degreeIssuanceTimestamp = 1500000000;   // Unix timestamp: Fri Jul 14 2017 02:40:00

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
    // Filter out zero values and count the zeros
    const nonZeroValues = values.filter(value => value !== 0);
    const zeroCount = values.length - nonZeroValues.length;
    if (nonZeroValues.length === 0) {
        return { avg: 0, max: 0, min: 0, zeroCount };
    }

    const avg = nonZeroValues.reduce((a, b) => a + b, 0) / nonZeroValues.length;
    const max = Math.max(...nonZeroValues);
    const min = Math.min(...nonZeroValues);

    return { avg: Number(avg.toFixed(2)), max: Number(max.toFixed(2)), min: Number(min.toFixed(2)), zeroCount };
}

async function HEperformance(runs) {
    console.log("Running Homomorphic Encryption Performance Test.")
    const obs = new PerformanceObserver((items) => {});
    obs.observe({ entryTypes: ['measure'] });

    let companySetupStats = [];
    let studentMainStats = [];
    let companyMainStats = [];

    for (let i = 0; i < runs; i++) {
        console.log(`Run ${i + 1}/${runs}:`);

        const setupStats = await measureFunctionExecution(companySetup, 'companySetup', degreeThresholdTimestamp);
        companySetupStats.push(setupStats);

        const studentStats = await measureFunctionExecution(studentMain, 'studentMain', degreeIssuanceTimestamp, setupStats.result.companySetupData);
        studentMainStats.push(studentStats);

        const companyStats = await measureFunctionExecution(companyMain, 'companyMain', studentStats.result, setupStats.result.companySetupData, setupStats.result.companySecretKey);
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
    console.log(`CPU:\n\tAvg: ${companySetupCPUStats.avg}%, Max: ${companySetupCPUStats.max}%, Min: ${companySetupCPUStats.min}%, ZEROs: ${companySetupCPUStats.zeroCount}`);
    console.log(`Memory:\n\tAvg: ${companySetupMemoryStats.avg}MB, Max: ${companySetupMemoryStats.max}MB, Min: ${companySetupMemoryStats.min}MB`);
    console.log(`Duration:\n\tAvg: ${companySetupDurationStats.avg}ms, Max: ${companySetupDurationStats.max}ms, Min: ${companySetupDurationStats.min}ms`);

    console.log("\nStudentMain Stats:");
    console.log(`CPU:\n\tAvg: ${studentMainCPUStats.avg}%, Max: ${studentMainCPUStats.max}%, Min: ${studentMainCPUStats.min}%, ZEROs: ${studentMainCPUStats.zeroCount}`);
    console.log(`Memory:\n\tAvg: ${studentMainMemoryStats.avg}MB, Max: ${studentMainMemoryStats.max}MB, Min: ${studentMainMemoryStats.min}MB`);
    console.log(`Duration:\n\tAvg: ${studentMainDurationStats.avg}ms, Max: ${studentMainDurationStats.max}ms, Min: ${studentMainDurationStats.min}ms`);

    console.log("\nCompanyMain Stats:");
    console.log(`CPU:\n\tAvg: ${companyMainCPUStats.avg}%, Max: ${companyMainCPUStats.max}%, Min: ${companyMainCPUStats.min}%, ZEROs: ${companyMainCPUStats.zeroCount}`);
    console.log(`Memory:\n\tAvg: ${companyMainMemoryStats.avg}MB, Max: ${companyMainMemoryStats.max}MB, Min: ${companyMainMemoryStats.min}MB`);
    console.log(`Duration:\n\tAvg: ${companyMainDurationStats.avg}ms, Max: ${companyMainDurationStats.max}ms, Min: ${companyMainDurationStats.min}ms`);

    // Prepare data for CSV
    const csvData = [];
    for (let i = 0; i < runs; i++) {
        csvData.push({
            run: i + 1,
            companySetupCPU: companySetupCPU[i],
            companySetupMemory: companySetupMemory[i],
            companySetupDuration: companySetupDuration[i],
            studentMainCPU: studentMainCPU[i],
            studentMainMemory: studentMainMemory[i],
            studentMainDuration: studentMainDuration[i],
            companyMainCPU: companyMainCPU[i],
            companyMainMemory: companyMainMemory[i],
            companyMainDuration: companyMainDuration[i]
        });
    }

    const fields = ['run', 'companySetupCPU', 'companySetupMemory', 'companySetupDuration', 'studentMainCPU', 'studentMainMemory', 'studentMainDuration', 'companyMainCPU', 'companyMainMemory', 'companyMainDuration'];
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(csvData);

    fs.writeFileSync('./evaluation/HE_performance_data.csv', csv);
    console.log('Performance data saved to HE_performance_data.csv');
}

// HEperformance().catch(console.error);
module.exports = { HE_performance: HEperformance };
