import React from 'react';
import '../styles/theme.css';

type MenuKey = 'dashboard' | 'purchasing' | 'inventory' | 'reports' | 'masterlist' | 'settings';

interface AppLayoutProps {
  activeMenu: MenuKey;
  onSelectMenu: (menu: MenuKey) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

const menuItems: Array<{ key: MenuKey; label: string }> = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'purchasing', label: 'Purchasing Transactions' },
  { key: 'inventory', label: 'Inventory Transactions' },
  { key: 'reports', label: 'Reports' },
  { key: 'masterlist', label: 'Masterlist' },
  { key: 'settings', label: 'Settings' },
];

export default function AppLayout({ activeMenu, onSelectMenu, onLogout, children }: AppLayoutProps) {
  return (
    <div className="app-bg">
      <div className="app-shell">
        <aside className="sidebar">
          <div className="sidebar-header">Materials Management System</div>
          <nav className="menu">
            <div className="menu-group">Coordinating Transactions</div>
            {menuItems.map((item) => (
              <button
                key={item.key}
                className={`menu-item${activeMenu === item.key ? ' active' : ''}`}
                onClick={() => onSelectMenu(item.key)}
                type="button"
              >
                {item.label}
              </button>
            ))}
            <button className="menu-item logout" onClick={onLogout} type="button">
              Log Out
            </button>
          </nav>
        </aside>

        <main className="content">
          <header className="header">
            <div>{menuItems.find((item) => item.key === activeMenu)?.label ?? 'Dashboard'}</div>
            <div className="header-user">Admin User</div>
          </header>

          <div className="canvas">{children}</div>

          <footer className="footer">MMS Operations Portal | Procurement | Inventory | Reporting</footer>
        </main>
      </div>
    </div>
  );
}
