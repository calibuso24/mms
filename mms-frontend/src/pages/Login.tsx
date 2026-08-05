import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Container,
  Paper,
} from '@mui/material';
import { useAuth } from '../shared/contexts/auth.js';
import { useBranding } from '../shared/contexts/branding.js';

export default function LoginPage() {
  const { login, isLoading } = useAuth();
  const { branding } = useBranding();
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await login(userName, password);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
  };

  const bgStyle: Record<string, any> = {};
  if (branding?.login?.backgroundImage) {
    bgStyle.backgroundImage = `url(${branding.login.backgroundImage})`;
    bgStyle.backgroundSize = 'cover';
    bgStyle.backgroundPosition = 'center';
  } else {
    bgStyle.backgroundColor = '#F5F7FA';
    bgStyle.backgroundImage = 'linear-gradient(135deg, rgba(15, 59, 104, 0.05) 0%, rgba(0, 120, 212, 0.05) 100%)';
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        ...bgStyle,
      }}
    >
      <Container maxWidth="sm">
        <Card
          elevation={0}
          sx={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E1DFDD',
            borderRadius: 2,
          }}
        >
          <CardContent sx={{ p: 4 }}>
            {/* Header */}
            <Box sx={{ mb: 3, textAlign: 'center' }}>
              {branding?.login?.showLogo !== false && branding?.companyLogo ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                  <Box component="img" src={branding.companyLogo} alt={branding.companyName ?? 'Logo'} sx={{ height: 64 }} />
                </Box>
              ) : null}

              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  color: '#0b2748',
                  mb: 1,
                }}
              >
                {branding?.login?.loginTitle ?? branding?.systemTitle ?? 'Materials Management System'}
              </Typography>
              <Typography
                variant="subtitle1"
                sx={{
                  color: '#666666',
                }}
              >
                {branding?.login?.loginSubtitle ?? 'Sign in to continue'}
              </Typography>
            </Box>

            {/* Form */}
            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {error && (
                <Alert severity="error" onClose={() => setError('')}>
                  {error}
                </Alert>
              )}

              <TextField
                id="userName"
                label="User Name"
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter your user name"
                disabled={isLoading}
                required
                fullWidth
                variant="outlined"
                size="medium"
                autoComplete="username"
              />

              <TextField
                id="password"
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={isLoading}
                required
                fullWidth
                variant="outlined"
                size="medium"
                autoComplete="current-password"
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                color="primary"
                disabled={isLoading}
                sx={{
                  mt: 1,
                  py: 1.2,
                  fontWeight: 600,
                  fontSize: '1rem',
                }}
              >
                {isLoading ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={20} color="inherit" />
                    Signing in...
                  </Box>
                ) : (
                  'Sign In'
                )}
              </Button>
            </Box>

            {/* Footer */}
            {branding?.login?.footerText ? (
              <Paper
                elevation={0}
                sx={{
                  mt: 3,
                  p: 2,
                  backgroundColor: '#F5F7FA',
                  borderRadius: 1,
                  textAlign: 'center',
                }}
              >
                <Typography variant="caption" sx={{ color: '#666666' }}>
                  {branding.login.footerText}
                </Typography>
              </Paper>
            ) : null}
            {/* <Paper
              elevation={0}
              sx={{
                mt: 3,
                p: 2,
                backgroundColor: '#F5F7FA',
                borderRadius: 1,
                textAlign: 'center',
              }}
            >
              <Typography variant="caption" sx={{ color: '#666666' }}>
                Demo accounts: <strong>superuser</strong>, <strong>admin</strong>
              </Typography>
            </Paper> */}
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
