import { useState, useCallback } from 'react';

export interface BreadcrumbItem {
  label: string;
  path: string;
  onClick?: () => void;
}

export const useBreadcrumbs = () => {
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);

  const addBreadcrumb = useCallback((label: string, path: string) => {
    setBreadcrumbs((prev) => {
      const exists = prev.some((item) => item.path === path);
      if (exists) {
        return prev.map((item) =>
          item.path === path ? { ...item, label } : item
        );
      }
      return [...prev, { label, path }];
    });
  }, []);

  const removeBreadcrumb = useCallback((path: string) => {
    setBreadcrumbs((prev) => prev.filter((item) => item.path !== path));
  }, []);

  const clearBreadcrumbs = useCallback(() => {
    setBreadcrumbs([]);
  }, []);

  const setBreadcrumbsFromRoute = useCallback((route: string) => {
    const parts = route.split('/').filter(Boolean);
    const items: BreadcrumbItem[] = [];

    items.push({ label: 'Dashboard', path: '/dashboard' });

    let currentPath = '';
    parts.forEach((part) => {
      currentPath += `/${part}`;
      const label = part
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      items.push({ label, path: currentPath });
    });

    setBreadcrumbs(items);
  }, []);

  return {
    breadcrumbs,
    addBreadcrumb,
    removeBreadcrumb,
    clearBreadcrumbs,
    setBreadcrumbsFromRoute,
  };
};
