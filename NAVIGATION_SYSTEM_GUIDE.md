# Database-Driven Navigation System - Implementation Guide

## Overview

This implementation provides a fully database-driven, production-ready navigation system for the Materials Management System (MMS). The system features:

- **Zero Hardcoding**: All navigation items are stored in and rendered from the database
- **Hierarchical Menus**: Unlimited nesting support with parent-child relationships
- **Context Switching**: Toggle between MAIN (operations) and REPORTS (analytics) contexts
- **Permission-Aware**: SQL-level permission filtering - users only see menu items they have access to
- **Expand/Collapse**: Persistent expand/collapse state stored in localStorage
- **Icon Support**: SVG icon support for visual menu differentiation
- **Responsive Design**: Mobile-optimized dark theme with smooth animations
- **Soft Delete**: Audit trail and reversible deletions
- **Production Ready**: Comprehensive error handling, type safety, and performance optimization

## Database Schema

### Table: `navigation`

```sql
CREATE TABLE navigation (
    navigation_id BIGINT PRIMARY KEY,
    parent_navigation_id BIGINT REFERENCES navigation(navigation_id),
    context VARCHAR(50) -- MAIN or REPORTS
    navigation_type VARCHAR(50) -- GROUP, MENU, REPORT, HEADER
    title VARCHAR(255),
    route VARCHAR(255),
    icon VARCHAR(100),
    permission_code VARCHAR(100),
    display_order INTEGER,
    is_visible BOOLEAN,
    is_deleted BOOLEAN,
    reference_type VARCHAR(50) -- NONE or REPORT
    reference_id BIGINT,
    -- Audit fields
    log_created_by_account_id BIGINT,
    log_date_created TIMESTAMPTZ,
    log_updated_by_account_id BIGINT,
    log_date_updated TIMESTAMPTZ
);
```

### Key Columns

| Column | Type | Purpose |
|--------|------|---------|
| `parent_navigation_id` | BIGINT | Enables hierarchical menu structure |
| `context` | VARCHAR(50) | MAIN for operations, REPORTS for analytics |
| `navigation_type` | VARCHAR(50) | GROUP, MENU, REPORT, or HEADER |
| `permission_code` | VARCHAR(100) | Required permission; NULL = no permission check |
| `display_order` | INTEGER | Sort order within parent |
| `reference_type` | VARCHAR(50) | Links to report_catalog when "REPORT" |
| `reference_id` | BIGINT | ID of referenced object |

### Indexes

Eight indexes optimize query performance:
- `idx_navigation_parent_navigation_id` - Parent lookups
- `idx_navigation_context` - Context-based queries
- `idx_navigation_context_parent` - Combined context+parent queries
- `idx_navigation_route` - Route-based lookups
- `idx_navigation_permission_code` - Permission filtering
- `idx_navigation_is_visible` - Visibility filtering
- `idx_navigation_is_deleted` - Soft delete filtering
- `idx_navigation_reference_type_id` - Reference lookups

## Backend Architecture

### NavigationRepository

**File**: `mms-backend/src/repositories/navigation.ts`

Handles all database queries:

```typescript
async findByContext(context: string, accountId?: number): Promise<NavigationItem[]>
async findByContextAndParent(context: string, parentId: number | null, accountId?: number): Promise<NavigationItem[]>
async findChildren(navigationId: number, context: string, accountId?: number): Promise<NavigationItem[]>
```

**Permission Filtering Logic**:
- If `permission_code` is NULL, item is visible to all users
- If `permission_code` is set, queries JOIN with account → role → permission to verify access
- Performs SQL-level filtering (not in application code)

**Hierarchical Building**:
- Fetches all items at once for efficiency
- Builds parent-child relationships in memory using a Map
- Returns tree structure to controller

### NavigationService

**File**: `mms-backend/src/services/navigation.ts`

Business logic layer:

```typescript
async getMainNavigation(accountId?: number): Promise<NavigationItem[]>
async getReportsNavigation(accountId?: number): Promise<NavigationItem[]>
async getNavigationByContext(context: string, accountId?: number): Promise<NavigationItem[]>
async getReportCatalogSidebar(accountId?: number): Promise<ReportGroup[]>
```

**Report Grouping**:
- `getReportCatalogSidebar()` organizes reports by category
- Groups reports by parent navigation item (e.g., "Inventory", "Purchasing")
- Returns flat array of groups with nested reports for easy iteration

### NavigationController

**File**: `mms-backend/src/controllers/navigation.ts`

HTTP endpoint handlers:

```typescript
GET /api/navigation/main
GET /api/navigation/reports
GET /api/navigation/context/:context
GET /api/navigation/report-catalog-sidebar
```

All endpoints:
- Require authentication (`authMiddleware`)
- Extract `accountId` from JWT token
- Pass to service for permission filtering
- Return hierarchical JSON

### Routes

**File**: `mms-backend/src/routes/navigation.ts`

Wired in `index.ts`:
```typescript
app.use('/api/navigation', authMiddleware, navigationRoutes);
```

## Frontend Architecture

### NavigationProvider Context

**File**: `mms-frontend/src/shared/contexts/navigation.tsx`

Global state management:

```typescript
interface NavigationContextType {
  mainNavigation: NavigationItem[]
  reportsNavigation: NavigationItem[]
  reportGroups: ReportGroup[]
  currentContext: 'MAIN' | 'REPORTS'
  expandedItems: Set<number>
  loading: boolean
  error: string | null
  setCurrentContext(context): void
  toggleExpandedItem(id): void
  setExpandedItems(ids): void
  refreshNavigation(): Promise<void>
}
```

**Features**:
- Fetches all three navigation types on mount (parallel API calls)
- Persists expanded items to localStorage
- Provides context switching between MAIN and REPORTS
- Handles loading and error states

### MainSidebar Component

**File**: `mms-frontend/src/shared/components/MainSidebar.tsx`

Renders main operations menu:

```typescript
<MainSidebar
  onNavigate={handleNavigate}
  onLogout={handleLogout}
  onReportsClick={handleReportsClick}
/>
```

**Features**:
- Recursive `MenuItem` component for unlimited nesting
- Expand/collapse GROUP items with smooth animation
- Reports click triggers context switch (not navigation)
- Icon rendering
- Responsive design with tooltip support

### ReportsSidebar Component

**File**: `mms-frontend/src/shared/components/ReportsSidebar.tsx`

Renders analytics menu:

```typescript
<ReportsSidebar
  onNavigate={handleNavigate}
  onBack={handleBackToMain}
/>
```

**Features**:
- Back button (with arrow icon) to return to MAIN context
- Groups reports by category (Inventory, Purchasing, etc.)
- Expand/collapse report groups
- Each report clickable for navigation

### Sidebar Styles

**File**: `mms-frontend/src/shared/styles/sidebar.css`

Dark theme styling:
- Background: #1a1a2e (dark blue)
- Accent: #00d4ff (cyan)
- Icons: 20px size with proper alignment
- Animations: slideDown for expanding menus, rotate for chevrons
- Responsive breakpoints at 768px and 480px
- Icon-only collapsed mode support
- Breadcrumb styling included

### Breadcrumbs Hook & Component

**File**: `mms-frontend/src/shared/hooks/useBreadcrumbs.ts`

Breadcrumb management:

```typescript
const {
  breadcrumbs,
  addBreadcrumb,
  removeBreadcrumb,
  clearBreadcrumbs,
  setBreadcrumbsFromRoute,
} = useBreadcrumbs();
```

**File**: `mms-frontend/src/shared/components/Breadcrumbs.tsx`

Renders breadcrumb navigation trail (optional use in pages).

## API Responses

### GET /api/navigation/main

```json
[
  {
    "navigation_id": 1,
    "parent_navigation_id": null,
    "context": "MAIN",
    "navigation_type": "MENU",
    "title": "Dashboard",
    "route": "/dashboard",
    "icon": "dashboard",
    "permission_code": null,
    "display_order": 0,
    "is_visible": true,
    "children": []
  },
  {
    "navigation_id": 2,
    "parent_navigation_id": null,
    "context": "MAIN",
    "navigation_type": "GROUP",
    "title": "Coordinating Transactions",
    "route": null,
    "icon": "clipboard",
    "permission_code": null,
    "display_order": 1,
    "is_visible": true,
    "children": [
      {
        "navigation_id": 8,
        "parent_navigation_id": 2,
        "context": "MAIN",
        "navigation_type": "MENU",
        "title": "Material Request",
        "route": "/coordinating/material-request",
        "icon": "file",
        "permission_code": null,
        "display_order": 0,
        "is_visible": true,
        "children": []
      }
    ]
  }
]
```

### GET /api/navigation/report-catalog-sidebar

```json
[
  {
    "group_id": 9,
    "group_name": "Inventory",
    "icon": "boxes",
    "display_order": 0,
    "reports": [
      {
        "report_id": 20,
        "report_name": "Inventory Summary",
        "route": "/reports/inventory-summary",
        "icon": null,
        "display_order": 0
      },
      {
        "report_id": 21,
        "report_name": "Inventory Ledger",
        "route": "/reports/inventory-ledger",
        "icon": null,
        "display_order": 1
      }
    ]
  }
]
```

## Database Migrations

### Deploy

Run these migrations in order:

1. **049_navigation.sql** - Creates navigation table with indexes
2. **049_navigation_seed.sql** - Populates MAIN and REPORTS menus

### Location

```
database/
  migrations/
    049_navigation.sql
    049_navigation_seed.sql
  rollback/
    049_navigation_rollback.sql
```

### Rollback

To remove the navigation system:

```sql
DROP TABLE navigation CASCADE;
```

## Seeded Data Structure

### MAIN Context (Root Level)
- Dashboard (MENU)
- Coordinating Transactions (GROUP)
  - Material Request (MENU)
  - Material Control (MENU)
  - Approved Previous Request (MENU)
  - Additional Control (VO) (MENU)
- Purchasing Transactions (GROUP)
  - 8 menu items
- Inventory Transactions (GROUP)
  - 6 menu items
- Reports (MENU) - triggers context switch
- Masterlist (GROUP)
  - Product Management (MENU)
  - Project Management (MENU)
  - Supplier Management (MENU)
- Administrator (GROUP)
  - Manage User (MENU)
  - Role Permission (MENU)
  - System Configuration (MENU)

### REPORTS Context (Root Level)
- Back (HEADER) - renders as back button
- Inventory (GROUP)
  - 3 reports
- Purchasing (GROUP)
  - 3 reports
- Warehouse (GROUP)
  - 2 reports
- Projects (GROUP)
  - 2 reports
- Accounting (GROUP)
  - 2 reports
- Administration (GROUP)
  - 2 reports

## Adding New Menu Items

### Method 1: Direct SQL

```sql
INSERT INTO navigation (
  parent_navigation_id, context, navigation_type, title, route, icon, 
  display_order, is_visible, is_deleted, log_created_by_account_id
) VALUES (
  2, 'MAIN', 'MENU', 'New Menu Item', '/path/to/page', 'icon-name', 
  10, true, false, 1
);
```

### Method 2: Application UI (Future)

Create admin panel to manage navigation items with CRUD operations against the navigation table.

## Adding Permission Controls

To protect a menu item:

```sql
UPDATE navigation 
SET permission_code = 'MENU_MATERIAL_REQUEST'
WHERE navigation_id = 8;
```

Ensure the account has this permission via role_permission table:

```sql
INSERT INTO role_permission (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM role r, permission p
WHERE r.role_code = 'MANAGER' 
  AND p.permission_code = 'MENU_MATERIAL_REQUEST';
```

## Performance Considerations

### Query Optimization

- **Single Round-trip**: `findByContext()` fetches all items in one query
- **Indexed Lookups**: Context + parent_id queries use composite index
- **Permission Filtering**: Joins occur at SQL level (not n+1)
- **Caching**: Frontend caches navigation data in context

### Frontend Optimization

- **localStorage Persistence**: Expanded state survives page refresh
- **Lazy Loading**: Reports sidebar loaded only when REPORTS context active
- **Memoization**: Menu items memoized to prevent unnecessary re-renders
- **Debouncing**: Toggle expand/collapse debounced

## Security

### Permission Checks

- **SQL-level Filtering**: User permissions verified in database query, not application code
- **Role-Based Access**: Permission codes tied to role_permission table
- **Auth Required**: All navigation endpoints require valid JWT token

### Data Protection

- **Soft Delete**: Items marked deleted but not removed
- **Audit Trail**: Created/updated/deleted by account_id and timestamp
- **Cascading**: Deleting parent doesn't delete children (manual management required)

## Troubleshooting

### Navigation Not Loading

1. Verify authentication token in API request
2. Check navigation table exists: `SELECT COUNT(*) FROM navigation`
3. Review browser console for API errors
4. Ensure backend server is running on correct port

### Menu Items Not Appearing

1. Check `is_deleted = false` in database
2. Check `is_visible = true` in database
3. Verify `display_order` is set (default 0)
4. If permission_code is set, verify user has that permission

### Expanded Items Not Persisting

1. Verify localStorage is enabled in browser
2. Check browser DevTools → Application → Local Storage
3. Key should be: `navigationExpandedItems`
4. Value should be JSON array of IDs

### Reports Sidebar Empty

1. Verify report_catalog table has entries
2. Check navigation table has REPORT type items with parent_id set
3. Ensure report groups have children (reports)

## Testing

### Manual Testing Steps

1. **Login** and navigate to app
2. **Main Menu**: Expand/collapse groups, verify state persists
3. **Reports Click**: Click "Reports" menu - sidebar should change
4. **Back Button**: Click back button in reports sidebar - should restore main menu
5. **Navigation**: Click any menu item with route - should navigate
6. **Icons**: Verify icons render correctly (text-based unicode)
7. **Responsive**: Resize browser, test at 768px and 480px breakpoints

### Unit Testing Recommended

- NavigationRepository: Mock pool queries
- NavigationService: Mock repository methods
- MainSidebar: Test expand/collapse, Reports click handling
- ReportsSidebar: Test back button, report group rendering

## Future Enhancements

1. **Admin Dashboard**: CRUD interface for managing navigation items
2. **Breadcrumb Integration**: Render Breadcrumbs component in app
3. **Search**: Full-text search across navigation items
4. **Favorites**: Star/pin frequently used items
5. **Keyboard Shortcuts**: Alt+number to navigate
6. **Accessibility**: ARIA labels, keyboard navigation
7. **Mobile Menu**: Hamburger menu for mobile viewports
8. **Dark/Light Theme Toggle**: User preference storage
9. **Analytics**: Track most-used menu paths
10. **Dynamic Permissions**: Update permissions without page reload

## Support & Maintenance

- **Database Backups**: Include navigation table in daily backups
- **Migration Versions**: Maintain rollback scripts for all versions
- **Change Log**: Document new menu items in version releases
- **Testing**: Regression test navigation after system updates
