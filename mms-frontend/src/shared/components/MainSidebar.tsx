import React, { useState } from 'react';
import { useNavigation, NavigationItem } from '../contexts/navigation.js';
import { getIcon } from '../utils/icons.js';
import '../styles/sidebar.css';

interface MenuItemProps {
  item: NavigationItem;
  level: number;
  onNavigate?: (route: string) => void;
  onReportsClick?: () => void;
}

const MenuItem: React.FC<MenuItemProps> = ({ item, level, onNavigate, onReportsClick }) => {
  const { expandedItems, toggleExpandedItem } = useNavigation();
  const isExpanded = expandedItems.has(item.navigation_id);
  const hasChildren = item.children && item.children.length > 0;

  if (item.navigation_type === 'HEADER') {
    return null;
  }

  if (item.navigation_type === 'GROUP') {
    return (
      <div className="menu-group-container" style={{ marginLeft: `${level * 12}px` }}>
        <button
          className="menu-group"
          onClick={() => toggleExpandedItem(item.navigation_id)}
        >
          {item.icon && <span className="menu-icon">{getIcon(item.icon)}</span>}
          <span className="menu-label">{item.title}</span>
          {hasChildren && (
            <span className={`menu-chevron ${isExpanded ? 'expanded' : ''}`}>
              ▶
            </span>
          )}
        </button>
        {isExpanded && hasChildren && (
          <div className="menu-children">
            {item.children?.map((child) => (
              <MenuItem
                key={child.navigation_id}
                item={child}
                level={level + 1}
                onNavigate={onNavigate}
                onReportsClick={onReportsClick}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const handleClick = () => {
    if (item.title === 'Reports' && onReportsClick) {
      onReportsClick();
    } else if (item.route && onNavigate) {
      onNavigate(item.route);
    }
  };

  return (
    <button
      className="menu-item"
      style={{ marginLeft: `${level * 12}px` }}
      onClick={handleClick}
      title={item.title}
    >
      {item.icon && <span className="menu-icon">{getIcon(item.icon)}</span>}
      <span className="menu-label">{item.title}</span>
    </button>
  );
};

interface MainSidebarProps {
  onNavigate?: (route: string) => void;
  onLogout?: () => void;
  onReportsClick?: () => void;
}

export const MainSidebar: React.FC<MainSidebarProps> = ({
  onNavigate,
  onLogout,
  onReportsClick,
}) => {
  const { mainNavigation, loading } = useNavigation();

  if (loading) {
    return (
      <aside className="sidebar">
        <div className="sidebar-header">Materials Management System</div>
        <div className="sidebar-loading">Loading navigation...</div>
      </aside>
    );
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">Materials Management System</div>
      <nav className="sidebar-nav">
        {mainNavigation.map((item) => (
          <MenuItem
            key={item.navigation_id}
            item={item}
            level={0}
            onNavigate={onNavigate}
            onReportsClick={onReportsClick}
          />
        ))}
      </nav>
      {onLogout && (
        <button className="menu-item logout" onClick={onLogout} type="button">
          Log Out
        </button>
      )}
    </aside>
  );
};
