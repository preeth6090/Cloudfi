const router = require('express').Router();
const Alert = require('../models/Alert');
const { protect, siteFilter } = require('../middleware/auth');

router.use(protect);

router.get('/', async (req, res) => {
  const alerts = await Alert.list({
    sites: siteFilter(req.user),
    unacked: req.query.unacked === 'true',
    limit: 100,
  });
  res.json(alerts);
});

router.patch('/:id/ack', async (req, res) => {
  const alert = await Alert.acknowledge(req.params.id, req.user._id);
  res.json(alert);
});

router.patch('/:id/resolve', async (req, res) => {
  const alert = await Alert.acknowledge(req.params.id, req.user._id, { resolve: true });
  res.json(alert);
});

module.exports = router;
