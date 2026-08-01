# AI Assistant Instructions

## Project Context

Before generating any code:

1. Read:
   - `docs/01_PROJECT_CONTEXT.md`
   - `docs/02_DATABASE_GUIDE.md`
   - `docs/03_BUSINESS_FLOW.md`
   - `docs/04_DEVELOPMENT_GUIDE.md`

2. Analyze the existing repository before creating new files.

3. Reuse existing:
   - Components
   - Services
   - Hooks
   - APIs
   - Utilities
   - Validation
   - Lookup values

4. Never duplicate:
   - Tables
   - Services
   - Components
   - Hooks
   - APIs
   - Business logic
   - Lookup values

5. Follow the existing project architecture.

6. Follow PostgreSQL naming conventions.

7. Follow the React + Material UI architecture.

8. Generate production-ready code only.

9. If the request conflicts with the existing architecture, explain the conflict instead of generating incorrect code.

10. Never generate unnecessary markdown documentation unless explicitly requested.

11. Keep repository documentation aligned with the current implementation:
   - When a feature, route, permission module, workflow, or setup step changes, update the relevant markdown under docs/ and the service-specific setup guides.
   - If a new workflow or module is implemented, update the relevant project context, business flow, development guide, and setup documentation rather than leaving the docs stale.

---

# Database Rules

The ERD is the single source of truth.

The AI must **never redesign the database** unless explicitly instructed.

Before generating backend code:

1. Read the ERD.
2. Match the existing database schema.
3. Reuse existing tables.
4. Reuse existing foreign keys.
5. Reuse existing lookup tables.
6. Reuse existing indexes and constraints where applicable.
7. Never rename existing database objects.
8. If a schema change is required but is not present in the ERD, stop and request approval before making any changes.

---

# UI / Form Design Standards

All **Create**, **Edit**, and **View** forms must follow these standards unless explicitly instructed otherwise.

## UI Philosophy

This is an enterprise business application.

Prioritize:

- Consistency
- Readability
- Productivity
- Accessibility
- Maintainability

Avoid flashy animations, oversized controls, unnecessary colors, and inconsistent layouts.

Every page should feel like part of the same application.

---

## Material UI

- Use Material UI components only.
- Follow Material Design 3.
- Reuse existing shared components.
- Maintain a professional enterprise appearance.
- Never change business logic when improving layouts.

---

## Layout

- Use Material UI Grid (12-column responsive layout).
- Default breakpoints:
  - `xs={12}`
  - `md={6}`
  - `lg={4}`
- Use consistent spacing (`spacing={2}` or project standard).
- Align labels and controls consistently.
- Keep related fields on the same row.
- Minimize unnecessary whitespace.
- Create and Edit forms should use the same layout.

---

## Grouping

Group fields into Cards or Paper sections.

Example:

- Basic Information
- Configuration
- Options
- Templates
- Audit Information

Do not mix unrelated fields within the same section.

---

## Field Order

Arrange fields according to the business workflow, **not** database column order.

Preferred order:

1. Primary identifiers
2. Business information
3. Configuration
4. Options
5. Templates / Attachments
6. Audit information

---

## Component Selection

Choose the appropriate Material UI component for each data type.

| Data Type | Component |
|-----------|-----------|
| Text | TextField |
| Long Text | Multiline TextField |
| Number | Number TextField |
| Currency | Formatted Numeric Input |
| Boolean | Switch (preferred) or Checkbox |
| Lookup | Autocomplete |
| Enum | Select |
| Date | DatePicker |
| Date & Time | DateTimePicker |
| Read-only | Typography or Disabled TextField |

---

## Validation

- Clearly indicate required fields.
- Display validation errors below each field.
- Disable Save during submission.
- Prevent duplicate submissions.

---

## Buttons

Primary:

- Save
- Update

Secondary:

- Cancel

Place action buttons at the bottom-right.

---

## Responsive Design

Desktop:
- Multi-column layout.

Tablet:
- Two-column layout when practical.

Mobile:
- Single-column layout.

---

## Consistency

When creating new forms:

- Follow existing form layouts.
- Reuse shared components.
- Reuse validation logic.
- Reuse spacing.
- Reuse styling.

Do not invent a different layout for each page.

---

## Completion Checklist

Before completing any Create/Edit/View form, verify:

- Fields are logically grouped.
- Field order follows the business process.
- Labels are consistent.
- Responsive layout works correctly.
- Material UI best practices are followed.
- Existing business logic remains unchanged.

# Master-Detail Transaction UI Standard

## Purpose

All master-detail transaction modules must follow a consistent ERP-style editable grid design. Do not implement detail entry using repeated modal dialogs or single-record forms unless explicitly required by the business process.

This standard applies to all existing and future transaction modules.

## Applies To

- Material Request
- Purchase Request
- Request for Quotation
- Purchase Order
- Supplier Delivery
- Delivery Receipt
- Delivery Advice
- Stock Transfer
- Material Adjustment
- Inventory Count
- Any future master-detail transaction

---

## Detail Entry Standard

The detail section shall use an editable data grid.

Each row represents one detail record.

Users must be able to:

- Add rows
- Edit rows inline
- Delete rows
- Navigate using the keyboard
- Save all rows together with the master record

Do not use popup dialogs for normal detail editing.

Popup dialogs are only acceptable for complex sub-records such as:

- Serial Numbers
- Lot Numbers
- Batch Information
- Attachments
- Approval History
- Other advanced information

---

## Grid Behavior

The editable grid should support:

- Inline editing
- Single-click edit
- Keyboard navigation
- Tab navigation
- Shift+Tab navigation
- Enter to commit edits
- Arrow-key navigation
- Row selection
- Multi-row support
- Responsive layout
- Sticky header
- Vertical scrolling

---

## Material Selection

Selecting a material must automatically populate available information.

Example:

- Material Code
- Description
- Specification
- Brand
- Unit of Measure

Avoid requiring users to enter duplicate information manually.

---

## Validation

Validate during editing.

Examples:

- Required fields
- Quantity > 0
- Duplicate materials (where business rules prohibit duplicates)
- Numeric validation
- Business rule validation

Display validation directly in the edited cell whenever possible.

---

## Computed Columns

Automatically calculate values while editing.

Examples:

- Amount = Quantity × Unit Cost
- Remaining Quantity
- Extended Cost

Computed values must update immediately when dependent values change.

---

## Footer Totals

Display running totals.

Examples:

- Total Items
- Total Quantity
- Total Amount

Totals should update automatically as rows are edited.

---

## Performance

The editable grid must efficiently support large datasets.

Guidelines:

- Support at least 100–500 detail rows.
- Avoid unnecessary React re-renders.
- Memoize expensive computations.
- Use virtualization when appropriate.
- Preserve editing state during updates.

---

## Reusable Components

Do not duplicate editable grid implementations.

Create reusable components for:

- EditableDetailGrid
- Material lookup cell
- Quantity editor
- Currency editor
- Validation helpers
- Footer totals
- Row actions

All master-detail modules should reuse these shared components.

---

## Consistency

All master-detail transaction modules should provide a consistent user experience.

Layouts, keyboard shortcuts, validation behavior, editing flow, and visual styling should behave identically unless business requirements explicitly require otherwise.

# Design Principles

When implementing user interfaces:

- Prioritize fast keyboard-driven data entry.
- Minimize mouse clicks.
- Favor inline editing over modal dialogs.
- Prefer reusable components over duplicated implementations.
- Keep the user on a single screen whenever possible.
- Auto-populate related fields whenever sufficient information is available.
- Calculate derived values automatically.
- Validate immediately rather than only during save.
- Follow common ERP patterns instead of generic CRUD forms.

# Standard Document Form Guidelines

## Purpose

All transactional master-detail modules in MMS must follow a single reusable document form standard.

This applies to all document modules, including but not limited to:

- Material Control
- Material Request
- Purchase Order
- Delivery Advice
- Supplier Delivery
- Stock Transfer
- Material Adjustment
- Any future transactional document

Never implement module-specific document behaviors if a reusable solution can be used.

---

# Document Window

All document forms must support:

- Normal window
- Maximized window
- Restore Down
- Draggable window
- Resizable window
- Responsive layout
- Remember last window size during the current session

The maximize state should persist while navigating between document pages during the session.

The detail grid must automatically resize to occupy all available space.

The layout must remain usable on:

- 1366×768
- 1600×900
- 1920×1080
- Ultrawide monitors

---

# Document Header

Every document should display:

- Document Number
- Document Status
- Project
- Supplier (if applicable)
- Warehouse (if applicable)
- Date
- Created By
- Last Modified
- Last Saved Time

Example

MR-000123

Draft

Saved 2 minutes ago

---

# Toolbar

Every document must expose a consistent toolbar.

Required actions:

- New
- Save
- Save Draft
- Submit
- Approve
- Reject
- Print
- Refresh
- History
- Close

Unavailable actions should be disabled instead of hidden whenever possible.

---

# Draft Support

Every document supports Draft.

Drafts:

- may contain incomplete information
- remain editable
- do not update inventory
- do not update stock balances
- do not create accounting entries
- do not participate in approval workflow
- may contain incomplete detail rows

Drafts must preserve:

- Master fields
- Detail rows
- Attachments
- Notes
- Selected supplier
- Selected project
- Calculated values
- User preferences

---

# Auto Save

Support automatic draft saving.

Auto-save should occur:

- every configurable interval
- after significant edits
- before navigation when possible
- before browser refresh when supported

Display non-blocking status.

Examples:

Saving...

Saved 10:42 AM

Offline

Retrying...

Never interrupt the user's workflow.

---

# Unsaved Changes

Detect modified documents.

Before:

- Closing
- Refreshing
- Route changes
- Browser exit

Display:

You have unsaved changes.

Options:

- Save Draft
- Discard
- Cancel

Never lose user data silently.

---

# Draft Recovery

If the application closes unexpectedly:

Upon reopening:

Detect recoverable drafts.

Display:

Recover Draft

Discard Draft

Restoring must recover:

- master information
- detail rows
- grid state
- expanded panels
- attachments
- unsaved edits

---

# Status Lifecycle

Support the following lifecycle.

Draft

↓

Submitted

↓

Pending Approval

↓

Approved

↓

Closed

Additional states:

Rejected

Cancelled

Draft is always editable.

Submitted is editable only according to business rules.

Approved documents should be locked except for authorized users.

---

# Master Detail Layout

Document forms should use a responsive layout.

Preferred layout:

------------------------------------------------------

Header Information

------------------------------------------------------

Toolbar

------------------------------------------------------

Master Information

------------------------------------------------------

Detail Grid (fills remaining height)

------------------------------------------------------

Totals

------------------------------------------------------

The detail section should occupy most of the available screen.

Avoid excessive scrolling.

---

# Detail Grid Standards

The detail grid should support:

- Inline editing
- Multiple visible rows
- Keyboard navigation
- Copy & Paste
- Bulk Paste from Excel
- Drag & Drop row ordering (where applicable)
- Row duplication
- Multi-row deletion
- Sticky footer totals
- Sticky column headers
- Automatic recalculation

The grid should never force editing one row at a time.

---

# Validation

Saving Draft:

Validate only minimum required information.

Submitting:

Execute complete business validation.

Approval:

Execute approval validation.

Posting:

Execute inventory validation.

---

# Performance

Document pages should remain responsive.

Requirements:

- Virtualized grids for large datasets
- Incremental updates
- Partial saves
- Save only modified records
- Optimistic concurrency
- Lazy loading where appropriate

Avoid reloading the entire document after every save.

---

# User Experience

Provide clear visual indicators.

Examples:

Draft

Approved

Pending

Cancelled

Dirty (Unsaved)

Read Only

Locked by Another User

Display save progress whenever saving.

---

# Keyboard Shortcuts

Ctrl + N

New

Ctrl + S

Save

Ctrl + Shift + S

Save Draft

Ctrl + Enter

Submit

F5

Refresh

F11

Toggle Fullscreen

Esc

Close document (with confirmation)

Delete

Delete selected detail rows

Insert

Insert new detail row

---

# Session Recovery

If the user logs out unexpectedly:

Offer to reopen the last active draft.

If multiple drafts exist:

Display a recovery list.

---

# Concurrency

When another user is editing the same document:

Display:

Currently being edited by:

<User>

Options:

- Open Read Only
- Force Edit (authorized users only)
- Cancel

---

# Audit Trail

Every document must record:

Created By

Created Date

Modified By

Modified Date

Approved By

Approved Date

Status History

Draft History

Inventory Posting History

Users must be able to view the complete history.

---

# Reusable Architecture

Never duplicate document logic.

Implement reusable infrastructure for:

- Document Shell
- Draft Service
- Auto Save Service
- Recovery Service
- Dirty State Detection
- Window State Manager
- Toolbar Component
- Status Badge Component
- Document Header Component
- Detail Grid Component
- Validation Pipeline
- Audit History Component

Future document modules must reuse this infrastructure instead of creating new implementations.

The same reusable document standards should be applied to every future transactional document module, and any implementation-specific deviations should be justified in the relevant design notes.

The layout must remain usable on:

- 1366×768
- 1600×900
- 1920×1080
- Ultrawide monitors

---

# Document Header

Every document should display:

- Document Number
- Document Status
- Project
- Supplier (if applicable)
- Warehouse (if applicable)
- Date
- Created By
- Last Modified
- Last Saved Time

Example

MR-000123

Draft

Saved 2 minutes ago

---

# Toolbar

Every document must expose a consistent toolbar.

Required actions:

- New
- Save
- Save Draft
- Submit
- Approve
- Reject
- Print
- Refresh
- History
- Close

Unavailable actions should be disabled instead of hidden whenever possible.

---

# Draft Support

Every document supports Draft.

Drafts:

- may contain incomplete information
- remain editable
- do not update inventory
- do not update stock balances
- do not create accounting entries
- do not participate in approval workflow
- may contain incomplete detail rows

Drafts must preserve:

- Master fields
- Detail rows
- Attachments
- Notes
- Selected supplier
- Selected project
- Calculated values
- User preferences

---

# Auto Save

Support automatic draft saving.

Auto-save should occur:

- every configurable interval
- after significant edits
- before navigation when possible
- before browser refresh when supported

Display non-blocking status.

Examples:

Saving...

Saved 10:42 AM

Offline

Retrying...

Never interrupt the user's workflow.

---

# Unsaved Changes

Detect modified documents.

Before:

- Closing
- Refreshing
- Route changes
- Browser exit

Display:

You have unsaved changes.

Options:

- Save Draft
- Discard
- Cancel

Never lose user data silently.

---

# Draft Recovery

If the application closes unexpectedly:

Upon reopening:

Detect recoverable drafts.

Display:

Recover Draft

Discard Draft

Restoring must recover:

- master information
- detail rows
- grid state
- expanded panels
- attachments
- unsaved edits

---

# Status Lifecycle

Support the following lifecycle.

Draft

↓

Submitted

↓

Pending Approval

↓

Approved

↓

Closed

Additional states:

Rejected

Cancelled

Draft is always editable.

Submitted is editable only according to business rules.

Approved documents should be locked except for authorized users.

---

# Master Detail Layout

Document forms should use a responsive layout.

Preferred layout:

------------------------------------------------------

Header Information

------------------------------------------------------

Toolbar

------------------------------------------------------

Master Information

------------------------------------------------------

Detail Grid (fills remaining height)

------------------------------------------------------

Totals

------------------------------------------------------

The detail section should occupy most of the available screen.

Avoid excessive scrolling.

---

# Detail Grid Standards

The detail grid should support:

- Inline editing
- Multiple visible rows
- Keyboard navigation
- Copy & Paste
- Bulk Paste from Excel
- Drag & Drop row ordering (where applicable)
- Row duplication
- Multi-row deletion
- Sticky footer totals
- Sticky column headers
- Automatic recalculation

The grid should never force editing one row at a time.

---

# Validation

Saving Draft:

Validate only minimum required information.

Submitting:

Execute complete business validation.

Approval:

Execute approval validation.

Posting:

Execute inventory validation.

---

# Performance

Document pages should remain responsive.

Requirements:

- Virtualized grids for large datasets
- Incremental updates
- Partial saves
- Save only modified records
- Optimistic concurrency
- Lazy loading where appropriate

Avoid reloading the entire document after every save.

---

# User Experience

Provide clear visual indicators.

Examples:

Draft

Approved

Pending

Cancelled

Dirty (Unsaved)

Read Only

Locked by Another User

Display save progress whenever saving.

---

# Keyboard Shortcuts

Ctrl + N

New

Ctrl + S

Save

Ctrl + Shift + S

Save Draft

Ctrl + Enter

Submit

F5

Refresh

F11

Toggle Fullscreen

Esc

Close document (with confirmation)

Delete

Delete selected detail rows

Insert

Insert new detail row

---

# Session Recovery

If the user logs out unexpectedly:

Offer to reopen the last active draft.

If multiple drafts exist:

Display a recovery list.

---

# Concurrency

When another user is editing the same document:

Display:

Currently being edited by:

<User>

Options:

- Open Read Only
- Force Edit (authorized users only)
- Cancel

---

# Audit Trail

Every document must record:

Created By

Created Date

Modified By

Modified Date

Approved By

Approved Date

Status History

Draft History

Inventory Posting History

Users must be able to view the complete history.

---

# Reusable Architecture

Never duplicate document logic.

Implement reusable infrastructure for:

- Document Shell
- Draft Service
- Auto Save Service
- Recovery Service
- Dirty State Detection
- Window State Manager
- Toolbar Component
- Status Badge Component
- Document Header Component
- Detail Grid Component
- Validation Pipeline
- Audit History Component

Future document modules must reuse this infrastructure instead of creating new implementations.

# Dashboard Development Standards

All dashboards must:

- Be fully database-driven.
- Never use hardcoded values.
- Load each widget independently.
- Follow RBAC permissions.
- Support loading, empty, and error states.
- Be responsive.
- Use efficient SQL queries.
- Reuse existing services and repositories.
- Avoid duplicate business logic.
- Use the appropriate chart type:
  - Line: trends
  - Bar: comparisons
  - Horizontal Bar: Top-N rankings
  - Pie/Donut: distributions
  - Area: growth over time
  - Gauge: completion/progress
- Display only information relevant to the user's department.
- Support future filtering, auto-refresh, and personalization.