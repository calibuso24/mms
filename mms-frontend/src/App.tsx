import { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import AppLayout from './shared/components/AppLayout.js';
import LoginPage from './pages/Login.js';
import MaterialsPage from './pages/Materials.js';
import { AuthProvider, useAuth } from './shared/contexts/auth.js';
import './shared/styles/theme.css';
import './shared/styles/auth.css';

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
  return <MaterialsPage />;
}

function SettingsPage() {
  return (
    <div className="page-card">
      <div className="page-title">Settings</div>
      <p className="page-copy">System settings and user preferences can be configured from this module.</p>
    </div>
  );
}

function AppShell() {
  const { isLoggedIn, logout, account } = useAuth();
  const [activeMenu, setActiveMenu] = useState<MenuKey>('dashboard');
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
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
      <Route path="/login" element={isLoggedIn ? <Navigate to="/app" replace /> : <LoginPage />} />
      <Route
        path="/app"
        element={
          isLoggedIn ? (
            <AppLayout
              activeMenu={activeMenu}
              onSelectMenu={setActiveMenu}
              onLogout={handleLogout}
              userName={account?.full_name || account?.account_name || 'User'}
            >
              {renderContent()}
            </AppLayout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route path="/" element={<Navigate to={isLoggedIn ? '/app' : '/login'} replace />} />
      <Route path="*" element={<Navigate to={isLoggedIn ? '/app' : '/login'} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </BrowserRouter>
  );
}
