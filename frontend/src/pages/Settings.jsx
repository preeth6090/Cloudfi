import { useAuth } from '@/context/AuthContext';
import { useIoT } from '@/context/IoTContext';

export default function Settings() {
  const { user } = useAuth();
  const { connected } = useIoT();

  return (
    <div className="flex flex-col gap-4 animate-fade-in max-w-2xl">
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-text font-medium text-sm mb-4">Platform Status</h3>
        <div className="space-y-3 text-sm">
          <Row label="Socket.io Connection" value={connected ? 'Connected' : 'Disconnected'} color={connected ? 'text-success' : 'text-danger'} />
          <Row label="Signed In As" value={`${user?.name} (${user?.email})`} />
          <Row label="Role" value={user?.role?.replace('_',' ')} color="text-primary" />
          <Row label="Site Access" value={(user?.siteAccess||[]).join(', ')} />
          <Row label="Platform Version" value="CloudFi 4.0" />
          <Row label="Data Simulator" value="Running (2s tick)" color="text-success" />
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-text font-medium text-sm mb-3">Google OAuth Setup</h3>
        <div className="space-y-2 text-xs text-muted">
          <p>1. Go to <span className="text-primary">console.cloud.google.com</span> → APIs & Services → Credentials</p>
          <p>2. Create OAuth 2.0 Client ID (Web application)</p>
          <p>3. Add Authorized redirect URI: <code className="bg-surface px-1.5 py-0.5 rounded text-text">http://localhost:5000/api/auth/google/callback</code></p>
          <p>4. Copy Client ID and Secret into <code className="bg-surface px-1.5 py-0.5 rounded text-text">backend/.env</code></p>
          <p>5. Restart the backend server</p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, color = 'text-text' }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
      <span className="text-muted text-xs">{label}</span>
      <span className={`font-medium text-xs capitalize ${color}`}>{value}</span>
    </div>
  );
}
