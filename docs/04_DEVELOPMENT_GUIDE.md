# MMS — API Reference

## Base URL

```
http://localhost:3001/api
```

## Authentication

All routes except `POST /api/auth/login` require a `Bearer` token in the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

JWT tokens expire after 24 hours. The `authMiddleware` sets `req.accountId` from the decoded token.

Permission-guarded routes additionally require the account to have the specified module + action permission via `requirePermission(moduleName, permissionCode)`.

---

## Auth Routes — `/api/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | None | Authenticate and receive JWT token |
| `POST` | `/api/auth/set-password` | Required | Change password for current user |

### POST `/api/auth/login`
**Body:**
```json
{ "user_name": "superuser", "password": "superuser123" }
```
**Response:**
```json
{
  "token": "<jwt>",
  "account": { "account_id": 1, "user_name": "superuser", "full_name": "SuperUser" }
}
```

### POST `/api/auth/set-password`
**Body:**
```json
{ "new_password": "newpass123", "current_password": "oldpass" }
```

---

## Account Routes — `/api/accounts`

All require `Authorization` header. Most require `User Management` module permissions.

| Method | Path | Permission | Description |
|---|---|---|---|
| `GET` | `/api/accounts/me` | Any authenticated | Get current user's profile |
| `GET` | `/api/accounts/meta/roles` | `User Management / VIEW` | List all available roles |
| `GET` | `/api/accounts` | `User Management / VIEW` | List accounts with pagination & search |
| `GET` | `/api/accounts/:id` | `User Management / VIEW` | Get account by ID |
| `GET` | `/api/accounts/:id/permissions` | `User Management / VIEW` | Get account's permissions |
| `POST` | `/api/accounts` | `User Management / CREATE` | Create new account |
| `PUT` | `/api/accounts/:id` | `User Management / UPDATE` | Update account |
| `DELETE` | `/api/accounts/:id` | `User Management / DELETE` | Soft delete account |
| `POST` | `/api/accounts/:id/roles` | `User Management / UPDATE` | Assign role to account |
| `DELETE` | `/api/accounts/:id/roles/:roleCode` | `User Management / UPDATE` | Remove role from account |
| `POST` | `/api/accounts/:id/addresses` | `User Management / UPDATE` | Create address |
| `PUT` | `/api/accounts/:id/addresses/:addressId` | `User Management / UPDATE` | Update address |
| `DELETE` | `/api/accounts/:id/addresses/:addressId` | `User Management / UPDATE` | Delete address |
| `POST` | `/api/accounts/:id/phones` | `User Management / UPDATE` | Create phone |
| `PUT` | `/api/accounts/:id/phones/:phoneId` | `User Management / UPDATE` | Update phone |
| `DELETE` | `/api/accounts/:id/phones/:phoneId` | `User Management / UPDATE` | Delete phone |
| `POST` | `/api/accounts/:id/emails` | `User Management / UPDATE` | Create email |
| `PUT` | `/api/accounts/:id/emails/:emailId` | `User Management / UPDATE` | Update email |
| `DELETE` | `/api/accounts/:id/emails/:emailId` | `User Management / UPDATE` | Delete email |

---

## Navigation Routes — `/api/navigation`

All require `Authorization` header.

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/navigation/main` | Get MAIN context navigation tree (permission-filtered) |
| `GET` | `/api/navigation/reports` | Get REPORTS context navigation tree |
| `GET` | `/api/navigation/context/:context` | Get navigation by context string |
| `GET` | `/api/navigation/report-catalog-sidebar` | Get reports grouped by category for sidebar |

---

## Product Routes — `/api`

All require `Authorization` header.

### Categories
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/categories` | List categories (paginated) |
| `GET` | `/api/categories/:id` | Get category by ID |
| `POST` | `/api/categories` | Create category |
| `PUT` | `/api/categories/:id` | Update category |
| `DELETE` | `/api/categories/:id` | Soft delete category |

### Brands
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/brands` | List brands (paginated) |
| `GET` | `/api/brands/:id` | Get brand by ID |
| `POST` | `/api/brands` | Create brand |
| `PUT` | `/api/brands/:id` | Update brand |
| `DELETE` | `/api/brands/:id` | Soft delete brand |

### Units of Measure
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/uom` | List UOM (paginated) |
| `GET` | `/api/uom/:id` | Get UOM by ID |
| `POST` | `/api/uom` | Create UOM |
| `PUT` | `/api/uom/:id` | Update UOM |
| `DELETE` | `/api/uom/:id` | Soft delete UOM |

### Sub-Categories
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/subcategories` | List sub-categories (paginated) |
| `GET` | `/api/subcategories/:id` | Get sub-category by ID |
| `POST` | `/api/subcategories` | Create sub-category |
| `PUT` | `/api/subcategories/:id` | Update sub-category |
| `DELETE` | `/api/subcategories/:id` | Soft delete sub-category |

### Lookups
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/lookups/:type` | Get all lookup values for a type |
| `GET` | `/api/lookups/:type/:id` | Get specific lookup by ID |

### Materials
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/materials` | List materials with optional filters |
| `GET` | `/api/materials/:id` | Get material (with category, sub_category, UOM, status) |
| `POST` | `/api/materials` | Create material |
| `PUT` | `/api/materials/:id` | Update material |
| `DELETE` | `/api/materials/:id` | Soft delete material |

**Material list filters (query params):** `search`, `category_id`, `sub_category_id`, `status_id`, `uom_id`, `brand_id`, `limit`, `offset`

---

## Health Check

```
GET /health
```
Returns `{ "status": "ok" }`. No auth required.

---

## Error Responses

All errors return:
```json
{ "error": "<message>", "code": "<ERROR_CODE>" }
```

| HTTP Status | Class | When |
|---|---|---|
| 400 | `ValidationError` | Invalid request body |
| 401 | `UnauthorizedError` | Missing/invalid/expired token |
| 403 | `ForbiddenError` | Token valid but lacks permission |
| 404 | `NotFoundError` | Resource not found |
| 409 | `ConflictError` | Duplicate username, email conflict, etc. |
| 500 | `AppError` | Unexpected server error |

---

## Backend Architecture Layers

```
Request → Route → Controller → Service → Repository → PostgreSQL Pool
```

| Layer | Location | Responsibility |
|---|---|---|
| Routes | `src/routes/` | Mount controllers on HTTP methods/paths |
| Controllers | `src/controllers/` | Parse request, call service, return response |
| Services | `src/services/` | Business logic, transactions, validation |
| Repositories | `src/repositories/` | All raw SQL queries via `pg` pool |
| Middleware | `src/middleware/` | JWT auth, permission checks, error handling |
| Utils | `src/utils/` | JWT sign/verify, bcrypt hash/verify, error classes |

---

## Key Repository Methods

### AccountRepository
```typescript
findByUserName(userName, client?)
findById(accountId, client?)
findByIdWithRoles(accountId, client?)
findAll(limit, offset)
findAllWithDetails(limit, offset, search?)
create(userName, fullName, password, contactId, createdBy)
update(accountId, updates, updatedBy, client?)
softDelete(accountId, deletedBy, client?)
assignRole(accountId, roleId, createdBy, client?)
removeRole(accountId, roleId, client?)
findUserNameExists(userName, excludeAccountId?, client?)
```

### RoleRepository
```typescript
findAll()
findByCode(roleCode, client?)
getRolesForAccount(accountId, client?)
getRoleById(roleId, client?)
hasPermission(accountId, moduleName, permissionCode)
getPermissionsForAccount(accountId)
```

### MaterialRepository
```typescript
findById(id)
findByCode(code)
findAll(limit?, offset?, filters?)
create(data)
update(id, data)
softDelete(id)
```

### NavigationRepository
```typescript
findByContext(context, accountId?)
findByContextAndParent(context, parentId?, accountId?)
findChildren(navigationId, context, accountId?)
getReportCatalogByCategory(accountId?)
buildHierarchy(rows)
```

### ContactRepository
```typescript
// Addresses
createAddress(contactId, data, createdBy?, client?)
updateAddress(addressId, data, updatedBy?, client?)
deleteAddress(addressId, client?)
getAddressesByContact(contactId, client?)

// Phones
createPhone(contactId, phoneNumber, phoneTypeId, isPrimary, createdBy?, client?)
updatePhone(phoneId, data, updatedBy?, client?)
deletePhone(phoneId, client?)
getPhonesByContact(contactId, client?)

// Emails
createEmail(contactId, emailAddress, emailTypeId, isPrimary, createdBy?, client?)
updateEmail(emailId, data, updatedBy?, client?)
deleteEmail(emailId, client?)
getEmailsByContact(contactId, client?)
```

---

## Frontend API Client (`src/shared/api/client.ts`)

```typescript
// Static HTTP methods
ApiClient.get(endpoint)
ApiClient.post(endpoint, body)
ApiClient.put(endpoint, body)
ApiClient.delete(endpoint)

// Domain API objects
authApi.login(userName, password)
authApi.setPassword(password, currentPassword?)

accountApi.getMe()
accountApi.listAccounts(limit?, offset?, search?)
accountApi.listRoles()
accountApi.getPermissions(id)
accountApi.createAccount(data)
accountApi.updateAccount(id, data)
accountApi.deleteAccount(id)
accountApi.assignRole(id, roleCode)
accountApi.removeRole(id, roleCode)
accountApi.createAddress(accountId, data)
accountApi.updateAddress(accountId, addressId, data)
accountApi.deleteAddress(accountId, addressId)
// + phones and emails follow same pattern

categoryApi.list / get / create / update / delete
brandApi.list / get / create / update / delete
uomApi.list / get / create / update / delete
subCategoryApi.list(categoryId?) / get / create / update / delete
materialApi.list(limit?, offset?, filters?) / get / create / update / delete
```

# MMS — Authentication & RBAC

## Overview

MMS uses **JWT-based authentication** with a **Role-Based Access Control (RBAC)** model. Permissions are checked at the route level using middleware.

---

## Authentication Flow

```
1. POST /api/auth/login  (user_name + password)
2. Backend: bcrypt.compare(password, account.password)
3. If valid: generate JWT token (24h expiry)
4. Frontend: stores token in localStorage
5. All subsequent requests: send token in Authorization header
6. authMiddleware: verifies token, sets req.accountId
```

---

## JWT

**Utility functions** (`src/utils/auth.ts`):

```typescript
hashPassword(password)                    // bcrypt hash, 10 salt rounds
verifyPassword(password, hash)            // bcrypt compare
generateToken(payload)                    // signs JWT with config.jwt.secret
verifyToken(token)                        // verifies + decodes; returns null if invalid
```

**Token payload contains:**
- `accountId` — used by `req.accountId` in all protected routes

**Config** (`src/config/env.ts`):
```
JWT_SECRET=your_jwt_secret_key_change_this   ← MUST change in production
JWT_EXPIRES_IN=24h
```

---

## Middleware

### `authMiddleware` (required auth)
```typescript
// src/middleware/auth.ts
export function authMiddleware(req, res, next)
```
- Reads `Authorization: Bearer <token>` header
- Verifies token via `verifyToken()`
- Sets `req.accountId` and `req.account`
- Throws `UnauthorizedError` (401) if missing or invalid

### `optionalAuthMiddleware`
Same as above but does not fail if no token is present. Used when auth is optional.

### `requirePermission(moduleName, permissionCode)`
```typescript
export function requirePermission(moduleName: string, permissionCode: string)
```
- Factory that returns an async middleware
- Calls `roleRepository.hasPermission(req.accountId, moduleName, permissionCode)`
- Throws `ForbiddenError` (403) if the account does not have the permission
- Must be used **after** `authMiddleware`

**Usage example:**
```typescript
router.get('/', requirePermission('User Management', 'VIEW'), controller.listAccounts)
```

---

## RBAC Model

```
account → account_role → role → role_permission → permission
```

### `permission` table
| Column | Example |
|---|---|
| `module_name` | `User Management` |
| `permission_code` | `VIEW`, `CREATE`, `UPDATE`, `DELETE` |
| `permission_name` | `View Users` |

### `role` table
- `role_code` — short identifier (e.g. `SUPERUSER`, `ADMIN`)
- `role_name` — display name

### Assignment
- Roles are assigned to accounts via `account_role`.
- Permissions are assigned to roles via `role_permission`.
- An account inherits all permissions from all its assigned roles.

### Known Module Names
Permission checks use these exact `module_name` strings:

| Module Name | Used By |
|---|---|
| `User Management` | Account CRUD and role management routes |

> When adding new modules, the `module_name` in `requirePermission()` must match exactly what is seeded in the `permission` table.

---

## Frontend Auth Context (`src/shared/contexts/auth.tsx`)

```typescript
interface AuthContextType {
  account: any | null
  token: string | null
  isLoggedIn: boolean
  isLoading: boolean
  login(userName, password): Promise<void>
  logout(): void
  setPassword(password, currentPassword?): Promise<void>
}
```

- `AuthProvider` wraps the entire app
- Token is stored in `localStorage`
- `useAuth()` hook provides access anywhere in the component tree
- Auto-logout occurs when token is expired (detected on next API call)

---

## Test Accounts

Seeded by `database/seeds/050_account_seed.sql`.

| Username | Password | Role |
|---|---|---|
| `superuser` | `superuser123` | Full access |
| `auditor` | *(set via `npm run setup-test-accounts`)* | Limited access |

> Passwords are stored as bcrypt hashes. Run `npm run setup-test-accounts` in `mms-backend/` to set the plaintext passwords if starting from a fresh database.

---

## Error Classes (`src/utils/errors.ts`)

| Class | HTTP Status | Use Case |
|---|---|---|
| `AppError` | 500 | Base error class |
| `ValidationError` | 400 | Invalid request payload |
| `UnauthorizedError` | 401 | Missing / invalid / expired token |
| `ForbiddenError` | 403 | Authenticated but lacks permission |
| `NotFoundError` | 404 | Resource does not exist |
| `ConflictError` | 409 | Duplicate username, email conflict, etc. |

All errors are caught by `errorHandler` middleware in `src/middleware/errorHandler.ts` and returned as:
```json
{ "error": "<message>", "code": "<ERROR_CODE>" }
```
