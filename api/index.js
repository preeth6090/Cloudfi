// Vercel Function: every /api/* request is rewritten here (see vercel.json)
// and handled by the Express app.
module.exports = require('../backend/src/app');
