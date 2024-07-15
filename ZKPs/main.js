const { exec } = require('child_process');

async function main() {
    const startTime = Date.now();

    console.log('Student is generating the proof...');
    exec('node student.js', (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing personA.js: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`stderr from personA.js: ${stderr}`);
            return;
        }
        console.log(`stdout from personA.js: ${stdout}`);

        console.log('-------------------------------------------------------------')
        console.log('Company is verifying the proof...');
        exec('node company.js', (error, stdout, stderr) => {
            if (error) {
                console.error(`Error executing personB.js: ${error.message}`);
                return;
            }
            if (stderr) {
                console.error(`stderr from personB.js: ${stderr}`);
                return;
            }
            console.log(`stdout from personB.js: ${stdout}`);

            const endTime = Date.now();
            const executionTime = (endTime - startTime) / 1000; // Calculate execution time in seconds
            console.log(`Total execution time: ${executionTime} seconds`);
        });
    });
}

main().catch(console.error);
