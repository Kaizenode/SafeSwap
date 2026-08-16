import "server-only";

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error(
    "Supabase admin client is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local."
  );
}

/**
 * Server-only Supabase admin client.
 *
 * Uses the service role key, which bypasses Row Level Security. It must never
 * be bundled into a client component. The `server-only` import above makes the
 * build fail if a client bundle tries to include this module.
 */
export const supabaseAdmin = createClient(url, serviceRoleKey, {
  auth: {
    // The admin client is used for service-side operations only — no user
    // session is persisted.
    autoRefreshToken: false,
    persistSession: false,
  },
});
