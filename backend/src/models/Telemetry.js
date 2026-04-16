const mongoose = require('mongoose');

// Stored in MongoDB time-series collection
const telemetrySchema = new mongoose.Schema({
  timestamp: { type: Date, required: true, index: true },
  metadata: {
    deviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Device' },
    site: String,
    assetType: String,
  },
  power: Number,        // kW
  current: Number,      // A
  voltage: Number,      // V
  powerFactor: Number,  // 0-1
  temperature: Number,  // °C
  vibration: Number,    // mm/s
  pressure: Number,     // bar
  flow: Number,         // m³/h
  energy: Number,       // kWh (cumulative)
  rpm: Number,
  torque: Number,
  efficiency: Number,   // %
  steamConsumption: Number, // kg/ton
  custom: mongoose.Schema.Types.Mixed, // extra params from register map
}, { timeseries: { timeField: 'timestamp', metaField: 'metadata' } });

module.exports = mongoose.model('Telemetry', telemetrySchema, 'telemetries');
