// Local development server. On Vercel the same app runs from api/index.js.
require('dotenv').config();
require('dotenv').config({ path: require('path').join(__dirname, '../../.env.local') });
const app = require('./app');
const { connectDB } = require('./config/db');

const PORT = process.env.PORT || 5001;

connectDB().then(() => {
  app.listen(PORT, () => console.log(`CloudFi backend running on :${PORT}`));
}).catch((err) => {
  console.error('Boot error:', err);
  process.exit(1);
});
