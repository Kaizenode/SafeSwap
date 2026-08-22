# Supabase Infrastructure & Local CLI Setup

This document details the configuration for the SafeSwap Supabase environments (`safeswap-dev` and `safeswap-prod`) and local CLI workflow.

---

## 1. Supabase Projects & Environments

SafeSwap relies on two remote Supabase projects:

| Environment | Project Identifier | Description | Access & Credentials |
|-------------|-------------------|-------------|----------------------|
| **Development** | `safeswap-dev` | Staging / active dev database instance | 1Password (Vault: `SafeSwap Engineering`) |
| **Production** | `safeswap-prod` | Production database instance | 1Password (Vault: `SafeSwap Engineering`) |

### Stored Credentials in 1Password
Each vault item contains:
- `Project URL` (`NEXT_PUBLIC_SUPABASE_URL`)
- `anon` API Key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- `service_role` Secret Key (`SUPABASE_SERVICE_ROLE_KEY`)
- Database Connection String (Direct & Pooled)

---

## 2. Environment Plumbing (`.env.local`)

Copy `.env.example` to `.env.local` inside `p2p-safe-swap/`:

```bash
cp p2p-safe-swap/.env.example p2p-safe-swap/.env.local
```

Fill in the environment variables from 1Password:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
```

---

## 3. Client Wrappers Usage

SafeSwap provides two isolated Supabase client modules under `p2p-safe-swap/lib/supabase/`:

- **Browser Client (`@/lib/supabase/browser`)**: Uses the anonymous key. Safe for Client Components (`"use client"`).
  ```ts
  import { createClient } from '@/lib/supabase/browser'
  const supabase = createClient()
  ```
- **Server Client (`@/lib/supabase/server`)**: Uses the Service Role key. Server-only execution. Guarded with `import 'server-only'` to prevent accidental inclusion in client bundles.
  ```ts
  import { createClient } from '@/lib/supabase/server'
  const supabase = createClient()
  ```

---

## 4. Local CLI Setup & Workflow

### Prerequisites
- Install the Supabase CLI:
  ```bash
  # macOS / Linux
  brew install supabase/tap/supabase

  # Windows (Scoop or npm)
  npm i -g supabase
  ```

### Initial CLI Setup
1. **Initialize CLI configuration** (already configured via `supabase/config.toml`):
   ```bash
   supabase init
   ```
2. **Authenticate with Supabase**:
   ```bash
   supabase login
   ```
3. **Link to Remote Project** (e.g. `safeswap-dev`):
   ```bash
   supabase link --project-ref <dev-project-ref>
   ```

### Local Database Lifecycle
- **Start Local Supabase Stack**:
  ```bash
  supabase start
  ```
- **Stop Local Supabase Stack**:
  ```bash
  supabase stop
  ```
- **Run Migrations & Reset Seed Data**:
  ```bash
  supabase db reset
  ```
- **Apply New Migrations to Remote Dev**:
  ```bash
  supabase db push
  ```
