import React, { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { Box, Container, CssBaseline, Paper } from '@mui/material';
import { AuthProvider, useAuth } from './shared/contexts/auth.js';
import { NavigationProvider, useNavigation } from './shared/contexts/navigation.js';
import { MainSidebar } from './shared/components/Sidebar.js';
import { ReportsSidebar } from './shared/components/ReportsSidebarMUI.js';
import { TopBar } from './shared/components/TopBar.js';
import { KPICard } from './shared/components/KPICard.js';
import { muiTheme } from './shared/theme/muiTheme.js';
import LoginPage from './pages/Login.js';
import MaterialsPage from './pages/Materials.js';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';

function DefaultPage() {
  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)',
          },
          gap: 2,
        }}>
          <KPICard
            label="Open Requests"
            value="24"
            icon={<TrendingUpIcon />}
            color="info"
          />
          <KPICard
            label="Pending POs"
            value="8"
            icon={<PendingActionsIcon />}
            color="warning"
          />
          <KPICard
            label="Stock Transfers"
            value="15"
            icon={<SwapHorizIcon />}
            color="info"
          />
        </Box>
      </Box>
    </Box>
  );
}

function DynamicPage({ route }: { route: string | null }) {
  const { pageTitle } = useNavigation();
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
    <Paper sx={{ p: 3 }}>
      <Box>This page is under development.</Box>
    </Paper>
  );
}

function AppShell() {
  const { isLoggedIn, logout, account } = useAuth();
  const { currentContext, setCurrentContext, pageTitle, setPageTitle } = useNavigation();
  const navigate = useNavigate();
  const [currentRoute, setCurrentRoute] = useState('/dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
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
        userName={account?.full_name || account?.account_name || 'User'}
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
