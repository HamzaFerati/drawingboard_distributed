require('dotenv').config();
const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const Operation = require('./models/Operation');
const User = require('./models/User'); // Will be used for authentication later

const app = express();
app.use(cors());
app.use(express.json()); // For parsing application/json

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/drawingboard';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// User Registration Route
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required.' });
  }

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ message: 'User with that username already exists.' });
    }

    const newUser = new User({ username, password });
    await newUser.save();

    res.status(201).json({ message: 'User registered successfully.', userId: newUser._id });
  } catch (error) {
    console.error('Error during user registration:', error);
    res.status(500).json({ message: 'Server error during registration.' });
  }
});

// User Login Route
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required.' });
  }

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: 'Invalid username or password.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid username or password.' });
    }

    // In a real application, you would generate and send a JWT here
    res.status(200).json({ message: 'Login successful.', userId: user._id, username: user.username, userColor: user.color });
  } catch (error) {
    console.error('Error during user login:', error);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

// Add a health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

const PORT = process.env.PORT || 3002;
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
// let currentOperations = []; // Stores all drawing operations - REPLACED BY DATABASE
console.log(`[Server] Initializing: currentOperations (now in DB) will be loaded on client connect.`);
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

  ws.on('message', async (message) => { // Made async to use await
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
          
          // Fetch operations from DB and send to the newly connected client
          const operationsFromDb = await Operation.find({});
          ws.send(JSON.stringify({
            type: 'state_sync',
            state: {
              users: Array.from(activeUsers.values()),
              operations: operationsFromDb.map(op => op.data) // Send only the data part of the operation
            }
          }));
          console.log(`[Server] Sent state_sync to client ${data.persistentUserId} with ${operationsFromDb.length} operations.`);

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
          try {
            const newOperation = new Operation({
              type: data.data.operation.type,
              operationId: data.data.operation.id, // Assuming operation has a unique ID
              userId: data.userId,
              data: data.data.operation
            });
            await newOperation.save();
            console.log(`[Server] Saved drawing_operation to DB. Operation ID: ${newOperation.operationId}`);
          } catch (dbError) {
            console.error('Error saving drawing operation to DB:', dbError);
          }
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
          console.log('[Server] Received clear_canvas message. Clearing operations from DB.');
          try {
            await Operation.deleteMany({}); // Clear all operations from the database
            console.log('[Server] All operations cleared from database.');
          } catch (dbError) {
            console.error('Error clearing operations from DB:', dbError);
          }
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