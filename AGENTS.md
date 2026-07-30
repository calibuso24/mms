# AI Assistant Instructions

Before generating code:

1. Read:
   - docs/01_PROJECT_CONTEXT.md
   - docs/02_DATABASE_GUIDE.md
   - docs/03_BUSINESS_FLOW.md
   - docs/04_DEVELOPMENT_GUIDE.md

2. Analyze the existing repository before creating new files.

3. Reuse existing components.

4. Never duplicate:
   - tables
   - services
   - hooks
   - APIs
   - lookup values

5. Follow PostgreSQL naming conventions.

6. Follow React + Material UI architecture.

7. Generate production-ready code only.

8. If the request conflicts with the existing architecture, explain the conflict instead of generating incorrect code.

9. Never generate unnecessary markdown documentation unless explicitly requested.

Database Rule

The ERD is the single source of truth.

AI must never redesign the database.

Before generating code:
1. Read the ERD.
2. Match the existing database schema.
3. Reuse existing tables.
4. Reuse existing foreign keys.
5. Reuse existing lookup tables.
6. If the requested feature requires a schema change not present in the ERD, stop and request approval instead of modifying the design.