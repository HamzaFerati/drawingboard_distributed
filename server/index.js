const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());

// Add a health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Store connected clients
const clients = new Map();

wss.on('connection', (ws) => {
  const clientId = Math.random().toString(36).substring(7);
  clients.set(clientId, ws);

  console.log(`Client connected: ${clientId}`);

  // Send the client their ID
  ws.send(JSON.stringify({
    type: 'connection',
    clientId: clientId
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      // Broadcast the message to all other clients
      clients.forEach((client, id) => {
        if (id !== clientId && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            ...data,
            senderId: clientId
          }));
        }
      });
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  ws.on('close', () => {
    console.log(`Client disconnected: ${clientId}`);
    clients.delete(clientId);
    
    // Notify other clients about the disconnection
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'user_leave',
          userId: clientId
        }));
      }
    });
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`WebSocket server is running on port ${PORT}`);
}); 