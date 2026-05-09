# AjoCircle Full MVP — Implementation Plan

## Goal
Production-ready MVP across all three platforms (backend, mobile, admin) with full feature completion and security hardening.

---

## Current State

| Area | Completeness | Notes |
|------|-------------|-------|
| Backend | ~80% | Auth, groups, contributions, basic payouts, ledger, admin routes |
| Mobile | ~65% | Auth, group create/join, contribute trigger; missing history, wallet, bank setup, KYC |
| Admin | ~70% | Read-only tables, approve payout; missing route guards, user actions, KYC workflow |
| Database | Solid | 8 core tables in place |

---

## Phase 1 — Security Hardening

### 1.1 Backend
- [x] Enforce strong `JWT_SECRET` at startup (throw if value is default/missing in production)
- [x] Add `express-rate-limit` (5 req / 15 min) on `POST /api/auth/login` and `/register`
- [x] Add structured request logging middleware (console-based, no extra pkg dependency)
- [x] Add AES-256-GCM encrypt/decrypt helpers in `utils/security.ts` for sensitive fields
- [x] Email/phone normalization (`toLowerCase`, `trim`) before DB writes
- [x] Add IP + user-agent to all audit log metadata
- [x] Add minimum contribution amount validation (≥ 100 kobo)
- [x] Prevent contributions to inactive/deleted groups
- [x] Validate `startDate` is in the future on group creation
- [x] Add server-side env schema validation (throw on startup if required vars missing)

### 1.2 Admin Dashboard
- [x] Add `middleware.ts` in Next.js app router — redirect to `/login` if no valid token
- [x] Switch admin token from `localStorage` to `httpOnly` cookie
- [x] Add error state UI to all pages

---

## Phase 2 — Backend Feature Completion

### 2.1 KYC System
- [x] Add `kyc_submissions` table (encrypted BVN/NIN, status, reviewed_by, rejection_reason)
- [x] `POST /api/users/kyc` — submit KYC
- [x] `GET /api/users/kyc` — own KYC status
- [x] `POST /api/admin/kyc/:id/approve`
- [x] `POST /api/admin/kyc/:id/reject` (with reason)
- [x] Audit log all KYC status changes

### 2.2 Bank Account Management
- [x] Add `bank_accounts` table (encrypted account_number, paystack_recipient_code, is_primary)
- [x] `POST /api/users/bank-account` — resolve + create Paystack recipient
- [x] `GET /api/users/bank-account`
- [x] `DELETE /api/users/bank-account/:id`

### 2.3 Payout Lifecycle Completion
- [x] Add `transfer_code` column to `payouts`
- [x] Handle `transfer.success` webhook → payout `PAID` + `PAYOUT_COMPLETED` ledger entry
- [x] Handle `transfer.failed` webhook → payout `FAILED` + ledger reversal
- [x] `GET /api/payouts/mine` — user's own payout history
- [x] `GET /api/contributions/mine` — cursor-based pagination

### 2.4 Platform Fee Collection
- [x] On `charge.success` webhook: calculate fee from `PLATFORM_FEE_BPS`, create `PLATFORM_FEE` ledger entry, net credit to group wallet

### 2.5 Group Analytics
- [x] `GET /api/groups/:id/analytics`
- [x] Cursor-based pagination (page 50) on admin transactions list + indexes

### 2.6 Notifications
- [x] Add `notifications` table
- [x] `GET /api/notifications`, mark-as-read, create-notification (internal)
- [x] Connected to: contribution receipt, payout approval, KYC status events

---

## Phase 3 — Mobile App Completion

### 3.1 Session & Auth
- [x] Restore session on app start (AsyncStorage token → validate `/api/auth/me`)
- [x] Environment-based `API_URL`
- [x] Trim all auth inputs; inline validation errors
- [x] Nigerian phone format validation
- [x] Null-guard on `Linking.openURL`

### 3.2 New Screens
- [x] `WalletScreen` — balance + recent ledger, pull-to-refresh
- [x] `ContributionHistoryScreen` — per-group, paginated
- [x] `PayoutHistoryScreen` — status badges
- [x] `BankAccountScreen` — list, add, set primary
- [x] `KYCScreen` — BVN/NIN form + status display
- [x] `NotificationsScreen` — list, mark as read
- [x] `GroupDetailScreen` — analytics, member list, payout schedule
- [x] `UserProfileScreen` — full profile with bank + KYC status

### 3.3 Navigation
- [x] Bottom tab navigator: Home | Groups | Wallet | Notifications | Profile
- [x] Stack navigators per tab

---

## Phase 4 — Admin Dashboard Completion

### 4.1 Security
- [x] `middleware.ts` JWT guard on all non-`/login` routes
- [x] `httpOnly` cookie for admin token

### 4.2 User Management
- [x] User detail panel: full info, KYC status, freeze/unfreeze, role change
- [x] KYC queue page: PENDING submissions, approve/reject

### 4.3 Group Management
- [x] Group detail: members, contributions, freeze/close actions

### 4.4 Table Improvements
- [x] Client-side search bar on Users, Groups, Transactions
- [x] Pagination component (prev/next, 50 per page)
- [x] Error state UI when API fails

### 4.5 Analytics Dashboard
- [x] `total_volume`, `platform_fees_collected`, `active_groups`, `pending_kyc_count` stat cards
- [x] KYC queue count in dashboard

---

## Phase 5 — Database Migrations

All migrations appended to `database/schema.sql`:
- [x] `ALTER TABLE payouts ADD COLUMN IF NOT EXISTS transfer_code TEXT`
- [x] `CREATE TABLE IF NOT EXISTS kyc_submissions`
- [x] `CREATE TABLE IF NOT EXISTS bank_accounts`
- [x] `CREATE TABLE IF NOT EXISTS notifications`
- [x] Performance indexes on `contributions(user_id)`, `payouts(user_id)`, `payouts(recipient_user_id)`, `ledger_entries(wallet_id)`

---

## New Dependencies Required

### Backend
```bash
cd backend && npm install winston
```

### Admin
```bash
cd apps/admin && npm install recharts
```

### Mobile
```bash
cd apps/mobile && npm install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/stack react-native-screens react-native-safe-area-context @expo/vector-icons
```

---

## Verification Steps
1. Register → contribute → confirm `CONTRIBUTION_CREDIT` + `PLATFORM_FEE` ledger entries
2. Simulate `charge.success` webhook → wallet credited, fee deducted
3. Admin approve payout → simulate `transfer.success` → payout `PAID` + `PAYOUT_COMPLETED` ledger
4. Simulate `transfer.failed` → payout `FAILED` + ledger reversal
5. Submit KYC → admin approve → user status `VERIFIED` + notification created
6. Add bank account → Paystack recipient code stored
7. All admin pages without token → redirect to `/login`
8. 6 rapid login attempts → rate limited on 6th
9. Admin freeze user → user cannot log in (401)
10. Check `audit_logs` after each sensitive action — IP + user-agent in metadata
