# MMS Report Catalog Module

## Overview

The Report Catalog Module is a comprehensive framework for managing, configuring, and controlling access to system reports in the Material Management System (MMS). It provides centralized report definition management, parameter configuration, role-based access control, and complete audit trails for report generation and execution.

## Module Architecture

### Tables

#### 1. `report_catalog` (Master Report Definitions)
Stores all report metadata and configuration.

**Key Columns:**
- `report_id`: Unique identifier (BIGINT PK)
- `report_code`: Unique report code (e.g., INV001, PUR002)
- `report_name`: User-friendly report name
- `report_category_lookup_id`: Foreign key to look_up (REPORT_CATEGORY)
- `report_type_lookup_id`: Foreign key to look_up (REPORT_TYPE)
- `description`: Full description of the report
- `report_url`: URL to access the report
- `report_file`: File path to report template/definition
- `display_order`: Display sequence in UI
- `requires_parameter`: Boolean flag indicating if parameters are required
- `is_active`: Soft delete flag for active status
- `is_deleted`: Soft delete flag

**Audit Columns:**
- `log_date_created`, `log_created_by_account_id`
- `log_date_updated`, `log_updated_by_account_id`
- `log_date_deleted`, `log_deleted_by_account_id`
- `log_module_created`, `log_module_updated`

**Indexes:**
- report_category_lookup_id, report_type_lookup_id
- report_code, is_active, is_deleted

---

#### 2. `report_parameter` (Report Parameter Configuration)
Defines parameters required for report execution.

**Key Columns:**
- `report_parameter_id`: Unique identifier (BIGINT PK)
- `report_id`: Foreign key to report_catalog (CASCADE DELETE)
- `parameter_name`: Internal parameter name
- `display_name`: User-friendly parameter label
- `data_type_lookup_id`: Foreign key to look_up (REPORT_PARAMETER_DATA_TYPE)
- `control_type_lookup_id`: Foreign key to look_up (REPORT_CONTROL_TYPE)
- `lookup_table`: Optional reference table for dropdowns
- `default_value`: Optional default parameter value
- `is_required`: Boolean flag indicating mandatory parameter
- `display_order`: UI display sequence
- `is_deleted`: Soft delete flag

**Cascade Behavior:**
- Deleting a report automatically cascades delete to all its parameters

---

#### 3. `permission` and `role_permission` (Role-Based Access Control)
Leverages existing MMS permission system to manage report access.

**Key Columns (permission table):**
- `permission_id`: Unique identifier
- `module_name`: "Report Catalog" for all report permissions
- `permission_code`: Report code (e.g., INV001, PUR002)
- `permission_name`: Descriptive name
- `description`: Full description
- `is_active`: Status flag
- `is_deleted`: Soft delete flag

**Key Columns (role_permission table):**
- `role_permission_id`: Unique identifier
- `role_id`: Foreign key to role table
- `permission_id`: Foreign key to permission table
- `is_active`: Status flag

**Cascade Behavior:**
- Deleting a role cascades delete to its role_permission entries
- Deleting a permission cascades delete to its role_permission entries

---

#### 4. `report_history` (Execution Audit Trail)
Tracks all report executions and results.

**Key Columns:**
- `report_history_id`: Unique identifier (BIGINT PK)
- `report_id`: Foreign key to report_catalog
- `account_id`: Foreign key to account (who executed)
- `parameters`: JSONB object containing execution parameters
- `generated_file`: File path or reference to output
- `execution_time_ms`: Execution duration in milliseconds
- `status_lookup_id`: Foreign key to look_up (REPORT_STATUS)
- `log_date_created`: Execution timestamp

**Audit Use Cases:**
- Track who ran which report and when
- Monitor report generation performance
- Analyze parameter usage patterns
- Maintain compliance audit trail

---

## Lookup Data

### REPORT_CATEGORY
Categorizes reports by functional area:
- Inventory
- Purchasing
- Warehouse
- Projects
- Accounting
- Administration

### REPORT_TYPE
Defines how reports are generated:
- SQL (Direct SQL query)
- Jasper Report
- Crystal Report
- Stored Procedure
- PDF
- Excel
- CSV

### REPORT_PARAMETER_DATA_TYPE
Specifies parameter data types:
- String
- Integer
- Decimal
- Boolean
- Date
- DateTime

### REPORT_CONTROL_TYPE
Defines UI controls for parameter input:
- Textbox
- Textarea
- Dropdown
- Multi Select
- Checkbox
- Radio Button
- Date Picker
- Date Range
- Number

### REPORT_STATUS
Status values for report execution:
- Success
- Failed
- Running

---

## Initial Report Catalog

### Inventory Reports (7)
| Code | Name | Parameters | Description |
|------|------|-----------|-------------|
| INV001 | Inventory Summary | date_from, date_to, warehouse | Summary of current inventory levels |
| INV002 | Inventory Ledger | - | Transaction-level ledger for auditing |
| INV003 | Stock Card | product_id, warehouse_id | Individual product movement history |
| INV004 | Stock Movement | - | All stock movements in date range |
| INV005 | Reorder Level | - | Products below reorder level |
| INV006 | Expiring Materials | - | Products approaching expiration |
| INV007 | Inventory Adjustment | - | Physical count adjustments |

### Purchasing Reports (5)
| Code | Name | Parameters | Description |
|------|------|-----------|-------------|
| PUR001 | Purchase Requests | date_from, date_to | Material purchase requests |
| PUR002 | Purchase Orders | date_from, date_to, supplier, status | Detailed PO with items |
| PUR003 | Supplier Performance | - | Supplier metrics and ratings |
| PUR004 | Purchase Order Status | - | PO and delivery tracking |
| PUR005 | Pending Deliveries | - | Delayed/pending deliveries |

### Warehouse Reports (4)
| Code | Name | Parameters | Description |
|------|------|-----------|-------------|
| WAR001 | Receiving Report | - | Goods received from suppliers |
| WAR002 | Material Issuance | - | Materials issued to projects |
| WAR003 | Warehouse Transfer | - | Inter-warehouse transfers |
| WAR004 | Returned Materials | - | Materials returned to warehouse |

### Project Reports (3)
| Code | Name | Parameters | Description |
|------|------|-----------|-------------|
| PRO001 | Material Requests | - | Project material requests |
| PRO002 | Project Material Consumption | project, date_from, date_to | Material usage by project |
| PRO003 | Material Budget vs Actual | - | Budget vs actual consumption |

### Accounting Reports (4)
| Code | Name | Parameters | Description |
|------|------|-----------|-------------|
| ACC001 | Inventory Valuation | - | Inventory value summary |
| ACC002 | Inventory Cost Analysis | date_from, date_to | Cost analysis of movements |
| ACC003 | Quarterly Audit | - | Quarterly audit report |
| ACC004 | Material Expense Summary | - | Material expenses by period |

### Administration Reports (4)
| Code | Name | Parameters | Description |
|------|------|-----------|-------------|
| ADM001 | User Activity | date_from, date_to | User activity log |
| ADM002 | Audit Trail | - | System change audit trail |
| ADM003 | Login History | date_from, date_to | User login tracking |
| ADM004 | Permission Matrix | - | Role-report permissions |

**Total: 27 Reports**

---

## Role-Based Permissions

### Permission Assignment
Report permissions are managed through the existing MMS permission system:

1. Each report creates a permission record in the `permission` table
   - module_name: "Report Catalog"
   - permission_code: Report code (INV001, PUR002, etc.)
   - permission_name: "View {ReportName}"

2. Role access is controlled via `role_permission` table
   - Links roles to report permissions
   - Single permission record per role-report pair

### Permission Matrix

| Role | Reports | Method |
|------|---------|--------|
| Super Administrator | All via permission codes | Direct role_permission links |
| Administrator | All via permission codes | Direct role_permission links |
| Inventory Staff | INV001-007 | Filtered by permission_code |
| Inventory Supervisor | INV001-007 | Filtered by permission_code |
| Purchasing Staff | PUR001-005 | Filtered by permission_code |
| Purchasing Supervisor | PUR001-005 | Filtered by permission_code |
| Warehouse Staff | WAR001-004 | Filtered by permission_code |
| Warehouse Supervisor | WAR001-004 | Filtered by permission_code |
| Coordinating Staff | PRO001-003 | Filtered by permission_code |
| Coordinating Supervisor | PRO001-003 | Filtered by permission_code |
| Accounting Staff | ACC001-004 | Filtered by permission_code |
| Accounting Supervisor | ACC001-004 | Filtered by permission_code |
| Auditor | ADM001-004 | Filtered by permission_code |

---

## Deployment

### Prerequisites
- PostgreSQL 12+
- MMS database with existing tables (look_up, role, account)
- Proper permissions to create tables and indexes

### Deployment Steps

1. **Create Tables** (in order):
   ```bash
   psql -f migrations/046_report_catalog.sql
   psql -f migrations/047_report_parameter.sql
   psql -f migrations/048_report_permission.sql
   psql -f migrations/049_report_history.sql
   ```

2. **Seed Lookup Data**:
   ```bash
   psql -f seeds/046_report_lookup_seed.sql
   ```

3. **Seed Report Data**:
   ```bash
   psql -f seeds/047_report_seed.sql
   ```

### Rollback

To remove the entire module:
```bash
psql -f migrations/999_report_catalog_rollback.sql
```

**WARNING:** This operation is irreversible. Ensure backups exist before executing.

---

## Usage Examples

### Query All Active Reports
```sql
SELECT report_code, report_name, is_active
FROM report_catalog
WHERE is_deleted = FALSE AND is_active = TRUE
ORDER BY report_code;
```

### Get Reports by Category
```sql
SELECT rc.report_code, rc.report_name, lu.name as category
FROM report_catalog rc
JOIN look_up lu ON rc.report_category_lookup_id = lu.look_up_id
WHERE rc.is_deleted = FALSE
ORDER BY lu.display_order, rc.display_order;
```

### Get Report Parameters
```sql
SELECT rp.parameter_name, rp.display_name, dt.name as data_type, ct.name as control_type
FROM report_parameter rp
JOIN look_up dt ON rp.data_type_lookup_id = dt.look_up_id
JOIN look_up ct ON rp.control_type_lookup_id = ct.look_up_id
WHERE rp.report_id = <report_id>
  AND rp.is_deleted = FALSE
ORDER BY rp.display_order;
```

### Check Role Permissions
```sql
SELECT rc.report_code, rc.report_name, rp.is_active
FROM role_permission rp
JOIN permission p ON rp.permission_id = p.permission_id
JOIN role r ON rp.role_id = r.role_id
JOIN report_catalog rc ON rc.report_code = p.permission_code
WHERE r.role_code = 'INV_STAFF'
  AND p.module_name = 'Report Catalog'
  AND p.is_deleted = FALSE
  AND rp.is_deleted = FALSE
  AND rc.is_deleted = FALSE
ORDER BY rc.report_code;
```

### View Report Execution History
```sql
SELECT 
    rh.report_history_id,
    rc.report_name,
    a.account_name,
    rh.parameters,
    rh.execution_time_ms,
    lu.name as status,
    rh.log_date_created
FROM report_history rh
JOIN report_catalog rc ON rh.report_id = rc.report_id
JOIN account a ON rh.account_id = a.account_id
LEFT JOIN look_up lu ON rh.status_lookup_id = lu.look_up_id
ORDER BY rh.log_date_created DESC
LIMIT 20;
```

### Add New Report
```sql
INSERT INTO report_catalog (
    report_code,
    report_name,
    report_category_lookup_id,
    report_type_lookup_id,
    description,
    display_order,
    requires_parameter,
    is_active,
    log_module_created
)
VALUES (
    'NEW001',
    'New Custom Report',
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_CATEGORY' AND name = 'Inventory'),
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_TYPE' AND name = 'SQL'),
    'Description of new report',
    1,
    FALSE,
    TRUE,
    'report_catalog'
);
```

### Grant Report Permission to Role
```sql
INSERT INTO role_permission (role_id, permission_id, is_active, log_module_created)
SELECT r.role_id, p.permission_id, TRUE, 'report_catalog'
FROM role r, permission p
WHERE r.role_code = 'INV_STAFF' 
  AND p.module_name = 'Report Catalog'
  AND p.permission_code = 'INV001'
  AND p.is_deleted = FALSE
ON CONFLICT (role_id, permission_id) DO NOTHING;
```

### Log Report Execution
```sql
INSERT INTO report_history (report_id, account_id, parameters, generated_file, execution_time_ms, status_lookup_id)
VALUES (
    <report_id>,
    <account_id>,
    '{"date_from": "2026-01-01", "date_to": "2026-12-31"}',
    '/reports/generated/report_2026_01_20.pdf',
    1234,
    (SELECT look_up_id FROM look_up WHERE look_up_type = 'REPORT_STATUS' AND name = 'Success')
);
```

---

## Database Design Patterns

### Soft Delete Pattern
All tables use `is_deleted` flag with audit columns (`log_date_deleted`, `log_deleted_by_account_id`) for non-destructive deletion.

### Cascade Delete Strategy
- `report_parameter` cascades on `report_id` deletion
- `report_permission` cascades on `role_id` and `report_id` deletion
- This ensures referential integrity and automatic cleanup

### Audit Trail
Every table includes:
- `log_date_created` with DEFAULT CURRENT_TIMESTAMP
- `log_created_by_account_id`
- `log_date_updated`, `log_updated_by_account_id` (for updates)
- `log_module_created`, `log_module_updated` (for tracking source)

### Lookup-Driven Configuration
All categorical data (categories, types, statuses) uses the centralized `look_up` table for maintainability and consistency.

---

## Performance Considerations

### Indexes
All foreign key columns have indexes for query performance:
- `report_catalog`: category, type, code, active status
- `report_parameter`: report_id, data_type, control_type
- `report_permission`: role_id, report_id
- `report_history`: report_id, account_id, status, creation date

### Query Optimization Tips
1. Always filter on `is_deleted = FALSE` for active records
2. Use `report_code` for lookups (indexed and unique)
3. Index additional columns for frequently filtered report_history queries
4. Consider partitioning report_history by date for large datasets

---

## Maintenance

### Archiving Old Report History
```sql
-- Archive reports older than 2 years
DELETE FROM report_history
WHERE log_date_created < CURRENT_DATE - INTERVAL '2 years'
  AND status_lookup_id = (
    SELECT look_up_id FROM look_up 
    WHERE look_up_type = 'REPORT_STATUS' AND name = 'Success'
  );
```

### Deactivating Unused Reports
```sql
UPDATE report_catalog
SET is_active = FALSE, log_date_updated = CURRENT_TIMESTAMP
WHERE report_id NOT IN (
    SELECT DISTINCT report_id FROM report_history
    WHERE log_date_created > CURRENT_DATE - INTERVAL '6 months'
);
```

### Checking for Missing Permissions
```sql
SELECT r.role_id, r.role_name, rc.report_id, rc.report_name
FROM role r
CROSS JOIN report_catalog rc
WHERE NOT EXISTS (
    SELECT 1 FROM report_permission rp
    WHERE rp.role_id = r.role_id AND rp.report_id = rc.report_id
)
  AND r.is_deleted = FALSE
  AND rc.is_deleted = FALSE;
```

---

## Support & Updates

For questions or modifications to the report catalog:
1. Review the schema documentation
2. Check existing deployment patterns
3. Follow MMS naming conventions
4. Maintain audit trail consistency
5. Test changes in staging environment before production

---

## Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0 | 2026-07-28 | Initial release with 27 reports, 4 tables, complete RBAC |

---

**Last Updated:** 2026-07-28  
**Module Status:** Production Ready
