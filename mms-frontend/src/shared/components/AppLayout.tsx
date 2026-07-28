import React, { useState, useCallback } from 'react';
import '../styles/theme.css';

type MenuKey = 'dashboard' | 'purchasing' | 'inventory' | 'reports' | 'masterlist' | 'settings';

interface AppLayoutProps {
  activeMenu: MenuKey;
  onSelectMenu: (menu: MenuKey) => void;
  onLogout: () => void;
  userName: string;
  children: React.ReactNode;
}

interface MenuGroup {
  id: string;
  label: string;
  items: Array<{ key: MenuKey; label: string }>;
}

const menuGroups: MenuGroup[] = [
  {
    id: 'operations',
    label: 'Operations',
    items: [
      { key: 'dashboard', label: 'Dashboard' },
      { key: 'purchasing', label: 'Purchasing Transactions' },
      { key: 'inventory', label: 'Inventory Transactions' },
    ],
  },
  {
    id: 'management',
    label: 'Management',
    items: [
      { key: 'reports', label: 'Reports' },
      { key: 'masterlist', label: 'Masterlist' },
      { key: 'settings', label: 'Settings' },
    ],
  },
];

export default function AppLayout({ activeMenu, onSelectMenu, onLogout, userName, children }: AppLayoutProps) {
  const [expandedGroup, setExpandedGroup] = useState<string | null>('operations');

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroup((current) => (current === groupId ? null : groupId));
  }, []);

  const getAllMenuItems = () => menuGroups.flatMap((group) => group.items);

  // Expand group if clicked item is in a closed group
  const handleMenuItemClick = useCallback(
    (item: { key: MenuKey; label: string }) => {
      onSelectMenu(item.key);
      const groupContainingItem = menuGroups.find((group) =>
        group.items.some((menuItem) => menuItem.key === item.key)
      );
      if (groupContainingItem && expandedGroup !== groupContainingItem.id) {
        setExpandedGroup(groupContainingItem.id);
      }
    },
    [onSelectMenu, expandedGroup]
  );

  return (
    <div className="app-bg">
      <div className="app-shell">
        <aside className="sidebar">
          <div className="sidebar-header">Materials Management System</div>
          <nav className="menu">
            {menuGroups.map((group) => (
              <div key={group.id} className="menu-group-container">
                <button
                  className={`menu-group-header${expandedGroup === group.id ? ' active' : ''}`}
                  onClick={() => toggleGroup(group.id)}
                  aria-expanded={expandedGroup === group.id}
                  aria-controls={`group-${group.id}`}
                  type="button"
                >
                  <span>{group.label}</span>
                  <span className={`group-toggle${expandedGroup === group.id ? ' expanded' : ''}`}>
                    ▼
                  </span>
                </button>
                {expandedGroup === group.id && (
                  <div id={`group-${group.id}`} className="menu-group-items">
                    {group.items.map((item) => (
                      <button
                        key={item.key}
                        className={`menu-item${activeMenu === item.key ? ' active' : ''}`}
                        onClick={() => handleMenuItemClick(item)}
                        type="button"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <button className="menu-item logout" onClick={onLogout} type="button">
              Log Out
            </button>
          </nav>
        </aside>

        <main className="content">
          <header className="header">
            <div>{getAllMenuItems().find((item) => item.key === activeMenu)?.label ?? 'Dashboard'}</div>
            <div className="header-user">{userName}</div>
          </header>

          <div className="canvas">{children}</div>

          <footer className="footer">MMS Operations Portal | Procurement | Inventory | Reporting</footer>
        </main>
      </div>
    </div>
  );
}
