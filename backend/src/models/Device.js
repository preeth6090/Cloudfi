const mongoose = require('mongoose');

const registerMapSchema = new mongoose.Schema({
  parameterId: String,       // e.g. 'vibration'
  label: String,             // e.g. 'Vibration (mm/s)'
  register: Number,          // Modbus register address
  dataType: { type: String, enum: ['float32', 'int16', 'uint16', 'coil'], default: 'float32' },
  scaleFactor: { type: Number, default: 1 },
  unit: String,
  alertMin: Number,
  alertMax: Number,
  aiOptimalTarget: Number,
}, { _id: false });

const deviceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  assetType: {
    type: String,
    enum: ['ball_mill', 'boiler', 'compressor', 'pump', 'fan', 'centrifugal', 'spray_dryer',
           'hydraulic_press', 'gearbox', 'turbine', 'heat_exchanger', 'motor', 'other'],
    default: 'motor',
  },
  gateway: { type: mongoose.Schema.Types.ObjectId, ref: 'Gateway' },
  site: { type: String, required: true },
  unitId: { type: Number, default: 1 },    // Modbus unit/slave ID
  pollInterval: { type: Number, default: 5 }, // seconds
  registerMap: [registerMapSchema],
  status: { type: String, enum: ['online', 'offline', 'warning', 'critical'], default: 'offline' },
  healthIndex: { type: Number, default: 100 },
  runHours: { type: Number, default: 0 },
  lastMaintenance: Date,
  tags: [String],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Device', deviceSchema);
