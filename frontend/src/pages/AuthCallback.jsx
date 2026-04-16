import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Zap } from 'lucide-react';

export default function AuthCallback() {
  const [params] = useSearchParams();
  const { setToken } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const token = params.get('token');
    const error = params.get('error');
    if (error) { navigate('/login?error=' + error, { replace: true }); return; }
    if (token) {
      setToken(token);
      setTimeout(() => navigate('/dashboard', { replace: true }), 500);
    } else {
      navigate('/login', { replace: true });
    }
  }, [params, setToken, navigate]);

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center animate-pulse">
          <Zap size={24} className="text-white" />
        </div>
        <p className="text-muted text-sm">Signing you in…</p>
      </div>
    </div>
  );
}
