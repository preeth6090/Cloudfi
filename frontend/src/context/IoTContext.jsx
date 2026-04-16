import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const IoTContext = createContext(null);

// Latest telemetry keyed by deviceId
const MAX_HISTORY = 60;

export function IoTProvider({ children }) {
  const { user } = useAuth();
  const [telemetry, setTelemetry]       = useState({});   // { [deviceId]: latestReading }
  const [history, setHistory]           = useState({});   // { [deviceId]: reading[] }
  const [plantSummary, setPlantSummary] = useState({});   // { [site]: summary }
  const [alerts, setAlerts]             = useState([]);
  const [connected, setConnected]       = useState(false);
  const socketRef = useRef(null);

  const joinSite = useCallback((site) => {
    socketRef.current?.emit('join_site', site);
  }, []);

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
      setTelemetry(prev => ({ ...prev, [payload.deviceId]: payload }));
      setHistory(prev => {
        const arr = prev[payload.deviceId] || [];
        const next = [...arr, payload];
        return { ...prev, [payload.deviceId]: next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next };
      });
    });

    socket.on('plant_summary', (summary) => {
      setPlantSummary(prev => ({ ...prev, [summary.site]: summary }));
    });

    socket.on('new_alert', (alert) => {
      setAlerts(prev => [alert, ...prev].slice(0, 100));
    });

    return () => { socket.disconnect(); socketRef.current = null; };
  }, [user]);

  return (
    <IoTContext.Provider value={{ telemetry, history, plantSummary, alerts, connected, joinSite }}>
      {children}
    </IoTContext.Provider>
  );
}

export const useIoT = () => useContext(IoTContext);
