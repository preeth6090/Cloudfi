const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function protect(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ message: 'No token' });
  let decoded;
  try {
    decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
  req.user = await User.findById(decoded.id);
  if (!req.user || !req.user.isActive) return res.status(401).json({ message: 'Unauthorized' });
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) return res.status(403).json({ message: 'Forbidden' });
    next();
  };
}

// Sites the user may see, or null for all sites.
function siteFilter(user) {
  return user.siteAccess.includes('all') ? null : user.siteAccess;
}

module.exports = { protect, requireRole, siteFilter };
