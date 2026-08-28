// SPDX-License-Identifier: MIT

/**
 * Server-only Supabase client.
 *
 * Uses the service role key, which bypasses Row Level Security, so this
 * module must never be imported from client components or shipped to the
 * browser.
 *
 * The guard below makes an accidental client import fail loudly at runtime.
 * For a hard build-time error, also add the `server-only` package and
 * `import "server-only";` at the top of this file.
 *
 * @see docs/SUPABASE-SETUP.md
 */
if (typeof window !== "undefined") {
  throw new Error(
    "lib/supabase/server can only be imported from server-side code. " +
      "Use lib/supabase/browser in client components."
  );
}

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseServer = createClient(supabaseUrl, serviceRoleKey);
