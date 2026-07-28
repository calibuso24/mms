import React from 'react';
import { BreadcrumbItem } from '../hooks/useBreadcrumbs.js';
import '../styles/sidebar.css';

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  onNavigate?: (path: string) => void;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, onNavigate }) => {
  if (items.length === 0) {
    return null;
  }

  return (
    <nav className="breadcrumb">
      {items.map((item, index) => (
        <React.Fragment key={item.path}>
          {index > 0 && <span className="breadcrumb-separator">/</span>}
          <button
            className="breadcrumb-item"
            onClick={() => onNavigate?.(item.path)}
          >
            {item.label}
          </button>
        </React.Fragment>
      ))}
    </nav>
  );
};
