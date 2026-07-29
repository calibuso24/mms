import React from 'react';
import { Card, CardContent, Typography, Box, Icon } from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledCard = styled(Card)(({ theme }) => ({
  backgroundColor: '#FFFFFF',
  border: `1px solid ${theme.palette.divider}`,
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)',
  transition: 'all 0.2s ease',
  '&:hover': {
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    transform: 'translateY(-2px)',
  },
}));

interface KPICardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: 'success' | 'warning' | 'error' | 'info' | 'default';
  backgroundColor?: string;
}

const colorMap: Record<string, string> = {
  success: '#107C10',
  warning: '#FFB900',
  error: '#D13438',
  info: '#0078D4',
  default: '#0078D4',
};

export const KPICard: React.FC<KPICardProps> = ({
  label,
  value,
  icon,
  color = 'info',
  backgroundColor = 'rgba(0, 120, 212, 0.08)',
}) => {
  const iconColor = colorMap[color];

  return (
    <StyledCard>
      <CardContent sx={{ padding: '16px !important' }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box>
            <Typography
              variant="subtitle2"
              sx={{
                color: '#666666',
                fontWeight: 500,
                marginBottom: '8px',
              }}
            >
              {label}
            </Typography>
            <Typography
              variant="h4"
              sx={{
                color: '#0b2748',
                fontWeight: 700,
              }}
            >
              {value}
            </Typography>
          </Box>
          {icon && (
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '8px',
                backgroundColor: backgroundColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: iconColor,
                flexShrink: 0,
              }}
            >
              {icon}
            </Box>
          )}
        </Box>
      </CardContent>
    </StyledCard>
  );
};
