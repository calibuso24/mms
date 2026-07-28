import React, { createContext, useContext, useState, useEffect } from 'react';
import { navigationApi } from '../api/client.js';

export interface NavigationItem {
  navigation_id: number;
  parent_navigation_id: number | null;
  context: string;
  navigation_type: string;
  title: string;
  route: string | null;
  icon: string | null;
  permission_code: string | null;
  display_order: number;
  is_visible: boolean;
  children?: NavigationItem[];
}

export interface ReportGroup {
  group_id: number;
  group_name: string;
  icon: string | null;
  display_order: number;
  reports: ReportItem[];
}

export interface ReportItem {
  report_id: number;
  report_name: string;
  route: string | null;
  icon: string | null;
  display_order: number;
}

interface NavigationContextType {
  mainNavigation: NavigationItem[];
  reportsNavigation: NavigationItem[];
  reportGroups: ReportGroup[];
  currentContext: 'MAIN' | 'REPORTS';
  expandedItems: Set<number>;
  loading: boolean;
  error: string | null;
  setCurrentContext: (context: 'MAIN' | 'REPORTS') => void;
  toggleExpandedItem: (id: number) => void;
  setExpandedItems: (ids: Set<number>) => void;
  refreshNavigation: () => Promise<void>;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mainNavigation, setMainNavigation] = useState<NavigationItem[]>([]);
  const [reportsNavigation, setReportsNavigation] = useState<NavigationItem[]>([]);
  const [reportGroups, setReportGroups] = useState<ReportGroup[]>([]);
  const [currentContext, setCurrentContext] = useState<'MAIN' | 'REPORTS'>('MAIN');
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNavigation = async () => {
    try {
      setLoading(true);
      setError(null);

      const [mainData, reportsData, reportCatalogData] = await Promise.all([
        navigationApi.getMain(),
        navigationApi.getReports(),
        navigationApi.getReportCatalogSidebar(),
      ]);

      setMainNavigation(mainData);
      setReportsNavigation(reportsData);
      setReportGroups(reportCatalogData);

      const savedExpandedItems = localStorage.getItem('navigationExpandedItems');
      if (savedExpandedItems) {
        try {
          const ids = JSON.parse(savedExpandedItems);
          setExpandedItems(new Set(ids));
        } catch {
          setExpandedItems(new Set());
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load navigation');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNavigation();
  }, []);

  const handleToggleExpandedItem = (id: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
    localStorage.setItem('navigationExpandedItems', JSON.stringify(Array.from(newExpanded)));
  };

  const handleSetCurrentContext = (context: 'MAIN' | 'REPORTS') => {
    setCurrentContext(context);
  };

  const refreshNavigation = async () => {
    await loadNavigation();
  };

  const value: NavigationContextType = {
    mainNavigation,
    reportsNavigation,
    reportGroups,
    currentContext,
    expandedItems,
    loading,
    error,
    setCurrentContext: handleSetCurrentContext,
    toggleExpandedItem: handleToggleExpandedItem,
    setExpandedItems,
    refreshNavigation,
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return context;
};
