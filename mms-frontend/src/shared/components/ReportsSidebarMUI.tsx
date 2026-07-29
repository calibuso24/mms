import React, { useState } from 'react';
import {
  Drawer,
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Divider,
  Button,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useNavigation, ReportGroup, ReportItem } from '../contexts/navigation.js';
import { getIcon } from '../utils/icons.js';

interface ReportMenuItemProps {
  report: ReportItem;
  onNavigate?: (route: string, title: string) => void;
}

const ReportMenuItem: React.FC<ReportMenuItemProps> = ({ report, onNavigate }) => {
  return (
    <ListItemButton
      onClick={() => {
        if (report.route && onNavigate) {
          onNavigate(report.route, report.report_name);
        }
      }}
      title={report.report_name}
      sx={{
        pl: 4,
        backgroundColor: 'transparent',
        '&:hover': {
          backgroundColor: 'rgba(0, 120, 212, 0.12)',
        },
      }}
    >
      {report.icon && (
        <ListItemIcon sx={{ color: 'rgba(255, 255, 255, 0.7)', minWidth: 40 }}>
          {getIcon(report.icon)}
        </ListItemIcon>
      )}
      <ListItemText
        primary={report.report_name}
        primaryTypographyProps={{
          fontSize: '0.9rem',
        }}
      />
    </ListItemButton>
  );
};

interface ReportGroupItemProps {
  group: ReportGroup;
  isExpanded: boolean;
  onToggle: (groupId: number) => void;
  onNavigate?: (route: string, title: string) => void;
}

const ReportGroupItem: React.FC<ReportGroupItemProps> = ({ group, isExpanded, onToggle, onNavigate }) => {
  return (
    <Box key={group.group_id}>
      <ListItemButton
        onClick={() => onToggle(group.group_id)}
        sx={{
          pl: 2,
          backgroundColor: isExpanded ? 'rgba(0, 120, 212, 0.08)' : 'transparent',
          '&:hover': {
            backgroundColor: 'rgba(0, 120, 212, 0.12)',
          },
        }}
      >
        {group.icon && (
          <ListItemIcon
            sx={{
              color: isExpanded ? '#0078D4' : 'rgba(255, 255, 255, 0.7)',
              minWidth: 40,
            }}
          >
            {getIcon(group.icon)}
          </ListItemIcon>
        )}
        <ListItemText
          primary={group.group_name}
          primaryTypographyProps={{
            fontSize: '0.9rem',
            fontWeight: isExpanded ? 600 : 500,
          }}
        />
        <Box sx={{ color: isExpanded ? '#0078D4' : 'rgba(255, 255, 255, 0.7)' }}>
          {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </Box>
      </ListItemButton>
      {isExpanded && group.reports.length > 0 && (
        <Collapse in={true} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {group.reports.map((report) => (
              <ReportMenuItem
                key={report.report_id}
                report={report}
                onNavigate={onNavigate}
              />
            ))}
          </List>
        </Collapse>
      )}
    </Box>
  );
};

interface ReportsSidebarProps {
  open: boolean;
  onClose: () => void;
  onNavigate?: (route: string, title: string) => void;
  onBack?: () => void;
}

export const ReportsSidebar: React.FC<ReportsSidebarProps> = ({
  open,
  onClose,
  onNavigate,
  onBack,
}) => {
  const { reportGroups, loading } = useNavigation();
  const [expandedGroupId, setExpandedGroupId] = useState<number | null>(null);

  const handleToggleGroup = (groupId: number) => {
    setExpandedGroupId((current) => (current === groupId ? null : groupId));
  };

  const sidebarContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ p: 2, borderBottom: '1px solid rgba(255, 255, 255, 0.12)' }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={onBack}
          sx={{
            color: '#FFFFFF',
            textTransform: 'none',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            },
          }}
        >
          Back
        </Button>
      </Box>

      <List sx={{ flex: 1, overflow: 'auto', py: 1 }}>
        {loading ? (
          <Typography variant="body2" sx={{ p: 2, color: 'rgba(255, 255, 255, 0.7)' }}>
            Loading reports...
          </Typography>
        ) : (
          reportGroups.map((group) => (
            <ReportGroupItem
              key={group.group_id}
              group={group}
              isExpanded={expandedGroupId === group.group_id}
              onToggle={handleToggleGroup}
              onNavigate={onNavigate}
            />
          ))
        )}
      </List>

      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.12)' }} />
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
