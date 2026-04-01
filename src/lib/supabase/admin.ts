import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getServerEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

export function createSupabaseAdminClient() {
  const env = getServerEnv();

  if (!env.success || !env.data.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY fehlt.");
  }

  return createClient<Database>(
    env.data.NEXT_PUBLIC_SUPABASE_URL,
    env.data.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  );
}
