const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  googleId: { type: String, unique: true, sparse: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  name: String,
  avatar: String,
  role: { type: String, enum: ['system_admin', 'supervisor', 'energy_analyst', 'viewer'], default: 'viewer' },
  siteAccess: [{ type: String }], // site IDs or 'all'
  isActive: { type: Boolean, default: true },
  lastLogin: Date,
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
