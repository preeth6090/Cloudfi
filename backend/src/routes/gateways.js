const router = require('express').Router();
const Gateway = require('../models/Gateway');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', async (req, res) => {
  const query = req.user.siteAccess.includes('all') ? {} : { site: { $in: req.user.siteAccess } };
  const gateways = await Gateway.find(query).sort('-createdAt');
  res.json(gateways);
});

router.post('/', async (req, res) => {
  const gw = await Gateway.create({ ...req.body, createdBy: req.user._id });
  res.status(201).json(gw);
});

router.put('/:id', async (req, res) => {
  const gw = await Gateway.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!gw) return res.status(404).json({ message: 'Not found' });
  res.json(gw);
});

router.delete('/:id', async (req, res) => {
  await Gateway.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;
