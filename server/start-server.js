const { spawn } = require('child_process');
const path = require('path');

console.log('Starting WebSocket server...');

const server = spawn('node', ['index.js'], {
  stdio: 'inherit',
  cwd: path.join(__dirname)
});

server.on('error', (error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('Shutting down server...');
  server.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down server...');
  server.kill();
  process.exit(0);
}); 