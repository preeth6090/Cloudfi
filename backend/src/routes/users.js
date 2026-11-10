const router = require('express').Router();
const User = require('../models/User');
const { protect, requireRole } = require('../middleware/auth');

router.use(protect);

router.get('/', requireRole('system_admin'), async (req, res) => {
  res.json(await User.list({ withGoogleId: false }));
});

router.patch('/:id', requireRole('system_admin'), async (req, res) => {
  const allowed = ['role', 'siteAccess', 'isActive', 'name'];
  const update = Object.fromEntries(Object.entries(req.body || {}).filter(([k]) => allowed.includes(k)));
  const user = await User.update(req.params.id, update, { withGoogleId: false });
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
});

router.delete('/:id', requireRole('system_admin'), async (req, res) => {
  if (req.params.id === req.user._id)
    return res.status(400).json({ message: 'Cannot delete yourself' });
  await User.remove(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;
