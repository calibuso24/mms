import { pool } from '../config/database.js';

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

export interface ReportCatalogGroup {
  group_id: number;
  group_name: string;
  icon: string | null;
  display_order: number;
  reports: ReportCatalogItem[];
}

export interface ReportCatalogItem {
  report_id: number;
  report_name: string;
  report_code: string;
  route: string | null;
  icon: string | null;
  display_order: number;
}

export class NavigationRepository {
  async findByContext(context: string, accountId?: number): Promise<NavigationItem[]> {
    let query = `
      SELECT 
        n.navigation_id,
        n.parent_navigation_id,
        n.context,
        n.navigation_type,
        n.title,
        n.route,
        n.icon,
        n.permission_code,
        n.display_order,
        n.is_visible
      FROM navigation n
      WHERE n.context = $1 AND n.is_deleted = false AND n.is_visible = true
    `;

    const params: any[] = [context];

    if (accountId) {
      query += `
        AND (
          n.permission_code IS NULL
          OR n.permission_code IN (
            SELECT DISTINCT p.permission_code
            FROM account a
            JOIN account_role ar ON a.account_id = ar.account_id
            JOIN role r ON ar.role_id = r.role_id
            JOIN role_permission rp ON r.role_id = rp.role_id
            JOIN permission p ON rp.permission_id = p.permission_id
            WHERE a.account_id = $2 AND a.is_deleted = false AND r.is_deleted = false AND p.is_deleted = false
          )
        )
      `;
      params.push(accountId);
    }

    query += ' ORDER BY n.display_order ASC, n.title ASC';

    const result = await pool.query(query, params);
    return this.buildHierarchy(result.rows);
  }

  async findByContextAndParent(
    context: string,
    parentId: number | null,
    accountId?: number
  ): Promise<NavigationItem[]> {
    let query = `
      SELECT 
        n.navigation_id,
        n.parent_navigation_id,
        n.context,
        n.navigation_type,
        n.title,
        n.route,
        n.icon,
        n.permission_code,
        n.display_order,
        n.is_visible
      FROM navigation n
      WHERE n.context = $1 
        AND n.parent_navigation_id ${parentId === null ? 'IS NULL' : '= $2'}
        AND n.is_deleted = false 
        AND n.is_visible = true
    `;

    const params: any[] = [context];
    let paramIndex = 2;

    if (parentId !== null) {
      params.push(parentId);
      paramIndex++;
    }

    if (accountId) {
      query += `
        AND (
          n.permission_code IS NULL
          OR n.permission_code IN (
            SELECT DISTINCT p.permission_code
            FROM account a
            JOIN account_role ar ON a.account_id = ar.account_id
            JOIN role r ON ar.role_id = r.role_id
            JOIN role_permission rp ON r.role_id = rp.role_id
            JOIN permission p ON rp.permission_id = p.permission_id
            WHERE a.account_id = $${paramIndex} AND a.is_deleted = false AND r.is_deleted = false AND p.is_deleted = false
          )
        )
      `;
      params.push(accountId);
    }

    query += ' ORDER BY n.display_order ASC, n.title ASC';

    const result = await pool.query(query, params);
    return result.rows;
  }

  async findChildren(
    navigationId: number,
    context: string,
    accountId?: number
  ): Promise<NavigationItem[]> {
    return this.findByContextAndParent(context, navigationId, accountId);
  }

  async getReportCatalogByCategory(accountId?: number): Promise<ReportCatalogGroup[]> {
    let query = `
      SELECT 
        l.look_up_id as category_id,
        l.name as category_name,
        l.display_order as category_order,
        r.report_id,
        r.report_code,
        r.report_name,
        r.report_url,
        r.display_order as report_order
      FROM look_up l
      LEFT JOIN report_catalog r ON l.look_up_id = r.report_category_lookup_id 
        AND r.is_deleted = false 
        AND r.is_active = true
      WHERE l.look_up_type = 'REPORT_CATEGORY'
        AND l.is_deleted = false
        AND l.is_active = true
    `;

    const params: any[] = [];

    if (accountId) {
      query += `
        AND (
          r.report_id IS NULL
          OR EXISTS (
            SELECT 1 FROM account a
            JOIN account_role ar ON a.account_id = ar.account_id
            JOIN role ro ON ar.role_id = ro.role_id
            JOIN role_permission rp ON ro.role_id = rp.role_id
            JOIN permission p ON rp.permission_id = p.permission_id
            WHERE a.account_id = $1 
              AND a.is_deleted = false 
              AND ro.is_deleted = false
              AND p.is_deleted = false
              AND p.permission_code = 'REPORT_' || r.report_code
          )
          OR r.report_id IS NULL
        )
      `;
      params.push(accountId);
    }

    query += ' ORDER BY l.display_order ASC, r.display_order ASC';

    const result = await pool.query(query, params);

    const grouped: Record<number, ReportCatalogGroup> = {};

    result.rows.forEach((row) => {
      if (!grouped[row.category_id]) {
        grouped[row.category_id] = {
          group_id: row.category_id,
          group_name: row.category_name,
          icon: null,
          display_order: row.category_order,
          reports: [],
        };
      }

      if (row.report_id) {
        grouped[row.category_id].reports.push({
          report_id: row.report_id,
          report_name: row.report_name,
          report_code: row.report_code,
          route: `/reports/${row.report_code.toLowerCase()}`,
          icon: null,
          display_order: row.report_order,
        });
      }
    });

    return Object.values(grouped)
      .sort((a, b) => a.display_order - b.display_order)
      .filter((group) => group.reports.length > 0);
  }

  private buildHierarchy(items: NavigationItem[]): NavigationItem[] {
    const itemMap = new Map<number, NavigationItem>();
    const roots: NavigationItem[] = [];

    items.forEach((item) => {
      itemMap.set(item.navigation_id, { ...item, children: [] });
    });

    items.forEach((item) => {
      const node = itemMap.get(item.navigation_id)!;
      if (item.parent_navigation_id === null) {
        roots.push(node);
      } else {
        const parent = itemMap.get(item.parent_navigation_id);
        if (parent) {
          if (!parent.children) parent.children = [];
          parent.children.push(node);
        }
      }
    });

    return roots.sort((a, b) => a.display_order - b.display_order);
  }
}
