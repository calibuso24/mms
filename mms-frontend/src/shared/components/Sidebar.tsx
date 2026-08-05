import React, { useState, useMemo } from 'react';
import { useBranding } from '../contexts/branding.js';
import {
  Drawer,
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Divider,
  Button,
  Typography,
} from '@mui/material';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LogoutIcon from '@mui/icons-material/Logout';
import { useNavigation, NavigationItem } from '../contexts/navigation.js';
import { getIcon } from '../utils/icons.js';

interface MenuItemProps {
  item: NavigationItem;
  level: number;
  isTopLevelOpen?: boolean;
  isTopLevel?: boolean;
  onToggleTopLevel?: (id: number) => void;
  onNavigate?: (route: string, title: string) => void;
  onReportsClick?: () => void;
}

const MenuItem: React.FC<MenuItemProps> = ({
  item,
  level,
  isTopLevelOpen = true,
  isTopLevel = false,
  onToggleTopLevel,
  onNavigate,
  onReportsClick,
}) => {
  const { expandedItems, toggleExpandedItem } = useNavigation();
  const isExpanded = expandedItems.has(item.navigation_id);
  const hasChildren = item.children && item.children.length > 0;

  if (item.navigation_type === 'HEADER') {
    return null;
  }

  if (item.navigation_type === 'GROUP') {
    if (isTopLevel && onToggleTopLevel) {
      return (
        <Box key={item.navigation_id}>
          <ListItemButton
            onClick={() => onToggleTopLevel(item.navigation_id)}
            sx={{
              pl: 2,
              backgroundColor: isTopLevelOpen ? 'rgba(0, 120, 212, 0.08)' : 'transparent',
              '&:hover': {
                backgroundColor: 'rgba(0, 120, 212, 0.12)',
              },
            }}
          >
            {item.icon && (
              <ListItemIcon
                sx={{
                  color: isTopLevelOpen ? '#0078D4' : 'rgba(255, 255, 255, 0.7)',
                  minWidth: 40,
                }}
              >
                {getIcon(item.icon)}
              </ListItemIcon>
            )}
            <ListItemText
              primary={item.title}
              primaryTypographyProps={{
                fontSize: '0.9rem',
                fontWeight: isTopLevelOpen ? 600 : 500,
              }}
            />
            {hasChildren && (
              <Box sx={{ color: isTopLevelOpen ? '#0078D4' : 'rgba(255, 255, 255, 0.7)' }}>
                {isTopLevelOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </Box>
            )}
          </ListItemButton>
          {isTopLevelOpen && hasChildren && (
            <Collapse in={true} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {item.children?.map((child) => (
                  <MenuItem
                    key={child.navigation_id}
                    item={child}
                    level={level + 1}
                    onNavigate={onNavigate}
                    onReportsClick={onReportsClick}
                  />
                ))}
              </List>
            </Collapse>
          )}
        </Box>
      );
    }

    return (
      <Box key={item.navigation_id}>
        <ListItemButton
          onClick={() => toggleExpandedItem(item.navigation_id)}
          sx={{
            pl: 2 + level * 2,
            backgroundColor: isExpanded ? 'rgba(0, 120, 212, 0.08)' : 'transparent',
            '&:hover': {
              backgroundColor: 'rgba(0, 120, 212, 0.12)',
            },
          }}
        >
          {item.icon && (
            <ListItemIcon
              sx={{
                color: isExpanded ? '#0078D4' : 'rgba(255, 255, 255, 0.7)',
                minWidth: 40,
              }}
            >
              {getIcon(item.icon)}
            </ListItemIcon>
          )}
          <ListItemText
            primary={item.title}
            primaryTypographyProps={{
              fontSize: '0.9rem',
              fontWeight: isExpanded ? 600 : 500,
            }}
          />
          {hasChildren && (
            <Box sx={{ color: isExpanded ? '#0078D4' : 'rgba(255, 255, 255, 0.7)' }}>
              {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </Box>
          )}
        </ListItemButton>
        {isExpanded && hasChildren && (
          <Collapse in={true} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children?.map((child) => (
                <MenuItem
                  key={child.navigation_id}
                  item={child}
                  level={level + 1}
                  onNavigate={onNavigate}
                  onReportsClick={onReportsClick}
                />
              ))}
            </List>
          </Collapse>
        )}
      </Box>
    );
  }

  const handleClick = () => {
    if (item.title === 'Reports' && onReportsClick) {
      onReportsClick();
    } else if (item.route && onNavigate) {
      onNavigate(item.route, item.title);
    }
  };

  return (
    <ListItemButton
      key={item.navigation_id}
      onClick={handleClick}
      sx={{
        pl: 2 + level * 2,
        backgroundColor: item.route ? 'transparent' : 'rgba(0, 120, 212, 0.08)',
        '&:hover': {
          backgroundColor: 'rgba(0, 120, 212, 0.12)',
        },
      }}
      title={item.title}
    >
      {item.icon && (
        <ListItemIcon sx={{ color: 'rgba(255, 255, 255, 0.7)', minWidth: 40 }}>
          {getIcon(item.icon)}
        </ListItemIcon>
      )}
      <ListItemText
        primary={item.title}
        primaryTypographyProps={{
          fontSize: '0.9rem',
        }}
      />
    </ListItemButton>
  );
};

interface MainSidebarProps {
  open: boolean;
  onClose: () => void;
  onNavigate?: (route: string, title: string) => void;
  onLogout?: () => void;
  onReportsClick?: () => void;
}

export const MainSidebar: React.FC<MainSidebarProps> = ({
  open,
  onClose,
  onNavigate,
  onLogout,
  onReportsClick,
}) => {
  const { mainNavigation, loading } = useNavigation();
  const [expandedTopLevelGroupId, setExpandedTopLevelGroupId] = useState<number | null>(null);
  const { branding } = useBranding();

  const topLevelGroups = useMemo(
    () => mainNavigation.filter((item) => item.parent_navigation_id === null && item.navigation_type === 'GROUP'),
    [mainNavigation]
  );

  const handleToggleTopLevelGroup = (groupId: number) => {
    setExpandedTopLevelGroupId((current) => (current === groupId ? null : groupId));
  };

  const sidebarContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ p: 2, borderBottom: '1px solid rgba(255, 255, 255, 0.12)' }}>
        {(() => {
          const display = branding?.sidebar?.display ?? 'logo-and-text';
          if (display === 'logo-only' || display === 'logo-and-text') {
            return (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {branding?.companyLogo ? (
                  <Box component="img" src={branding.companyLogo} alt={branding.companyName ?? 'Logo'} sx={{ height: 36 }} />
                ) : null}
                {display === 'logo-and-text' ? (
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#FFFFFF' }}>
                    {branding?.companyName ?? 'Materials Management System'}
                  </Typography>
                ) : null}
              </Box>
            );
          }

          return (
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#FFFFFF' }}>
              {branding?.companyName ?? 'Materials Management System'}
            </Typography>
          );
        })()}
      </Box>

      <List sx={{ flex: 1, overflow: 'auto', py: 1 }}>
        {loading ? (
          <Typography variant="body2" sx={{ p: 2, color: 'rgba(255, 255, 255, 0.7)' }}>
            Loading...
          </Typography>
        ) : (
          mainNavigation.map((item) => {
            if (item.parent_navigation_id === null) {
              if (item.navigation_type === 'GROUP') {
                return (
                  <MenuItem
                    key={item.navigation_id}
                    item={item}
                    level={0}
                    isTopLevel={true}
                    isTopLevelOpen={expandedTopLevelGroupId === item.navigation_id}
                    onToggleTopLevel={handleToggleTopLevelGroup}
                    onNavigate={onNavigate}
                    onReportsClick={onReportsClick}
                  />
                );
              }
              return (
                <MenuItem
                  key={item.navigation_id}
                  item={item}
                  level={0}
                  onNavigate={onNavigate}
                  onReportsClick={onReportsClick}
                />
              );
            }
            return null;
          })
        )}
      </List>

      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.12)' }} />
      <Box sx={{ p: 2 }}>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<LogoutIcon />}
          onClick={onLogout}
          sx={{
            color: '#FFFFFF',
            borderColor: 'rgba(255, 255, 255, 0.3)',
            '&:hover': {
              borderColor: '#FFFFFF',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            },
          }}
        >
          Logout
        </Button>
      </Box>
    </Box>
  );

  return (
    <Drawer
      variant="temporary"
      anchor="left"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: 280,
          backgroundColor: '#0F3B68',
          color: '#FFFFFF',
        },
      }}
    >
      {sidebarContent}
    </Drawer>
  );
};
