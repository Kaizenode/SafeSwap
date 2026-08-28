// SPDX-License-Identifier: MIT

/**
 * Browser-safe Supabase client.
 *
 * Uses only the public anon key, so it is safe to import from client
 * components and never contains secrets. Server-side code that needs to
 * bypass Row Level Security must import `@/lib/supabase/server` instead —
 * the service role key must never be shipped to the browser.
 *
 * @see docs/SUPABASE-SETUP.md
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
