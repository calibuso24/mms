import React, { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './shared/contexts/auth.js';
import { NavigationProvider, useNavigation } from './shared/contexts/navigation.js';
import { MainSidebar } from './shared/components/MainSidebar.js';
import { ReportsSidebar } from './shared/components/ReportsSidebar.js';
import LoginPage from './pages/Login.js';
import MaterialsPage from './pages/Materials.js';
import './shared/styles/theme.css';
import './shared/styles/auth.css';
import './shared/styles/sidebar.css';

function DefaultPage() {
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

function DynamicPage({ route }: { route: string | null }) {
  if (!route) {
    return <DefaultPage />;
  }

  if (route?.includes('dashboard')) {
    return <DefaultPage />;
  }

  if (route?.includes('product-management')) {
    return <MaterialsPage />;
  }

  return (
    <div className="page-card">
      <div className="page-title">{route}</div>
      <p className="page-copy">This page is under development.</p>
    </div>
  );
}

function AppShell() {
  const { isLoggedIn, logout, account } = useAuth();
  const { currentContext, setCurrentContext } = useNavigation();
  const navigate = useNavigate();
  const [currentRoute, setCurrentRoute] = useState('/dashboard');
  const [pageTitle, setPageTitle] = useState('Dashboard');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavigate = (route: string) => {
    setCurrentRoute(route);
    navigate(`/app${route}`);
  };

  const handleReportsClick = () => {
    setCurrentContext('REPORTS');
  };

  const handleBackToMain = () => {
    setCurrentContext('MAIN');
    setCurrentRoute('/dashboard');
    navigate('/app/dashboard');
  };

  const sidebarContent =
    currentContext === 'REPORTS' ? (
      <ReportsSidebar onNavigate={handleNavigate} onBack={handleBackToMain} />
    ) : (
      <MainSidebar
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        onReportsClick={handleReportsClick}
      />
    );

  return (
    <div className="app-bg">
      <div className="app-shell">
        {sidebarContent}
        <main className="content">
          <header className="header">
            <div>{pageTitle}</div>
            <div className="header-user">{account?.full_name || account?.account_name || 'User'}</div>
          </header>

          <div className="canvas">
            <DynamicPage route={currentRoute} />
          </div>

          <footer className="footer">MMS Operations Portal | Procurement | Inventory | Reporting</footer>
        </main>
      </div>
    </div>
  );
}

function AppShellWrapper() {
  const { isLoggedIn } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={isLoggedIn ? <Navigate to="/app" replace /> : <LoginPage />} />
      <Route path="/app/*" element={isLoggedIn ? <AppShell /> : <Navigate to="/login" replace />} />
      <Route path="/" element={<Navigate to={isLoggedIn ? '/app' : '/login'} replace />} />
      <Route path="*" element={<Navigate to={isLoggedIn ? '/app' : '/login'} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NavigationProvider>
          <AppShellWrapper />
        </NavigationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
