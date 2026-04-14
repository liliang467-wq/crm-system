# CRM System TODO

## Phase 1: Database & Schema
- [x] Design and migrate: users table (with role: employee/manager/sysadmin)
- [x] Design and migrate: organizations table (multi-level hierarchy)
- [x] Design and migrate: source_channels table
- [x] Design and migrate: customers table (all fields per PRD)

## Phase 2: Backend API (tRPC Routers)
- [x] Auth: login, logout, me
- [x] Customers: create, update, delete, list (with filters, pagination)
- [x] Performance: stats panel + daily summary list
- [x] Leaderboard: individual (day/week/month) with obfuscation
- [x] Team customers: list with filters, export
- [x] Team performance: stats panel + daily summary list
- [x] Team leaderboard: day/week/month with obfuscation
- [x] System: user account management (create/edit/delete)
- [x] System: role configuration
- [x] System: organization management (CRUD)
- [x] System: source channel management (CRUD)

## Phase 3: Frontend - Layout & Auth
- [x] Global CSS theme (blue primary, clean admin style)
- [x] DashboardLayout with sidebar navigation (role-based menu)
- [x] Login page (internal account login)
- [x] Logout functionality
- [x] Role-based route protection

## Phase 4: Frontend - Employee Workspace
- [x] My Customers page (list, filters, pagination, add/edit/delete modal)
- [x] Customer form modal (two-section: required + optional fields)
- [x] Delete confirmation dialog
- [x] My Performance page (stats panel + daily detail list)

## Phase 5: Frontend - Leaderboard & Team Workspace
- [x] My Ranking page (day/week/month tabs, obfuscated data, floating own-row)
- [x] Team Customers page (extended filters, employee/team columns, export)
- [x] Team Performance page (extended stats + team daily list)
- [x] Team Ranking page (team leaderboard with floating own-team row)

## Phase 6: Frontend - System Management
- [x] User Account management page (create/edit/delete)
- [x] Organization management page (multi-level hierarchy CRUD)
- [x] Source Channel management page (CRUD)

## Phase 7: Polish & Testing
- [x] Implement data obfuscation utility (floor-truncate + "+")
- [x] Implement name desensitization utility
- [x] Implement status auto-determination logic
- [x] Server-side timestamp enforcement
- [x] All statistical formula implementations
- [x] Vitest unit tests for core business logic (23 tests passing)
- [x] Final UI polish and responsive checks
