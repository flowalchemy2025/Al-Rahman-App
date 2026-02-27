# Backend Architecture (BFF Layer)

This backend is a `Backend-for-Frontend (BFF)` for the mobile app:

1. App calls backend REST API.
2. Backend handles auth, authorization, and business rules.
3. Backend talks to Supabase and other services using secure server credentials.

## Why this is better

- Keeps `SUPABASE_SERVICE_ROLE_KEY` out of the mobile app.
- Centralizes access rules (role and branch checks).
- Allows adding logging, rate limiting, audit, and validations in one place.
- Makes frontend simpler and safer.

## Security Controls Included

- Endpoint-level request validation (body/query/params).
- Global API rate limiting + stricter auth/login rate limiting.
- Audit logging for sensitive/destructive actions (user create/update/delete, purchase update/delete, vendor payment transaction create).

## Folder Structure

```txt
backend/
  src/
    config/        # env and Supabase clients
    middleware/    # auth, role checks, errors
    routes/        # API route definitions
    controllers/   # HTTP handlers (thin)
    services/      # business logic + data access
    utils/         # helpers (ApiError, asyncHandler)
    app.js         # express app wiring
    server.js      # bootstrap
```

## API Endpoints

- `GET /api/v1/health`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `GET /api/v1/users`
- `POST /api/v1/users`
- `PATCH /api/v1/users/:id`
- `DELETE /api/v1/users/:id`
- `GET /api/v1/purchases`
- `POST /api/v1/purchases`
- `PATCH /api/v1/purchases/:id`
- `DELETE /api/v1/purchases/:id`
- `GET /api/v1/payments`
- `POST /api/v1/payments/vendor-transactions`
- `GET /api/v1/ledger/vendor/:vendorId?branchName=<branch>`

## Run

1. `cd backend`
2. `cp .env.example .env` (or create `.env` manually on Windows)
3. Fill env values.
4. `npm install`
5. `npm run dev`

## Frontend Integration

Use `src/services/apiClient.js` from the app to call backend endpoints.

Replace direct imports from `src/services/supabase.js` step by step:

- login -> `backendAuth.login`
- users -> `backendUsers.*`
- purchases -> `backendPurchases.*`
- payments -> `backendPayments.*`
- ledger -> `backendLedger.getVendorLedger`

## Audit Table (Recommended)

Create an `audit_logs` table in Supabase with columns such as:

- `id` (bigint, primary key)
- `action` (text)
- `actor_user_id` (bigint)
- `actor_role` (text)
- `actor_auth_user_id` (uuid/text)
- `target_type` (text)
- `target_id` (bigint/text)
- `metadata` (jsonb)
- `ip_address` (text)
- `user_agent` (text)
- `created_at` (timestamptz)
