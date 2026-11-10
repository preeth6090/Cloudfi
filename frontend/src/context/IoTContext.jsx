import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import api from '@/api/client';
import { useAuth } from './AuthContext';

const IoTContext = createContext(null);
const POLL_MS      = 2000;
const MAX_HISTORY  = 60;
const UI_FLUSH_MS  = 150; // batch UI updates to prevent jank on high-freq CloudFi streams

export function IoTProvider({ children }) {
  const { user } = useAuth();
  const [telemetry,    setTelemetry]    = useState({});
  const [history,      setHistory]      = useState({});
  const [plantSummary, setPlantSummary] = useState({});
  const [alerts,       setAlerts]       = useState([]);
  const [connected,    setConnected]    = useState(false);
  // CloudFi high-freq power-quality data (separate to avoid re-rendering widgets)
  const [powerQuality, setPowerQuality] = useState({}); // { [deviceId]: {fft, anomalyScore, ...} }

  const telemetryBuf   = useRef({});  // accumulate between flushes
  const historyBuf     = useRef({});
  const pqBuf          = useRef({});
  const flushTimer     = useRef(null);

  // Kept for compatibility: the server already filters by the user's site access.
  const joinSite = useCallback(() => {}, []);

  // Flush batched state to React every UI_FLUSH_MS
  function scheduleFlush() {
    if (flushTimer.current) return;
    flushTimer.current = setTimeout(() => {
      flushTimer.current = null;
      if (Object.keys(telemetryBuf.current).length) {
        setTelemetry(prev => ({ ...prev, ...telemetryBuf.current }));
        telemetryBuf.current = {};
      }
      if (Object.keys(historyBuf.current).length) {
        setHistory(prev => {
          const next = { ...prev };
          for (const [id, newPts] of Object.entries(historyBuf.current)) {
            const arr = [...(prev[id] || []), ...newPts];
            next[id]  = arr.length > MAX_HISTORY ? arr.slice(-MAX_HISTORY) : arr;
          }
          return next;
        });
        historyBuf.current = {};
      }
      if (Object.keys(pqBuf.current).length) {
        setPowerQuality(prev => ({ ...prev, ...pqBuf.current }));
        pqBuf.current = {};
      }
    }, UI_FLUSH_MS);
  }

  // Poll /api/live every POLL_MS (replaces the old socket.io stream).
  useEffect(() => {
    if (!user) return;
    let stopped  = false;
    let since    = null;   // server time of the previous poll, for new alerts
    let pollTimer = null;
    const lastTs = {};     // last reading timestamp per device, to skip repeats

    function onTelemetry(payload) {
      const id = payload.deviceId;
      if (lastTs[id] === payload.timestamp) return;
      lastTs[id] = payload.timestamp;
      // Buffer core telemetry
      telemetryBuf.current[id] = payload;
      // Buffer history point (strip heavy custom field for history to save memory)
      const slim = { ...payload, custom: undefined };
      historyBuf.current[id]   = [...(historyBuf.current[id] || []), slim];
      // Buffer CloudFi power-quality separately
      if (payload.custom) {
        pqBuf.current[id] = {
          anomalyScore:    payload.custom.anomalyScore,
          anomalySeverity: payload.custom.anomalySeverity,
          fft:             payload.custom.fft,
          virtualParams:   payload.custom.virtualParams,
          protocol:        payload.custom.protocol,
          protocolMeta:    payload.custom.protocolMeta,
        };
      }
    }

    async function poll() {
      try {
        const { data } = await api.get('/live', { params: since ? { since } : {} });
        if (stopped) return;
        since = data.serverTime;
        setConnected(true);
        data.telemetry.forEach(onTelemetry);
        if (data.telemetry.length) scheduleFlush();
        if (data.plantSummary.length) {
          setPlantSummary(prev => {
            const next = { ...prev };
            data.plantSummary.forEach(s => { next[s.site] = s; });
            return next;
          });
        }
        if (data.alerts.length) {
          setAlerts(prev => {
            const seen  = new Set(prev.map(a => a._id));
            const fresh = data.alerts.filter(a => !seen.has(a._id));
            return [...fresh, ...prev].slice(0, 100);
          });
        }
      } catch {
        if (!stopped) setConnected(false);
      } finally {
        if (!stopped) pollTimer = setTimeout(poll, POLL_MS);
      }
    }
    poll();

    return () => {
      stopped = true;
      clearTimeout(pollTimer);
      if (flushTimer.current) clearTimeout(flushTimer.current);
    };
  }, [user]);

  return (
    <IoTContext.Provider value={{ telemetry, history, plantSummary, alerts, connected, powerQuality, joinSite }}>
      {children}
    </IoTContext.Provider>
  );
}

export const useIoT = () => useContext(IoTContext);
