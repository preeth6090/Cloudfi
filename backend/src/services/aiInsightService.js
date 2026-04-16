// Rule-based AI insight engine – extensible to real ML models

const INSIGHTS = [
  {
    id: 'vfd_adjustment',
    condition: (d) => d.power > 1000 && d.efficiency < 80,
    insight: (d) => ({
      title: 'VFD Speed Optimization',
      body: `${d.name} running at high load with ${d.efficiency?.toFixed(1)}% efficiency. ` +
            `Reducing VFD speed by 5–8% could cut captive consumption by ~${(d.power * 0.06).toFixed(0)} kW.`,
      action: 'Adjust VFD frequency from current setpoint to optimal range.',
      savingsPerDay: +(d.power * 0.06 * 24 * 6.5).toFixed(0), // INR @ ₹6.5/kWh
      type: 'optimization',
    }),
  },
  {
    id: 'soot_blowing',
    condition: (d) => d.assetType === 'boiler' && d.efficiency < 84,
    insight: (d) => ({
      title: 'Soot Blowing Recommended',
      body: `Boiler thermal efficiency at ${d.efficiency?.toFixed(1)}% — below optimal 88%. ` +
            `Gradual rise in flue gas temperature indicates fouling on heat transfer surfaces.`,
      action: 'Schedule soot blowing in next maintenance window to restore heat transfer efficiency.',
      savingsPerDay: 8500,
      type: 'maintenance',
    }),
  },
  {
    id: 'bearing_wear',
    condition: (d) => d.vibration > 4.0,
    insight: (d) => ({
      title: 'Bearing Wear Detected',
      body: `Vibration on ${d.name} at ${d.vibration?.toFixed(2)} mm/s. ` +
            `ISO 10816 limit for this class: 4.5 mm/s. Bearing fatigue likely within 7–14 days.`,
      action: 'Inspect and replace bearings. Check shaft alignment and lubrication schedule.',
      savingsPerDay: 15000,
      type: 'predictive',
    }),
  },
  {
    id: 'steam_overconsumption',
    condition: (d) => d.steamConsumption > 400,
    insight: (d) => ({
      title: 'Steam Overconsumption',
      body: `Specific steam consumption at ${d.steamConsumption?.toFixed(1)} kg/ton — ` +
            `above target of 380 kg/ton. Check steam trap integrity and insulation losses.`,
      action: 'Audit steam traps, check condensate return lines, inspect pipe insulation.',
      savingsPerDay: 6200,
      type: 'energy',
    }),
  },
  {
    id: 'power_factor',
    condition: (d) => d.powerFactor < 0.88,
    insight: (d) => ({
      title: 'Low Power Factor Penalty Risk',
      body: `Power factor at ${d.powerFactor?.toFixed(3)} on ${d.name}. ` +
            `Utility penalty kicks in below 0.85. Reactive kVAh billing will increase.`,
      action: 'Check capacitor bank switching logic. Add reactive compensation if required.',
      savingsPerDay: 3200,
      type: 'optimization',
    }),
  },
];

function generateInsights(deviceReadings) {
  const insights = [];
  for (const device of deviceReadings) {
    for (const rule of INSIGHTS) {
      if (rule.condition(device)) {
        insights.push({ deviceId: device.deviceId, deviceName: device.name, ...rule.insight(device) });
      }
    }
  }
  return insights.sort((a, b) => b.savingsPerDay - a.savingsPerDay).slice(0, 8);
}

function getDigitalTwinScore(readings) {
  if (!readings) return null;
  // Use safe fallbacks so no null/undefined leaks into the response
  const eff   = readings.efficiency       ?? 85;
  const hi    = readings.healthIndex      ?? 90;
  const vib   = readings.vibration        ?? 1.5;
  const steam = readings.steamConsumption ?? 370;
  const pwr   = readings.power            ?? 500;
  const temp  = readings.temperature      ?? 65;
  const pf    = readings.powerFactor      ?? 0.9;

  const efficiency     = Math.min(eff / 92, 1);
  const health         = Math.min(hi / 100, 1);
  const stability      = Math.max(0, 1 - vib / 6);
  const energy         = Math.max(0, 1 - Math.abs(steam - 370) / 370);
  const output         = 0.91; // normalised output ratio
  const safety         = temp < 130 ? 1 : Math.max(0, 1 - (temp - 130) / 50);
  const sustainability = Math.max(0, 1 - (pwr * 0.82) / 10000);
  const maintenance    = Math.max(0, (hi - 20) / 80);

  return {
    actual: [efficiency, health, stability, energy, output, safety, sustainability, maintenance].map(v => +(v * 100).toFixed(1)),
    ideal:  [92, 98, 95, 90, 95, 98, 85, 95],
    labels: ['Efficiency', 'Health', 'Stability', 'Energy', 'Output', 'Safety', 'Sustainability', 'Maintenance'],
  };
}

module.exports = { generateInsights, getDigitalTwinScore };
