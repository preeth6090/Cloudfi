// FFT simulation for industrial power signal health analysis
// Models 50 Hz fundamental + harmonics using synthetic DFT

const FUNDAMENTAL_HZ = 50;
const SAMPLE_RATE     = 1000; // samples/sec
const WINDOW_SIZE     = 256;

function generateSignalSamples(voltage, thd, phaseAngle) {
  const samples = [];
  const thdRatio = (thd || 3) / 100;
  for (let n = 0; n < WINDOW_SIZE; n++) {
    const t = n / SAMPLE_RATE;
    let v = Math.sqrt(2) * voltage * Math.sin(2 * Math.PI * FUNDAMENTAL_HZ * t + phaseAngle);
    // add harmonic distortion components
    for (let h = 2; h <= 7; h++) {
      const amp = (thdRatio * voltage) / (h * h);
      v += amp * Math.sin(2 * Math.PI * FUNDAMENTAL_HZ * h * t + phaseAngle * h);
    }
    samples.push(v);
  }
  return samples;
}

function dft(samples, maxBins = 32) {
  const N = samples.length;
  const bins = [];
  for (let k = 0; k < maxBins; k++) {
    let re = 0, im = 0;
    for (let n = 0; n < N; n++) {
      const angle = (2 * Math.PI * k * n) / N;
      re += samples[n] * Math.cos(angle);
      im -= samples[n] * Math.sin(angle);
    }
    re /= N; im /= N;
    bins.push({ k, magnitude: +Math.sqrt(re * re + im * im).toFixed(4), phase: +Math.atan2(im, re).toFixed(4) });
  }
  return bins;
}

function simulateFFT(reading) {
  const voltage    = reading.voltage    || 415;
  const thd        = reading.thd        || (reading.powerFactor ? (1 - reading.powerFactor) * 8 : 3);
  const phaseAngle = reading.phaseAngle || 0;

  const samples = generateSignalSamples(voltage, thd, phaseAngle);

  // Use simplified DFT on smaller window for speed
  const window32 = samples.slice(0, 64);
  const N = window32.length;
  const harmonicBins = [];
  for (let h = 1; h <= 7; h++) {
    const k = Math.round(h * FUNDAMENTAL_HZ * N / SAMPLE_RATE);
    let re = 0, im = 0;
    for (let n = 0; n < N; n++) {
      const angle = (2 * Math.PI * k * n) / N;
      re += window32[n] * Math.cos(angle);
      im -= window32[n] * Math.sin(angle);
    }
    re /= N; im /= N;
    harmonicBins.push({
      harmonic:  h,
      frequency: +(FUNDAMENTAL_HZ * h).toFixed(1),
      amplitude: +Math.sqrt(re * re + im * im).toFixed(3),
      phase:     +Math.atan2(im, re).toFixed(3),
    });
  }

  const fundamental = harmonicBins[0]?.amplitude || 1;
  const totalHarmonicPower = harmonicBins.slice(1).reduce((s, b) => s + b.amplitude * b.amplitude, 0);
  const thdCalc = fundamental > 0 ? Math.sqrt(totalHarmonicPower) / fundamental * 100 : 0;
  const signalHealth = Math.max(0, Math.min(100, 100 - thdCalc * 2.5));

  const dominantHarmonic = harmonicBins
    .slice(1)
    .sort((a, b) => b.amplitude - a.amplitude)[0]?.harmonic || 1;

  return {
    harmonicBins,
    thdCalculated:    +thdCalc.toFixed(2),
    signalHealth:     +signalHealth.toFixed(1),
    dominantHarmonic,
    fundamentalAmplitude: +fundamental.toFixed(3),
    samplingRate:     SAMPLE_RATE,
    windowSize:       N,
  };
}

module.exports = { simulateFFT };
