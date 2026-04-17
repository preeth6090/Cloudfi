// Software Defined Intelligence — Gateway AI threshold management
// Allows remote update of per-device thresholds and virtual parameter toggles

const router = require('express').Router();
const { protect, requireRole } = require('../middleware/auth');
const { cacheGet, cacheSet } = require('../config/redis');
const { PARAM_GROUPS } = require('../utils/virtualParameters');

router.use(protect);

const CONFIG_TTL = 86400 * 30; // 30 days

function configKey(gatewayId) { return `gw:config:${gatewayId}`; }

// Default thresholds applied when none are set
const DEFAULT_THRESHOLDS = {
  thdV:           5.0,
  thdI:           8.0,
  voltUnbalance:  2.0,
  kFactor:        4.0,
  anomalyScore:   40,
  vibration:      4.5,
  temperature:    130,
  powerFactor:    0.85,
};

// GET /api/gateway-config/:gatewayId
router.get('/:gatewayId', async (req, res) => {
  const cfg = await cacheGet(configKey(req.params.gatewayId));
  res.json(cfg || {
    gatewayId:       req.params.gatewayId,
    thresholds:      DEFAULT_THRESHOLDS,
    activeParamGroups: Object.keys(PARAM_GROUPS),
    connectivityMode: 'mesh',    // 'mesh' | 'cellular'
    updateInterval:   2000,
    lastUpdated:      null,
  });
});

// POST /api/gateway-config/:gatewayId — update AI thresholds (supervisor+)
router.post('/:gatewayId', requireRole('supervisor', 'system_admin'), async (req, res) => {
  const existing = (await cacheGet(configKey(req.params.gatewayId))) || {};
  const updated = {
    ...existing,
    gatewayId:   req.params.gatewayId,
    thresholds:  { ...DEFAULT_THRESHOLDS, ...(existing.thresholds || {}), ...(req.body.thresholds || {}) },
    lastUpdated: new Date().toISOString(),
    updatedBy:   req.user?.email,
  };
  await cacheSet(configKey(req.params.gatewayId), updated, CONFIG_TTL);
  res.json({ ok: true, config: updated });
});

// POST /api/gateway-config/:gatewayId/parameters — toggle virtual param groups
// e.g. { activeGroups: ['core','phaseAngles'] } to reduce cellular bandwidth
router.post('/:gatewayId/parameters', requireRole('supervisor', 'system_admin'), async (req, res) => {
  const { activeGroups, connectivityMode } = req.body;
  if (!Array.isArray(activeGroups))
    return res.status(400).json({ message: 'activeGroups array required' });

  const valid = activeGroups.filter(g => PARAM_GROUPS[g]);
  if (valid.length === 0)
    return res.status(400).json({ message: `Valid groups: ${Object.keys(PARAM_GROUPS).join(', ')}` });

  const existing = (await cacheGet(configKey(req.params.gatewayId))) || {};
  const updated = {
    ...existing,
    gatewayId:         req.params.gatewayId,
    activeParamGroups: valid,
    connectivityMode:  connectivityMode || existing.connectivityMode || 'mesh',
    lastUpdated:       new Date().toISOString(),
    updatedBy:         req.user?.email,
  };
  await cacheSet(configKey(req.params.gatewayId), updated, CONFIG_TTL);

  const savedBw = Object.keys(PARAM_GROUPS).length - valid.length;
  res.json({
    ok: true, config: updated,
    paramGroupsActive: valid,
    paramGroupsDisabled: Object.keys(PARAM_GROUPS).filter(g => !valid.includes(g)),
    bandwidthReduction: `~${(savedBw / Object.keys(PARAM_GROUPS).length * 100).toFixed(0)}%`,
  });
});

// GET /api/gateway-config/param-groups — list all available groups
router.get('/meta/param-groups', (_req, res) => {
  res.json(Object.entries(PARAM_GROUPS).map(([name, params]) => ({
    name, paramCount: params.length, params,
  })));
});

module.exports = router;
