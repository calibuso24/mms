import React, { useState } from 'react';
import { useNavigation, ReportGroup, ReportItem } from '../contexts/navigation.js';
import { getIcon } from '../utils/icons.js';
import '../styles/sidebar.css';

interface ReportMenuItemProps {
  report: ReportItem;
  onNavigate?: (route: string, title: string) => void;
}

const ReportMenuItem: React.FC<ReportMenuItemProps> = ({ report, onNavigate }) => {
  return (
    <button
      className="menu-item report-item"
      onClick={() => {
        if (report.route && onNavigate) {
          onNavigate(report.route, report.report_name);
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
  isExpanded: boolean;
  onToggle: (groupId: number) => void;
  onNavigate?: (route: string) => void;
}

const ReportGroupItem: React.FC<ReportGroupItemProps> = ({ group, isExpanded, onToggle, onNavigate }) => {
  return (
    <div className="report-group-container">
      <button
        className="menu-group"
        onClick={() => onToggle(group.group_id)}
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
  onNavigate?: (route: string, title: string) => void;
  onBack?: () => void;
}

export const ReportsSidebar: React.FC<ReportsSidebarProps> = ({ onNavigate, onBack }) => {
  const { reportGroups, loading } = useNavigation();
  const [expandedGroupId, setExpandedGroupId] = useState<number | null>(null);

  // Toggle report group with accordion behavior
  const handleToggleGroup = (groupId: number) => {
    setExpandedGroupId((current) => (current === groupId ? null : groupId));
  };

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
            isExpanded={expandedGroupId === group.group_id}
            onToggle={handleToggleGroup}
            onNavigate={onNavigate}
          />
        ))}
      </nav>
    </aside>
  );
};
