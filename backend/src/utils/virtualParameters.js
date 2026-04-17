// Virtual Power Parameter generator — produces 100+ parameters
// from base telemetry readings. Uses custom/metadata fields only (no schema change).

const PROTOCOLS = ['Modbus-TCP', 'Modbus-RTU', 'DLMS-COSEM', 'CAN-Bus', 'IEC-61850', 'DNP3'];
const ENABLED_PARAMS = new Set(); // populated at startup — all on by default

function buildVirtualParams(reading, protocolOverride) {
  const {
    voltage = 415, current = 50, power = 200, powerFactor = 0.9,
    temperature = 65, vibration = 1.5, frequency = 50,
    efficiency = 85, healthIndex = 90,
  } = reading;

  // ── Phase values (3-phase system) ───────────────────────────────────────
  const imbalance = 0.005 + Math.random() * 0.015; // 0.5–2% imbalance
  const V1 = +(voltage * (1 + imbalance)).toFixed(2);
  const V2 = +(voltage).toFixed(2);
  const V3 = +(voltage * (1 - imbalance)).toFixed(2);
  const I1 = +(current * (1 + imbalance * 1.2)).toFixed(3);
  const I2 = +(current).toFixed(3);
  const I3 = +(current * (1 - imbalance * 0.8)).toFixed(3);

  // ── Power calculations ───────────────────────────────────────────────────
  const S  = +(voltage * current * 1.732 / 1000).toFixed(3);   // kVA apparent
  const P  = +(S * powerFactor).toFixed(3);                    // kW active
  const Q  = +(Math.sqrt(Math.max(0, S*S - P*P))).toFixed(3);  // kVAr reactive
  const PF_L1 = +(powerFactor + (Math.random() - 0.5) * 0.02).toFixed(4);
  const PF_L2 = +(powerFactor + (Math.random() - 0.5) * 0.02).toFixed(4);
  const PF_L3 = +(powerFactor + (Math.random() - 0.5) * 0.02).toFixed(4);

  // ── Harmonic content H2–H50 (odd harmonics dominate in industry) ─────────
  const baseTHD = Math.max(1, (1 - powerFactor) * 10 + Math.random() * 2);
  const harmonics = {};
  for (let h = 2; h <= 50; h++) {
    const isOdd = h % 2 !== 0;
    // Triplen (3,9,15…) and 5th/7th dominate in industrial drives
    let amp;
    if (h === 3 || h === 9)  amp = baseTHD * 0.35 / Math.sqrt(h);
    else if (h === 5)        amp = baseTHD * 0.65;
    else if (h === 7)        amp = baseTHD * 0.50;
    else if (h === 11)       amp = baseTHD * 0.25;
    else if (h === 13)       amp = baseTHD * 0.18;
    else if (isOdd)          amp = baseTHD * 0.08 / h;
    else                     amp = baseTHD * 0.04 / h;
    harmonics[`H${h}`] = +(amp + Math.random() * 0.05).toFixed(4);
  }

  // ── THD ──────────────────────────────────────────────────────────────────
  const thdV = +(Math.sqrt(Object.values(harmonics).reduce((s, v) => s + v * v, 0))).toFixed(3);
  const thdI = +(thdV * (1.2 + Math.random() * 0.3)).toFixed(3);

  // ── Phase angles ─────────────────────────────────────────────────────────
  const phiBase = Math.acos(Math.max(0, Math.min(1, powerFactor)));
  const phi1 = +(phiBase * 180 / Math.PI + (Math.random() - 0.5) * 1.5).toFixed(3);
  const phi2 = +(120 + phi1 + (Math.random() - 0.5) * 0.5).toFixed(3);
  const phi3 = +(240 + phi1 + (Math.random() - 0.5) * 0.5).toFixed(3);

  // ── Frequency & stability ────────────────────────────────────────────────
  const freqDev  = +(frequency + (Math.random() - 0.5) * 0.08).toFixed(4);
  const freqROCF = +((Math.random() - 0.5) * 0.012).toFixed(5); // Hz/s

  // ── Voltage unbalance (IEC 61000-3-3) ────────────────────────────────────
  const voltUnbalance  = +(Math.abs(V1 - V3) / ((V1 + V2 + V3) / 3) * 100).toFixed(3);
  const currUnbalance  = +(Math.abs(I1 - I3) / ((I1 + I2 + I3) / 3) * 100).toFixed(3);

  // ── Power quality indices ─────────────────────────────────────────────────
  const crestFactor   = +(Math.sqrt(2) * (1 + thdV / 100)).toFixed(4);
  const kFactor       = +(1 + harmonics['H3'] * 9 + harmonics['H5'] * 25 + harmonics['H7'] * 49).toFixed(3);
  const displacementPF = +(Math.cos(phiBase)).toFixed(4);
  const truePF        = +(displacementPF / Math.sqrt(1 + Math.pow(thdI / 100, 2))).toFixed(4);

  // ── Thermal derating ─────────────────────────────────────────────────────
  const thermalDerating = +(100 - (temperature - 40) * 0.5 - kFactor * 2).toFixed(2);

  // ── Protocol metadata ────────────────────────────────────────────────────
  const protocol = protocolOverride || PROTOCOLS[Math.floor(Math.random() * PROTOCOLS.length)];
  const protocolMeta = {
    protocol,
    slaveId:      protocol.startsWith('Modbus') ? Math.floor(Math.random() * 247) + 1 : null,
    obisCode:     protocol === 'DLMS-COSEM'     ? `1.0.${Math.floor(Math.random()*100)}.7.0.255` : null,
    canId:        protocol === 'CAN-Bus'        ? `0x${(Math.floor(Math.random() * 0x7FF)).toString(16).padStart(3,'0').toUpperCase()}` : null,
    dataTimestamp: new Date().toISOString(),
    signalStrength: -65 - Math.floor(Math.random() * 30), // dBm
    retries:       Math.floor(Math.random() * 3),
    latencyMs:     +(Math.random() * 12 + 1).toFixed(1),
  };

  return { V1, V2, V3, I1, I2, I3, S_kVA: S, P_kW: P, Q_kVAr: Q,
    PF_L1, PF_L2, PF_L3, THD_V: thdV, THD_I: thdI,
    phi1, phi2, phi3, freqHz: freqDev, freqROCF,
    voltUnbalancePct: voltUnbalance, currUnbalancePct: currUnbalance,
    crestFactor, kFactor, displacementPF, truePF, thermalDerating,
    ...harmonics, protocolMeta };
}

// Toggle which params are computed (bandwidth management for cellular mode)
const PARAM_GROUPS = {
  core:       ['V1','V2','V3','I1','I2','I3','S_kVA','P_kW','Q_kVAr','THD_V','THD_I'],
  phaseAngles:['phi1','phi2','phi3'],
  harmonics:  Array.from({length:49},(_,i)=>`H${i+2}`),
  powerQuality:['PF_L1','PF_L2','PF_L3','crestFactor','kFactor','truePF','thermalDerating'],
  frequency:  ['freqHz','freqROCF','voltUnbalancePct','currUnbalancePct'],
};

function filterParams(params, activeGroups = Object.keys(PARAM_GROUPS)) {
  const allowed = new Set(activeGroups.flatMap(g => PARAM_GROUPS[g] || []));
  const filtered = { protocolMeta: params.protocolMeta };
  for (const [k, v] of Object.entries(params)) {
    if (k === 'protocolMeta') continue;
    if (allowed.has(k)) filtered[k] = v;
  }
  return filtered;
}

module.exports = { buildVirtualParams, filterParams, PARAM_GROUPS };
