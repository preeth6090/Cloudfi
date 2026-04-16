const router = require('express').Router();
const Device = require('../models/Device');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', async (req, res) => {
  const query = req.user.siteAccess.includes('all') ? {} : { site: { $in: req.user.siteAccess } };
  const devices = await Device.find(query).populate('gateway', 'name ipAddress status').sort('-createdAt');
  res.json(devices);
});

router.post('/', async (req, res) => {
  const device = await Device.create({ ...req.body, createdBy: req.user._id });
  res.status(201).json(device);
});

router.put('/:id', async (req, res) => {
  const device = await Device.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!device) return res.status(404).json({ message: 'Not found' });
  res.json(device);
});

router.delete('/:id', async (req, res) => {
  await Device.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

router.patch('/:id/register-map', async (req, res) => {
  const device = await Device.findByIdAndUpdate(
    req.params.id,
    { registerMap: req.body.registerMap },
    { new: true }
  );
  res.json(device);
});

module.exports = router;
