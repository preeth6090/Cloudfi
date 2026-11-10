const router = require('express').Router();
const Gateway = require('../models/Gateway');
const { protect, siteFilter } = require('../middleware/auth');

router.use(protect);

router.get('/', async (req, res) => {
  res.json(await Gateway.list(siteFilter(req.user)));
});

router.post('/', async (req, res) => {
  const gw = await Gateway.create({ ...req.body, createdBy: req.user._id });
  res.status(201).json(gw);
});

router.put('/:id', async (req, res) => {
  const { createdBy, ...body } = req.body || {};
  const gw = await Gateway.update(req.params.id, body);
  if (!gw) return res.status(404).json({ message: 'Not found' });
  res.json(gw);
});

router.delete('/:id', async (req, res) => {
  await Gateway.remove(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;
