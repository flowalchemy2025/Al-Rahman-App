# Migration Plan: Frontend -> Backend API

## Phase 1: Setup

1. Run backend from `backend/`.
2. Set `API_BASE_URL` in `src/services/apiClient.js`.
3. Keep existing `supabase.js` for fallback during migration.

## Phase 2: Auth and User Management

1. Replace `LoginScreen` calls:
   - from `signIn(...)`
   - to `backendAuth.login(...)`.
2. Replace user management screen calls with `backendUsers`.

## Phase 3: Purchases and Ledger

1. Replace:
   - `getPurchaseEntries`, `addPurchaseEntry`, `updatePurchaseEntry`, `deletePurchaseEntry`
   - with `backendPurchases`.
2. Replace `getLedgerData` with `backendLedger.getVendorLedger`.

## Phase 4: Payments

1. Replace payment list and create calls with `backendPayments`.

## Phase 5: Hardening

1. Remove `src/services/adminSupabase.js` from app runtime.
2. Remove client-side service-role usage.
3. Add endpoint-level validation and rate limits.
4. Add audit logging for destructive actions.
