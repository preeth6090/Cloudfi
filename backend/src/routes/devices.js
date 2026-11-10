const router = require('express').Router();
const Device = require('../models/Device');
const { protect, siteFilter } = require('../middleware/auth');

router.use(protect);

router.get('/', async (req, res) => {
  res.json(await Device.list(siteFilter(req.user)));
});

router.post('/', async (req, res) => {
  const device = await Device.create({ ...req.body, createdBy: req.user._id });
  res.status(201).json(device);
});

router.put('/:id', async (req, res) => {
  const { createdBy, ...body } = req.body || {};
  const device = await Device.update(req.params.id, body);
  if (!device) return res.status(404).json({ message: 'Not found' });
  res.json(device);
});

router.delete('/:id', async (req, res) => {
  await Device.remove(req.params.id);
  res.json({ message: 'Deleted' });
});

router.patch('/:id/register-map', async (req, res) => {
  const device = await Device.update(req.params.id, { registerMap: req.body.registerMap });
  res.json(device);
});

module.exports = router;
