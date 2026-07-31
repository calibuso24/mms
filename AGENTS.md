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