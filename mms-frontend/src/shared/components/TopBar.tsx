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
  Avatar,
  Button,
  Stack,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import NotificationsIcon from '@mui/icons-material/Notifications';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import { styled } from '@mui/material/styles';
import { CurrentAccount } from '../types/account.js';
import { useBranding } from '../contexts/branding.js';
import { getAccountAvatarSrc, getAccountDisplayName, getAccountInitials } from '../utils/account.js';

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
  account?: CurrentAccount | null;
  onProfile?: () => void;
  onChangePassword?: () => void;
  onLogout?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  onMenuClick,
  pageTitle,
  account,
  onProfile,
  onChangePassword,
  onLogout,
}) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const isMenuOpen = Boolean(anchorEl);
  const displayName = getAccountDisplayName(account);
  const avatarSrc = getAccountAvatarSrc(account);
  const initials = getAccountInitials(displayName);
  const { branding } = useBranding();

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

  const handleProfile = () => {
    handleMenuClose();
    onProfile?.();
  };

  const handleChangePassword = () => {
    handleMenuClose();
    onChangePassword?.();
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {branding?.header?.companyLogo ? (
              <Box component="img" src={branding.header.companyLogo} alt={branding.companyName ?? 'Logo'} sx={{ height: 28 }} />
            ) : null}
            <Typography
              variant="h5"
              sx={{
                color: '#0b2748',
                fontWeight: 600,
              }}
            >
              {branding?.header?.systemTitle ?? pageTitle}
            </Typography>
          </Box>
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

          <Button
            onClick={handleProfileClick}
            variant="text"
            disableRipple
            sx={{
              color: '#0b2748',
              '&:hover': {
                backgroundColor: '#F5F7FA',
              },
              borderRadius: 999,
              px: 1,
              py: 0.75,
              textTransform: 'none',
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <Avatar
                src={avatarSrc ?? undefined}
                alt={displayName}
                sx={{ width: 32, height: 32, bgcolor: '#005A9E', fontSize: '0.8rem', fontWeight: 700 }}
              >
                {initials}
              </Avatar>
              <Typography variant="body2" sx={{ fontWeight: 600, maxWidth: 160 }} noWrap>
                {displayName}
              </Typography>
              <KeyboardArrowDownRoundedIcon fontSize="small" />
            </Stack>
          </Button>

          <Menu
            anchorEl={anchorEl}
            open={isMenuOpen}
            onClose={handleMenuClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem disabled>
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                {displayName}
              </Typography>
            </MenuItem>
            <MenuItem onClick={handleProfile}>My Profile</MenuItem>
            <MenuItem onClick={handleChangePassword}>Change Password</MenuItem>
            <MenuItem onClick={handleLogout}>Logout</MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};
