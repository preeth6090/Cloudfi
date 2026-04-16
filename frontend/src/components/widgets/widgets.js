export const WIDGET_TYPES = {
  POWER_GEN:       'power_generation',
  STEAM:           'steam_consumption',
  MACHINE_HEALTH:  'machine_health',
  AI_ANOMALY:      'ai_anomaly',
  ENERGY_COST:     'energy_cost',
  LIVE_FEED:       'live_feed',
  BOILER:          'boiler_efficiency',
  COGEN:           'cogen_balance',
  CARBON:          'carbon_footprint',
  PREDICTIVE:      'predictive_alerts',
};

export const WIDGET_META = {
  [WIDGET_TYPES.POWER_GEN]:      { label: 'Power Generation',       minW: 2, minH: 2, defaultW: 2, defaultH: 2 },
  [WIDGET_TYPES.STEAM]:          { label: 'Steam Consumption',       minW: 2, minH: 2, defaultW: 2, defaultH: 2 },
  [WIDGET_TYPES.MACHINE_HEALTH]: { label: 'Machine Health Index',    minW: 2, minH: 2, defaultW: 3, defaultH: 2 },
  [WIDGET_TYPES.AI_ANOMALY]:     { label: 'AI Anomaly Alerts',       minW: 2, minH: 3, defaultW: 3, defaultH: 3 },
  [WIDGET_TYPES.ENERGY_COST]:    { label: 'Energy Cost Savings',     minW: 2, minH: 2, defaultW: 2, defaultH: 2 },
  [WIDGET_TYPES.LIVE_FEED]:      { label: 'Live Meter Feed',         minW: 3, minH: 3, defaultW: 4, defaultH: 3 },
  [WIDGET_TYPES.BOILER]:         { label: 'Boiler Efficiency',       minW: 2, minH: 2, defaultW: 2, defaultH: 2 },
  [WIDGET_TYPES.COGEN]:          { label: 'Cogen Power Balance',     minW: 3, minH: 2, defaultW: 3, defaultH: 2 },
  [WIDGET_TYPES.CARBON]:         { label: 'Carbon Footprint',        minW: 2, minH: 2, defaultW: 2, defaultH: 2 },
  [WIDGET_TYPES.PREDICTIVE]:     { label: 'Predictive Alerts',       minW: 2, minH: 3, defaultW: 3, defaultH: 3 },
};

export const DEFAULT_LAYOUT = [
  { i: 'w1', type: WIDGET_TYPES.POWER_GEN,      x: 0, y: 0, w: 2, h: 2 },
  { i: 'w2', type: WIDGET_TYPES.STEAM,          x: 2, y: 0, w: 2, h: 2 },
  { i: 'w3', type: WIDGET_TYPES.MACHINE_HEALTH, x: 4, y: 0, w: 3, h: 2 },
  { i: 'w4', type: WIDGET_TYPES.ENERGY_COST,    x: 7, y: 0, w: 2, h: 2 },
  { i: 'w5', type: WIDGET_TYPES.COGEN,          x: 0, y: 2, w: 4, h: 3 },
  { i: 'w6', type: WIDGET_TYPES.AI_ANOMALY,     x: 4, y: 2, w: 3, h: 3 },
  { i: 'w7', type: WIDGET_TYPES.PREDICTIVE,     x: 7, y: 2, w: 3, h: 3 },
];
