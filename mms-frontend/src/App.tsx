import { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import AppLayout from './shared/components/AppLayout';
import './shared/styles/theme.css';

type MenuKey = 'dashboard' | 'purchasing' | 'inventory' | 'reports' | 'masterlist' | 'settings';

function DashboardPage() {
  return (
    <div className="page-card">
      <div className="page-title">Dashboard</div>
      <p className="page-copy">Welcome to the MMS shell. This is the first layout milestone for module-based development.</p>
      <div className="stat-grid">
        <div className="stat-box">
          <div className="stat-label">Open Requests</div>
          <div className="stat-value">24</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Pending POs</div>
          <div className="stat-value">8</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Stock Transfers</div>
          <div className="stat-value">15</div>
        </div>
      </div>
    </div>
  );
}

function PurchasingPage() {
  return (
    <div className="page-card">
      <div className="page-title">Purchasing Transactions</div>
      <p className="page-copy">This section will host purchase order and supplier workflows once the purchasing module is implemented.</p>
    </div>
  );
}

function InventoryPage() {
  return (
    <div className="page-card">
      <div className="page-title">Inventory Transactions</div>
      <p className="page-copy">Inventory movement, stock transfers, and stock balance views will appear here.</p>
    </div>
  );
}

function ReportsPage() {
  return (
    <div className="page-card">
      <div className="page-title">Reports</div>
      <p className="page-copy">Operational and financial reports will be grouped in this area.</p>
    </div>
  );
}

function MasterlistPage() {
  return (
    <div className="page-card">
      <div className="page-title">Masterlist</div>
      <p className="page-copy">Materials, categories, brands, and UOM catalog management will be added here.</p>
    </div>
  );
}

function SettingsPage() {
  return (
    <div className="page-card">
      <div className="page-title">Settings</div>
      <p className="page-copy">System settings and user preferences can be configured from this module.</p>
    </div>
  );
}

function LoginPage({ onLogin }: { onLogin: (username: string, password: string) => void }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onLogin(username, password);
  };

  return (
    <div className="app-bg login-bg">
      <div className="login-shell">
        <div className="login-card">
          <div className="login-title">Materials Management System</div>
          <p className="login-subtitle">Sign in to continue to the operations workspace</p>
          <form onSubmit={handleSubmit} className="login-form">
            <label className="field-label" htmlFor="username">Username</label>
            <input id="username" className="input" value={username} onChange={(event) => setUsername(event.target.value)} />
            <label className="field-label" htmlFor="password">Password</label>
            <input id="password" className="input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            <button className="btn primary" type="submit">Sign In</button>
          </form>
          <div className="login-hint">Demo login: admin / admin</div>
        </div>
      </div>
    </div>
  );
}

function AppShell() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeMenu, setActiveMenu] = useState<MenuKey>('dashboard');
  const navigate = useNavigate();

  const handleLogin = (_username: string, _password: string) => {
    setIsAuthenticated(true);
    navigate('/app');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    navigate('/login');
  };

  const renderContent = () => {
    switch (activeMenu) {
      case 'purchasing':
        return <PurchasingPage />;
      case 'inventory':
        return <InventoryPage />;
      case 'reports':
        return <ReportsPage />;
      case 'masterlist':
        return <MasterlistPage />;
      case 'settings':
        return <SettingsPage />;
      case 'dashboard':
      default:
        return <DashboardPage />;
    }
  };

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/app" replace /> : <LoginPage onLogin={handleLogin} />} />
      <Route
        path="/app"
        element={
          isAuthenticated ? (
            <AppLayout activeMenu={activeMenu} onSelectMenu={setActiveMenu} onLogout={handleLogout}>
              {renderContent()}
            </AppLayout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route path="/" element={<Navigate to={isAuthenticated ? '/app' : '/login'} replace />} />
      <Route path="*" element={<Navigate to={isAuthenticated ? '/app' : '/login'} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
