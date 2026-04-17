import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const IoTContext = createContext(null);
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

  const socketRef      = useRef(null);
  const telemetryBuf   = useRef({});  // accumulate between flushes
  const historyBuf     = useRef({});
  const pqBuf          = useRef({});
  const flushTimer     = useRef(null);

  const joinSite = useCallback((site) => {
    socketRef.current?.emit('join_site', site);
  }, []);

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

  useEffect(() => {
    if (!user) return;
    const backendUrl = import.meta.env.VITE_API_URL || '';
    const socket = io(backendUrl, { path: '/socket.io', transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join_site', 'all');
      (user.siteAccess || []).forEach(s => s !== 'all' && socket.emit('join_site', s));
    });
    socket.on('disconnect', () => setConnected(false));

    socket.on('telemetry', (payload) => {
      const id = payload.deviceId;
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
      scheduleFlush();
    });

    socket.on('plant_summary', (summary) => {
      setPlantSummary(prev => ({ ...prev, [summary.site]: summary }));
    });
    socket.on('new_alert', (alert) => {
      setAlerts(prev => [alert, ...prev].slice(0, 100));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
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
