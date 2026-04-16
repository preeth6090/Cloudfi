const router = require('express').Router();
const Alert = require('../models/Alert');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', async (req, res) => {
  const query = req.user.siteAccess.includes('all') ? {} : { site: { $in: req.user.siteAccess } };
  if (req.query.unacked === 'true') query.acknowledged = false;
  const alerts = await Alert.find(query)
    .populate('device', 'name assetType')
    .sort('-createdAt')
    .limit(100);
  res.json(alerts);
});

router.patch('/:id/ack', async (req, res) => {
  const alert = await Alert.findByIdAndUpdate(
    req.params.id,
    { acknowledged: true, acknowledgedBy: req.user._id },
    { new: true }
  );
  res.json(alert);
});

router.patch('/:id/resolve', async (req, res) => {
  const alert = await Alert.findByIdAndUpdate(
    req.params.id,
    { acknowledged: true, resolvedAt: new Date(), acknowledgedBy: req.user._id },
    { new: true }
  );
  res.json(alert);
});

module.exports = router;
