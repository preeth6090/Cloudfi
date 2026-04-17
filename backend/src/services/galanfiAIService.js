// Galanfi AI Service — consumes FFT + virtual parameters, outputs Anomaly Score
// and enriched Digital Twin axes for the Power Quality radar

const { simulateFFT } = require('../utils/fftSimulator');

// Anomaly thresholds
const THRESHOLDS = {
  thdV:           5.0,   // %  (IEEE 519)
  thdI:           8.0,   // %
  voltUnbalance:  2.0,   // %  (NEMA MG-1)
  kFactor:        4.0,   // derating risk
  signalHealth:   70,    // below = anomalous
  fundamentalDip: 0.85,  // relative to nominal
};

function computeAnomalyScore(reading, virtualParams, fftResult) {
  const scores = [];

  // THD penalty
  const thdVRatio = (virtualParams.THD_V || 0) / THRESHOLDS.thdV;
  scores.push({ name: 'Voltage THD',   score: Math.min(1, thdVRatio),   weight: 0.25 });

  const thdIRatio = (virtualParams.THD_I || 0) / THRESHOLDS.thdI;
  scores.push({ name: 'Current THD',   score: Math.min(1, thdIRatio),   weight: 0.20 });

  // Voltage unbalance
  const unbalRatio = (virtualParams.voltUnbalancePct || 0) / THRESHOLDS.voltUnbalance;
  scores.push({ name: 'Volt Unbalance', score: Math.min(1, unbalRatio), weight: 0.15 });

  // K-Factor (transformer derating)
  const kfRatio = (virtualParams.kFactor || 1) / THRESHOLDS.kFactor;
  scores.push({ name: 'K-Factor',       score: Math.min(1, kfRatio - 0.25), weight: 0.15 });

  // Signal health from FFT
  const healthRatio = 1 - (fftResult.signalHealth || 100) / 100;
  scores.push({ name: 'Signal Health', score: Math.min(1, healthRatio * 2), weight: 0.15 });

  // Power factor deviation
  const pfDev = Math.max(0, 0.92 - (reading.powerFactor || 0.9));
  scores.push({ name: 'Power Factor',  score: Math.min(1, pfDev * 20),      weight: 0.10 });

  const anomalyScore = scores.reduce((s, e) => s + e.score * e.weight, 0);

  return {
    anomalyScore:   +Math.min(100, anomalyScore * 100).toFixed(1),
    severity:       anomalyScore > 0.6 ? 'critical' : anomalyScore > 0.35 ? 'warning' : 'normal',
    components:     scores.map(s => ({ ...s, score: +s.score.toFixed(3) })),
    recommendation: buildRecommendation(scores, virtualParams),
  };
}

function buildRecommendation(scores, vp) {
  const top = scores.sort((a, b) => b.score * b.weight - a.score * a.weight)[0];
  const recs = {
    'Voltage THD':    'Install passive harmonic filter at PCC. Check for non-linear loads on feeder.',
    'Current THD':    'Add active front-end drive or 18-pulse rectifier to reduce current harmonics.',
    'Volt Unbalance': 'Redistribute single-phase loads. Check for open delta transformer connection.',
    'K-Factor':       'Derate transformer or install K-rated transformer (K-13 or K-20).',
    'Signal Health':  'Inspect cable insulation and earthing. Check for inter-turn short in motor winding.',
    'Power Factor':   'Switch in capacitor bank. Audit reactive compensation at MCC level.',
  };
  return recs[top?.name] || 'System operating within acceptable limits.';
}

// Power Quality Digital Twin axes — maps to the existing 8-axis radar
function getPowerQualityTwin(reading, virtualParams, fftResult) {
  const pf   = reading.powerFactor ?? 0.9;
  const thd  = virtualParams.THD_V ?? 3;
  const unb  = virtualParams.voltUnbalancePct ?? 0.5;
  const freq = virtualParams.freqHz ?? 50;
  const sh   = fftResult.signalHealth ?? 90;
  const hi   = reading.healthIndex ?? 90;
  const eff  = reading.efficiency  ?? 85;
  const kf   = virtualParams.kFactor ?? 1.5;

  const actual = [
    +(Math.min(pf / 0.95, 1) * 100).toFixed(1),               // Power Factor
    +(Math.max(0, 1 - thd / 10) * 100).toFixed(1),            // Harmonics (lower THD = better)
    +(Math.max(0, 1 - unb / 3) * 100).toFixed(1),             // Voltage Balance
    +(sh).toFixed(1),                                          // Signal Health (FFT)
    +(Math.max(0, 1 - Math.abs(freq - 50) / 0.5) * 100).toFixed(1), // Frequency Stability
    +(Math.min(hi / 100, 1) * 100).toFixed(1),                // Asset Health
    +(Math.min(eff / 92, 1) * 100).toFixed(1),                // Efficiency
    +(Math.max(0, 1 - (kf - 1) / 5) * 100).toFixed(1),       // Grid Compliance (K-Factor)
  ];

  return {
    actual,
    ideal:  [95, 90, 98, 92, 99, 95, 92, 88],
    labels: ['Power Factor','Harmonics','Volt Balance','Signal Health','Freq Stability','Asset Health','Efficiency','Grid Compliance'],
    anomaly: computeAnomalyScore(reading, virtualParams, fftResult),
  };
}

module.exports = { computeAnomalyScore, getPowerQualityTwin, simulateFFT };
