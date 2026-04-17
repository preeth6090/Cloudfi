const mongoose = require('mongoose');

// No-Delete master audit — every telemetry packet is written here permanently
const auditSchema = new mongoose.Schema({
  receivedAt:  { type: Date, default: Date.now, index: true },
  deviceId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Device' },
  site:        String,
  assetType:   String,
  protocol:    String,
  source:      { type: String, enum: ['simulator', 'api', 'bulk', 'manual'], default: 'api' },
  payloadHash: String,   // SHA-256 of payload for dedup detection
  payload:     mongoose.Schema.Types.Mixed,
}, {
  capped: false,   // never cap — true no-delete policy
  versionKey: false,
});

// Index for efficient device + time queries
auditSchema.index({ deviceId: 1, receivedAt: -1 });
auditSchema.index({ protocol: 1 });

module.exports = mongoose.model('AuditLog', auditSchema);
