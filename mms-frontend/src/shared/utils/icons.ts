import React from 'react';
import type { SvgIconProps } from '@mui/material/SvgIcon';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CalculateIcon from '@mui/icons-material/Calculate';
import CategoryIcon from '@mui/icons-material/Category';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DashboardIcon from '@mui/icons-material/Dashboard';
import DescriptionIcon from '@mui/icons-material/Description';
import EditIcon from '@mui/icons-material/Edit';
import FolderIcon from '@mui/icons-material/Folder';
import HistoryIcon from '@mui/icons-material/History';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import InventoryIcon from '@mui/icons-material/Inventory';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import LockIcon from '@mui/icons-material/Lock';
import LogoutIcon from '@mui/icons-material/Logout';
import PeopleIcon from '@mui/icons-material/People';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import SettingsIcon from '@mui/icons-material/Settings';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import StorageIcon from '@mui/icons-material/Storage';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';

export type SidebarIconProps = SvgIconProps;
type SidebarIconComponent = (props?: SidebarIconProps) => React.ReactElement;

const createIcon = (IconComponent: React.ComponentType<SvgIconProps>): SidebarIconComponent => {
  return (props = {}) => React.createElement(IconComponent, { color: 'inherit', ...props });
};

export const iconMap: Record<string, SidebarIconComponent> = {
  dashboard: createIcon(DashboardIcon),
  clipboard: createIcon(AssignmentIcon),
  'shopping-cart': createIcon(ShoppingCartIcon),
  boxes: createIcon(Inventory2Icon),
  'file-chart': createIcon(AssignmentIcon),
  database: createIcon(StorageIcon),
  settings: createIcon(SettingsIcon),
  'arrow-left': createIcon(ArrowBackIcon),
  'arrow-right': createIcon(ArrowForwardIcon),
  briefcase: createIcon(AssignmentIndIcon),
  package: createIcon(InventoryIcon),
  box: createIcon(Inventory2Icon),
  list: createIcon(AssignmentIcon),
  edit: createIcon(EditIcon),
  users: createIcon(PeopleIcon),
  lock: createIcon(LockIcon),
  folder: createIcon(FolderIcon),
  truck: createIcon(LocalShippingIcon),
  file: createIcon(DescriptionIcon),
  check: createIcon(CheckCircleOutlineIcon),
  warehouse: createIcon(WarehouseIcon),
  calculator: createIcon(CalculateIcon),
  'admin-panel-settings': createIcon(AdminPanelSettingsIcon),
  history: createIcon(HistoryIcon),
  logout: createIcon(LogoutIcon),
  category: createIcon(CategoryIcon),
};

export function getIcon(iconName: string | null, props: SidebarIconProps = {}): React.ReactElement | null {
  if (!iconName) return null;

  const iconFactory = iconMap[iconName.toLowerCase()];
  return iconFactory ? iconFactory(props) : React.createElement(ChevronRightIcon, { color: 'inherit', ...props });
}
