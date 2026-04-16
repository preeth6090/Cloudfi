import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { Outlet, useLocation } from 'react-router-dom';

const TITLES = {
  '/dashboard':    'Dashboard',
  '/devices':      'Device Manager',
  '/gateways':     'Gateway Manager',
  '/analytics':    'Analytics',
  '/digital-twin': 'Digital Twin',
  '/maintenance':  'Predictive Maintenance',
  '/esg':          'ESG & Carbon Footprint',
  '/reports':      'Reports',
  '/users':        'User Management',
  '/settings':     'Settings',
};

export default function AppLayout() {
  const { pathname } = useLocation();
  const title = TITLES[pathname] || 'CloudFi';

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar title={title} />
        <main className="flex-1 overflow-auto p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
