const mongoose = require('mongoose');

const operationSchema = new mongoose.Schema({
  type: { type: String, required: true }, // e.g., 'draw', 'clear'
  operationId: { type: String, required: true, unique: true },
  userId: { type: String, required: true }, // The persistentUserId who made the operation
  data: mongoose.Schema.Types.Mixed, // Flexible field for operation-specific data (points, color, etc.)
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Operation', operationSchema); 