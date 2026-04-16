const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  device: { type: mongoose.Schema.Types.ObjectId, ref: 'Device' },
  site: String,
  type: { type: String, enum: ['predictive', 'preventive', 'generative', 'quality', 'critical'], default: 'predictive' },
  severity: { type: String, enum: ['info', 'warning', 'critical'], default: 'warning' },
  parameter: String,   // e.g. 'vibration'
  message: String,
  recommendation: String,
  estimatedWastage: Number, // INR per hour
  acknowledged: { type: Boolean, default: false },
  acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: Date,
}, { timestamps: true });

module.exports = mongoose.model('Alert', alertSchema);
