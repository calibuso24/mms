import React, { useState } from 'react';
import { useNavigation, ReportGroup, ReportItem } from '../contexts/navigation.js';
import { getIcon } from '../utils/icons.js';
import '../styles/sidebar.css';

interface ReportMenuItemProps {
  report: ReportItem;
  onNavigate?: (route: string) => void;
}

const ReportMenuItem: React.FC<ReportMenuItemProps> = ({ report, onNavigate }) => {
  return (
    <button
      className="menu-item report-item"
      onClick={() => {
        if (report.route && onNavigate) {
          onNavigate(report.route);
        }
      }}
      title={report.report_name}
    >
      {report.icon && <span className="menu-icon">{getIcon(report.icon)}</span>}
      <span className="menu-label">{report.report_name}</span>
    </button>
  );
};

interface ReportGroupItemProps {
  group: ReportGroup;
  onNavigate?: (route: string) => void;
}

const ReportGroupItem: React.FC<ReportGroupItemProps> = ({ group, onNavigate }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="report-group-container">
      <button
        className="menu-group"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {group.icon && <span className="menu-icon">{getIcon(group.icon)}</span>}
        <span className="menu-label">{group.group_name}</span>
        <span className={`menu-chevron ${isExpanded ? 'expanded' : ''}`}>
          ▶
        </span>
      </button>
      {isExpanded && group.reports.length > 0 && (
        <div className="menu-children">
          {group.reports.map((report) => (
            <ReportMenuItem
              key={report.report_id}
              report={report}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface ReportsSidebarProps {
  onNavigate?: (route: string) => void;
  onBack?: () => void;
}

export const ReportsSidebar: React.FC<ReportsSidebarProps> = ({ onNavigate, onBack }) => {
  const { reportGroups, loading } = useNavigation();

  if (loading) {
    return (
      <aside className="sidebar reports-sidebar">
        <button className="back-button" onClick={onBack}>
          ← Back
        </button>
        <div className="sidebar-loading">Loading reports...</div>
      </aside>
    );
  }

  return (
    <aside className="sidebar reports-sidebar">
      <button className="back-button" onClick={onBack}>
        ← Back
      </button>
      <nav className="sidebar-nav">
        {reportGroups.map((group) => (
          <ReportGroupItem
            key={group.group_id}
            group={group}
            onNavigate={onNavigate}
          />
        ))}
      </nav>
    </aside>
  );
};
