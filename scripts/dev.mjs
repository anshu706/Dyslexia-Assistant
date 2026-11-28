import { spawn } from 'node:child_process';

console.log('\x1b[36m%s\x1b[0m', '🚀 Starting Dyslexia Assistant development server...\n');

// Start Vite Dev Server on port 5173
const vite = spawn('npx', ['vite'], {
    stdio: 'inherit',
    shell: true
});

function cleanup() {
    console.log('\n\x1b[33m%s\x1b[0m', 'Shutting down development server...');
    vite.kill();
    process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
