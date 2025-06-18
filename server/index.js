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

const PORT = process.env.PORT || 3001;
const server = http.createServer(app);

// Create WebSocket server with proper error handling
const wss = new WebSocket.Server({ 
  server,
  // Add ping/pong for connection health checks
  clientTracking: true,
  // Increase the maximum payload size if needed
  maxPayload: 50 * 1024 * 1024 // 50MB
});

// Centralized State on the Server
let currentOperations = []; // Stores all drawing operations
const activeUsers = new Map(); // Maps persistentUserId to User object { id, name, color, isActive, lastSeen, cursor, connectionId }
// We'll also maintain a map from ephemeral connectionId to persistentUserId for lookup on disconnect
const connectionIdToPersistentUser = new Map();

// Helper function to broadcast to all clients except sender
function broadcast(message, senderPersistentUserId = null) {
  wss.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) {
      // Only send to others if a senderPersistentUserId is specified AND it's not the sender
      if (senderPersistentUserId && client._persistentUserId === senderPersistentUserId) return;
      try {
        client.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error broadcasting message:', error);
      }
    }
  });
}

// Helper function to broadcast to all clients
function broadcastToAll(message) {
  wss.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error broadcasting to all:', error);
      }
    }
  });
}

wss.on('connection', (ws) => {
  const connectionId = Math.random().toString(36).substring(7);
  ws._connectionId = connectionId;
  
  console.log(`Client connected: ${connectionId}`);

  // Set up ping/pong for connection health check
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  // Immediately send the ephemeral connection ID to the newly connected client
  try {
    ws.send(JSON.stringify({
      type: 'connection',
      clientId: connectionId
    }));
  } catch (error) {
    console.error('Error sending connection ID:', error);
  }

  ws.on('error', (error) => {
    console.error(`WebSocket error for client ${ws._connectionId}:`, error);
  });

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log(`[Server] Received message type: ${data.type}`);
      console.log(`Received from ${ws._connectionId}:`, data.type);

      switch (data.type) {
        case 'client_connect_info': // Initial handshake from client
          console.log('[Server] Sending state_sync to client after handshake:', data.persistentUserId);
          const persistentUserId = data.persistentUserId;
          const userName = data.userName;
          const userColor = data.userColor;

          // Associate ephemeral connectionId with persistentUserId
          ws._persistentUserId = persistentUserId;
          connectionIdToPersistentUser.set(connectionId, persistentUserId);

          const user = { 
            id: persistentUserId, 
            name: userName,
            color: userColor,
            isActive: true, 
            lastSeen: Date.now(),
            connectionId: connectionId // Store ephemeral connection ID for potential lookup
          };
          activeUsers.set(persistentUserId, user);
          
          // Send full current state to the newly connected client
          ws.send(JSON.stringify({
            type: 'state_sync',
            state: {
              users: Array.from(activeUsers.values()),
              operations: currentOperations
            }
          }));

          // Notify others about the new user
          broadcastToAll({ type: 'user_join', user });
          broadcastToAll({ type: 'active_users_update', users: Array.from(activeUsers.values()).map(u => u.id) });
          break;
        case 'user_leave': // Client explicitly leaving
          activeUsers.delete(data.userId); // data.userId is persistent ID
          broadcastToAll({ type: 'user_leave', userId: data.userId });
          broadcastToAll({ type: 'active_users_update', users: Array.from(activeUsers.values()).map(u => u.id) });
          break;
        case 'drawing_operation':
          // Client sends { type: 'drawing_operation', data: { operation: {...} }, userId: 'persistentId' }
          currentOperations.push(data.data.operation); 
          broadcastToAll({ type: 'drawing_operation', operation: data.data.operation }); // Broadcast to all, including sender
          break;
        case 'cursor_move':
          // Client sends { type: 'cursor_move', data: { cursor: {...} }, userId: 'persistentId' }
          // Update cursor position for active user using their persistent ID
          if (activeUsers.has(data.userId)) {
            activeUsers.get(data.userId).cursor = data.data.cursor; 
            activeUsers.get(data.userId).lastSeen = Date.now();
          }
          broadcastToAll({ type: 'cursor_move', userId: data.userId, cursor: data.data.cursor }); // Broadcast to all, including sender
          break;
        case 'heartbeat':
          if (activeUsers.has(data.userId)) { // data.userId is persistent ID
            activeUsers.get(data.userId).lastSeen = Date.now();
            activeUsers.get(data.userId).isActive = true; 
          }
          break;
        case 'clear_canvas': 
          currentOperations = []; 
          broadcastToAll({ type: 'clear_canvas' }); 
          break;
        default:
          console.warn(`Unknown message type from ${ws._connectionId}: ${data.type}`);
          break;
      }
    } catch (error) {
      console.error('Error processing message from client', ws._connectionId, ':', error);
    }
  });

  ws.on('close', () => {
    console.log(`Client disconnected: ${ws._connectionId}`);
    const leavingPersistentUserId = connectionIdToPersistentUser.get(ws._connectionId);
    if (leavingPersistentUserId) {
      activeUsers.delete(leavingPersistentUserId);
      connectionIdToPersistentUser.delete(ws._connectionId);
      
      // Notify other clients about the disconnection
      broadcastToAll({
        type: 'user_leave',
        userId: leavingPersistentUserId
      });
      // Send updated active users list to everyone
      broadcastToAll({ 
        type: 'active_users_update', 
        users: Array.from(activeUsers.values()).map(u => u.id) 
      });
    }
  });
});

// Set up periodic connection health check
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      console.log('Terminating inactive connection');
      return ws.terminate();
    }
    
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => {
  clearInterval(interval);
});

// Start the server
server.listen(PORT, () => {
  console.log(`WebSocket server is running on port ${PORT}`);
});

// Handle server errors
server.on('error', (error) => {
  console.error('Server error:', error);
}); 