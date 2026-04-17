import { useIoT } from '@/context/IoTContext';

const PROTOCOL_COLORS = {
  'Modbus-TCP':  'text-blue-400',
  'Modbus-RTU':  'text-blue-300',
  'DLMS-COSEM':  'text-accent',
  'CAN-Bus':     'text-warning',
  'IEC-61850':   'text-success',
  'DNP3':        'text-purple-400',
};

function HarmonicBar({ h, amplitude, maxAmp }) {
  const pct    = Math.min(100, (amplitude / (maxAmp || 1)) * 100);
  const isOdd  = h % 2 !== 0;
  const color  = h <= 3 ? '#7c3aed' : h <= 7 ? '#ec4899' : '#f59e0b';
  return (
    <div className="flex flex-col items-center gap-0.5" title={`H${h}: ${amplitude?.toFixed(3)}%`}>
      <div className="w-2.5 bg-surface rounded-sm overflow-hidden" style={{ height: 32 }}>
        <div className="w-full rounded-sm transition-all duration-300"
          style={{ height: `${pct}%`, backgroundColor: color, marginTop: `${100 - pct}%` }} />
      </div>
      <span className="text-[8px] text-muted">{h}</span>
    </div>
  );
}

export default function SignalHealthSparkline({ deviceId, compact = false }) {
  const { powerQuality } = useIoT();
  const pq = powerQuality[deviceId];

  if (!pq?.fft) {
    return (
      <div className="flex items-center justify-center h-16 text-muted text-[11px]">
        Awaiting signal data…
      </div>
    );
  }

  const { harmonicBins, signalHealth, thdCalculated, dominantHarmonic } = pq.fft;
  const maxAmp = Math.max(...(harmonicBins || []).map(b => b.amplitude));
  const healthColor = signalHealth > 85 ? 'text-success' : signalHealth > 65 ? 'text-warning' : 'text-danger';
  const protocolColor = PROTOCOL_COLORS[pq.protocol] || 'text-muted';

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className={`text-sm font-bold ${healthColor}`}>{signalHealth?.toFixed(0)}%</div>
        <div className="flex items-end gap-0.5 h-6">
          {(harmonicBins || []).slice(0, 7).map(b => (
            <div key={b.harmonic}
              className="w-1.5 rounded-sm"
              style={{ height: `${Math.max(2, (b.amplitude / maxAmp) * 24)}px`,
                backgroundColor: b.harmonic === 1 ? '#7c3aed' : b.harmonic <= 5 ? '#ec4899' : '#f59e0b' }} />
          ))}
        </div>
        <span className={`text-[9px] font-medium ${protocolColor}`}>{pq.protocol}</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <div className={`text-lg font-bold ${healthColor}`}>{signalHealth?.toFixed(1)}%</div>
            <div className="text-muted text-[10px]">Signal Health</div>
          </div>
          <div>
            <div className="text-text text-sm font-semibold">{thdCalculated?.toFixed(2)}%</div>
            <div className="text-muted text-[10px]">THD</div>
          </div>
          <div>
            <div className="text-warning text-sm font-semibold">H{dominantHarmonic}</div>
            <div className="text-muted text-[10px]">Dominant</div>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-xs font-semibold ${protocolColor}`}>{pq.protocol}</div>
          <div className="text-muted text-[9px]">Protocol</div>
        </div>
      </div>

      {/* Harmonic spectrum bars */}
      <div>
        <div className="text-[10px] text-muted mb-1.5">Harmonic Spectrum (H1–H7)</div>
        <div className="flex items-end gap-1">
          {(harmonicBins || []).slice(0, 7).map(b => (
            <HarmonicBar key={b.harmonic} h={b.harmonic} amplitude={b.amplitude} maxAmp={maxAmp} />
          ))}
          <div className="flex-1" />
          {/* Anomaly badge */}
          {pq.anomalySeverity && pq.anomalySeverity !== 'normal' && (
            <div className={`text-[9px] px-2 py-0.5 rounded-full font-semibold ${
              pq.anomalySeverity === 'critical' ? 'bg-danger/15 text-danger' : 'bg-warning/15 text-warning'}`}>
              {pq.anomalySeverity}
            </div>
          )}
        </div>
      </div>

      {/* Virtual params mini-strip */}
      {pq.virtualParams && (
        <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-border">
          {[
            { label: 'THD-V', value: `${pq.virtualParams.THD_V?.toFixed(2)}%` },
            { label: 'THD-I', value: `${pq.virtualParams.THD_I?.toFixed(2)}%` },
            { label: 'K-Factor', value: pq.virtualParams.kFactor?.toFixed(2) },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <div className="text-text text-xs font-semibold">{value}</div>
              <div className="text-muted text-[9px]">{label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
