import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '@/api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]                   = useState(null);
  const [loading, setLoading]             = useState(true);
  const [googleConfigured, setGoogleConf] = useState(false);

  const fetchMe = useCallback(async () => {
    const token = localStorage.getItem('cf_token');
    if (!token) { setLoading(false); return; }
    try {
      const { data } = await api.get('/auth/me');
      setUser(data);
    } catch {
      localStorage.removeItem('cf_token');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
    api.get('/auth/status').then(r => setGoogleConf(r.data.googleConfigured)).catch(() => {});
  }, [fetchMe]);

  const loginWithGoogle = () => { window.location.href = '/api/auth/google'; };

  const devLogin = async (name, email, role) => {
    const { data } = await api.post('/auth/dev-login', { name, email, role });
    localStorage.setItem('cf_token', data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('cf_token');
    setUser(null);
  };

  const setToken = (token) => {
    localStorage.setItem('cf_token', token);
    fetchMe();
  };

  return (
    <AuthContext.Provider value={{ user, loading, googleConfigured, loginWithGoogle, devLogin, logout, setToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
