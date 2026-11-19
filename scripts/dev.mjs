import { spawn } from 'node:child_process';

console.log('\x1b[36m%s\x1b[0m', '🚀 Starting Dyslexia Assistant full-stack development environment...\n');

// 1. Start Node.js API Server on port 3001
const server = spawn('node', ['server/server.js'], {
    stdio: 'inherit',
    shell: true
});

// 2. Start Vite Dev Server on port 5173
const vite = spawn('npx', ['vite'], {
    stdio: 'inherit',
    shell: true
});

function cleanup() {
    console.log('\n\x1b[33m%s\x1b[0m', 'Shutting down full-stack development servers...');
    server.kill();
    vite.kill();
    process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
