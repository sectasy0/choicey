import { spawn } from 'child_process';

const backendProcess = spawn('node', ['server.js'], {
    stdio: 'inherit',
    shell: false,
});

let serverExited = false;

function killServer() {
    if (!serverExited) {
        backendProcess.kill();
        serverExited = true;
    }
}

async function main() {
    const testProcess = spawn('yarn', ['start-server-and-test', 'http://localhost:3300', 'cy:run'], {
        stdio: 'inherit',
        shell: true,
    });

    testProcess.on('exit', code => {
        killServer();
        process.exit(code);
    });
    testProcess.on('error', err => {
        killServer();
        console.error('Failed to start test stuff:', err);
        process.exit(1);
    });
}

backendProcess.on('exit', () => {
    serverExited = true;
});

main();