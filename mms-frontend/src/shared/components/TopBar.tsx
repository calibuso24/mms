import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  InputBase,
  Badge,
  Menu,
  MenuItem,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { styled } from '@mui/material/styles';

const Search = styled(Box)(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: '#F5F7FA',
  marginLeft: theme.spacing(2),
  marginRight: theme.spacing(2),
  width: '250px',
  display: 'flex',
  alignItems: 'center',
  paddingLeft: theme.spacing(2),
  border: `1px solid ${theme.palette.divider}`,
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: 'inherit',
  flex: 1,
  '& .MuiInputBase-input': {
    padding: theme.spacing(1, 1, 1, 0),
    fontSize: '0.9rem',
  },
}));

interface TopBarProps {
  onMenuClick: () => void;
  pageTitle: string;
  userName?: string;
  onLogout?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  onMenuClick,
  pageTitle,
  userName = 'User',
  onLogout,
}) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const isMenuOpen = Boolean(anchorEl);

  const handleProfileClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    onLogout?.();
  };

  return (
    <AppBar position="static" elevation={0}>
      <Toolbar sx={{ justifyContent: 'space-between', minHeight: 56 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={onMenuClick}
            sx={{ color: '#0078D4' }}
          >
            <MenuIcon />
          </IconButton>
          <Typography
            variant="h5"
            sx={{
              color: '#0b2748',
              fontWeight: 600,
            }}
          >
            {pageTitle}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Search>
            <StyledInputBase
              placeholder="Search..."
              inputProps={{ 'aria-label': 'search' }}
            />
            <IconButton size="small" sx={{ color: '#0078D4' }}>
              <SearchIcon fontSize="small" />
            </IconButton>
          </Search>

          <IconButton
            size="small"
            sx={{
              color: '#0078D4',
              '&:hover': {
                backgroundColor: '#F5F7FA',
              },
            }}
          >
            <Badge badgeContent={3} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>

          <IconButton
            onClick={handleProfileClick}
            size="small"
            sx={{
              color: '#0078D4',
              '&:hover': {
                backgroundColor: '#F5F7FA',
              },
            }}
          >
            <AccountCircleIcon />
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            open={isMenuOpen}
            onClose={handleMenuClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem disabled>
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                {userName}
              </Typography>
            </MenuItem>
            <MenuItem onClick={handleMenuClose}>Profile</MenuItem>
            <MenuItem onClick={handleMenuClose}>Settings</MenuItem>
            <MenuItem onClick={handleLogout}>Logout</MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};
