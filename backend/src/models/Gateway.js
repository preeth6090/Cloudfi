const mongoose = require('mongoose');

const gatewaySchema = new mongoose.Schema({
  name: { type: String, required: true },
  model: { type: String, default: 'GF100' },
  ipAddress: { type: String, required: true },
  port: { type: Number, default: 502 },
  protocol: { type: String, enum: ['modbus_tcp', 'modbus_rtu', 'mqtt', 'ethernet'], default: 'modbus_tcp' },
  heartbeatInterval: { type: Number, default: 30 }, // seconds
  site: { type: String, required: true },
  location: String,
  status: { type: String, enum: ['online', 'offline', 'degraded'], default: 'offline' },
  lastSeen: Date,
  firmwareVersion: { type: String, default: '4.0.1' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Gateway', gatewaySchema);
