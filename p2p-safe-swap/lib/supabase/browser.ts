import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-safe Supabase client.
 *
 * Uses the public anon key, which is safe to ship to the client. Enforce RLS
 * on every table so the anon key can only read/write what the policies allow.
 *
 * Never reference `SUPABASE_SERVICE_ROLE_KEY` here — that key must stay on the
 * server (see `lib/supabase/server.ts`).
 */
export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local."
    );
  }

  return createBrowserClient(url, anonKey);
}
