import React, { useEffect, useState } from 'react';
import { useTheme } from '@mui/material/styles';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Box, Container, Paper } from '@mui/material';
import { BrandingProvider } from './shared/contexts/branding.js';
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

function ReportRoutePage() {
  const { reportCode = '' } = useParams();
  return <ReportRunnerPage reportCode={reportCode} />;
}

function UnderDevelopmentPage() {
  return (
    <Paper sx={{ p: 3 }}>
      <Box>This page is under development.</Box>
    </Paper>
  );
}

function AppContentRoutes() {
  return (
    <Routes>
      <Route path="dashboard" element={<DashboardPage />} />

      <Route path="masterlist/product-management" element={<MaterialsPage />} />
      <Route path="masterlist/product-management/new" element={<MaterialsPage />} />
      <Route path="masterlist/product-management/:id/edit" element={<MaterialsPage />} />

      <Route path="masterlist/project-management" element={<ProjectManagementPage />} />
      <Route path="masterlist/project-management/new" element={<ProjectManagementPage />} />
      <Route path="masterlist/project-management/:id/edit" element={<ProjectManagementPage />} />

      <Route path="masterlist/supplier-management" element={<SupplierManagementPage />} />
      <Route path="masterlist/supplier-management/new" element={<SupplierManagementPage />} />
      <Route path="masterlist/supplier-management/:id/edit" element={<SupplierManagementPage />} />

      <Route path="coordinating/material-control" element={<MaterialControlPage />} />
      <Route path="coordinating/material-control/new" element={<MaterialControlPage />} />
      <Route path="coordinating/material-control/:id/edit" element={<MaterialControlPage />} />

      <Route path="coordinating/material-request" element={<MaterialRequestPage />} />
      <Route path="coordinating/material-request/new" element={<MaterialRequestPage />} />
      <Route path="coordinating/material-request/:id/edit" element={<MaterialRequestPage />} />

      <Route path="purchasing/purchase-order" element={<PurchaseOrderPage />} />
      <Route path="purchasing/purchase-order/new" element={<PurchaseOrderPage />} />
      <Route path="purchasing/purchase-order/:id/edit" element={<PurchaseOrderPage />} />

      <Route path="purchasing/delivery-advice" element={<DeliveryAdvicePage />} />
      <Route path="purchasing/delivery-advice/new" element={<DeliveryAdvicePage />} />
      <Route path="purchasing/delivery-advice/:id/edit" element={<DeliveryAdvicePage />} />

      <Route path="inventory/supplier-delivery" element={<SupplierDeliveryPage />} />
      <Route path="inventory/supplier-delivery/new" element={<SupplierDeliveryPage />} />
      <Route path="inventory/supplier-delivery/:id/edit" element={<SupplierDeliveryPage />} />

      <Route path="inventory/stock-transfer" element={<StockTransferPage />} />
      <Route path="inventory/stock-transfer/new" element={<StockTransferPage />} />
      <Route path="inventory/stock-transfer/:id/edit" element={<StockTransferPage />} />

      <Route path="inventory/material-adjustment" element={<MaterialAdjustmentPage />} />
      <Route path="inventory/material-adjustment/new" element={<MaterialAdjustmentPage />} />
      <Route path="inventory/material-adjustment/:id/edit" element={<MaterialAdjustmentPage />} />

      <Route path="admin/manage-users" element={<ManageUsersPage />} />
      <Route path="admin/manage-roles" element={<ManageRolesPage />} />
      <Route path="admin/system-settings" element={<SystemSettingsPage />} />
      <Route path="profile" element={<ProfilePage />} />
      <Route path="reports/:reportCode" element={<ReportRoutePage />} />

      <Route path="*" element={<UnderDevelopmentPage />} />
    </Routes>
  );
}

function AppShell() {
  const { isLoggedIn, logout, account } = useAuth();
  const { currentContext, setCurrentContext, pageTitle, setPageTitle } = useNavigation();
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentRoute, setCurrentRoute] = useState('/dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const deriveTitleFromRoute = (route: string) => {
    const routeParts = route.split('/').filter(Boolean);
    if (routeParts.length === 0 || routeParts[0] === 'dashboard') {
      return 'Dashboard';
    }
    if (routeParts[0] === 'profile') {
      return 'My Profile';
    }
    if (routeParts[0] === 'reports') {
      return 'Reports';
    }

    const hasModulePrefix = ['masterlist', 'coordinating', 'purchasing', 'inventory', 'admin'].includes(routeParts[0]);
    const source = hasModulePrefix && routeParts.length > 1 ? routeParts[1] : routeParts[routeParts.length - 1];

    return source
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  useEffect(() => {
    const routeFromUrl = location.pathname.startsWith('/app')
      ? location.pathname.slice(4) || '/dashboard'
      : '/dashboard';

    setCurrentRoute(routeFromUrl);

    setPageTitle(deriveTitleFromRoute(routeFromUrl));
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
      setPageTitle(deriveTitleFromRoute(route));
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
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: theme.palette.background.default }}>
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
          <AppContentRoutes />
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
    <BrandingProvider>
      <BrowserRouter>
        <AuthProvider>
          <NavigationProvider>
            <AppShellWrapper />
          </NavigationProvider>
        </AuthProvider>
      </BrowserRouter>
    </BrandingProvider>
  );
}
