import React, { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { Box, Container, CssBaseline, Paper } from '@mui/material';
import { AuthProvider, useAuth } from './shared/contexts/auth.js';
import { NavigationProvider, useNavigation } from './shared/contexts/navigation.js';
import { MainSidebar } from './shared/components/Sidebar.js';
import { ReportsSidebar } from './shared/components/ReportsSidebarMUI.js';
import { TopBar } from './shared/components/TopBar.js';
import { muiTheme } from './shared/theme/muiTheme.js';
import LoginPage from './pages/Login.js';
import DashboardPage from './pages/Dashboard.js';
import MaterialsPage from './pages/Materials.js';
import MaterialControlPage from './pages/MaterialControl.js';
import MaterialRequestPage from './pages/MaterialRequest.js';
import PurchaseOrderPage from './pages/PurchaseOrder.js';
import DeliveryAdvicePage from './pages/DeliveryAdvice.js';
import SupplierDeliveryPage from './pages/SupplierDelivery.js';
import StockTransferPage from './pages/StockTransfer.js';
import MaterialAdjustmentPage from './pages/MaterialAdjustment.js';
import ManageUsersPage from './pages/ManageUsers.js';
import ManageRolesPage from './pages/ManageRoles.js';
import SystemSettingsPage from './pages/SystemSettings.js';
import ProfilePage from './pages/Profile.js';
import { ProjectManagementPage, SupplierManagementPage } from './pages/PartyManagement.js';
import ReportRunnerPage from './pages/ReportRunner.js';

function DynamicPage({ route }: { route: string | null }) {
  const { pageTitle } = useNavigation();
  if (!route) {
    return <DashboardPage />;
  }

  if (route?.includes('dashboard')) {
    return <DashboardPage />;
  }

  if (route?.includes('product-management')) {
    return <MaterialsPage />;
  }

  if (route?.includes('material-control')) {
    return <MaterialControlPage />;
  }

  if (route?.includes('material-request')) {
    return <MaterialRequestPage />;
  }

  if (route?.includes('purchase-order')) {
    return <PurchaseOrderPage />;
  }

  if (route?.includes('delivery-advice')) {
    return <DeliveryAdvicePage />;
  }

  if (route?.includes('supplier-delivery')) {
    return <SupplierDeliveryPage />;
  }

  if (route?.includes('stock-transfer')) {
    return <StockTransferPage />;
  }

  if (route?.includes('material-adjustment')) {
    return <MaterialAdjustmentPage />;
  }

  if (route?.includes('manage-users')) {
    return <ManageUsersPage />;
  }

  if (route?.includes('manage-roles')) {
    return <ManageRolesPage />;
  }

  if (route?.includes('project-management')) {
    return <ProjectManagementPage />;
  }

  if (route?.includes('supplier-management')) {
    return <SupplierManagementPage />;
  }

  if (route?.includes('system-settings')) {
    return <SystemSettingsPage />;
  }

  if (route?.includes('profile')) {
    return <ProfilePage />;
  }

  if (route?.startsWith('/reports/')) {
    const reportCode = route.split('/')[2] || '';
    if (reportCode) {
      return <ReportRunnerPage reportCode={reportCode} />;
    }
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Box>This page is under development.</Box>
    </Paper>
  );
}

function AppShell() {
  const { isLoggedIn, logout, account } = useAuth();
  const { currentContext, setCurrentContext, pageTitle, setPageTitle } = useNavigation();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentRoute, setCurrentRoute] = useState('/dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const routeFromUrl = location.pathname.startsWith('/app')
      ? location.pathname.slice(4) || '/dashboard'
      : '/dashboard';

    setCurrentRoute(routeFromUrl);

    const routeParts = routeFromUrl.split('/').filter(Boolean);
    if (routeParts.length === 0 || routeParts[0] === 'dashboard') {
      setPageTitle('Dashboard');
      return;
    }

    if (routeParts[0] === 'profile') {
      setPageTitle('My Profile');
      return;
    }

    const derivedTitle = routeParts[routeParts.length - 1]
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    setPageTitle(derivedTitle);
  }, [location.pathname, setPageTitle]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleProfile = () => {
    navigate('/app/profile');
  };

  const handleChangePassword = () => {
    navigate('/app/profile?section=password');
  };

  const handleNavigate = (route: string, title?: string) => {
    setCurrentRoute(route);
    navigate(`/app${route}`);
    setSidebarOpen(false);
    
    if (title) {
      setPageTitle(title);
    } else {
      const routeParts = route.split('/').filter(Boolean);
      if (routeParts.length > 0) {
        const derivedTitle = routeParts[0]
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        setPageTitle(derivedTitle);
      } else {
        setPageTitle('Dashboard');
      }
    }
  };

  const handleReportsClick = () => {
    setCurrentContext('REPORTS');
    setPageTitle('Reports');
  };

  const handleBackToMain = () => {
    setCurrentContext('MAIN');
    setCurrentRoute('/dashboard');
    setPageTitle('Dashboard');
    navigate('/app/dashboard');
  };

  const sidebarContent =
    currentContext === 'REPORTS' ? (
      <ReportsSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNavigate={handleNavigate}
        onBack={handleBackToMain}
      />
    ) : (
      <MainSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        onReportsClick={handleReportsClick}
      />
    );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#F5F7FA' }}>
      <TopBar
        onMenuClick={() => setSidebarOpen(true)}
        pageTitle={pageTitle}
        account={account}
        onProfile={handleProfile}
        onChangePassword={handleChangePassword}
        onLogout={handleLogout}
      />

      {sidebarContent}

      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          p: 3,
        }}
      >
        <Container maxWidth="xl">
          <DynamicPage route={currentRoute} />
        </Container>
      </Box>

      <Paper
        elevation={0}
        sx={{
          backgroundColor: '#FFFFFF',
          borderTop: '1px solid #E1DFDD',
          p: 1.5,
          textAlign: 'center',
          fontSize: '0.85rem',
          color: '#666666',
        }}
      >
        MMS Operations Portal | Procurement | Inventory | Reporting
      </Paper>
    </Box>
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
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <NavigationProvider>
            <AppShellWrapper />
          </NavigationProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
