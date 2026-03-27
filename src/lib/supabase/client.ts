"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getPublicEnv } from "@/lib/env";

export function isSupabaseConfigured() {
  return getPublicEnv().success;
}

export function createSupabaseBrowserClient() {
  const env = getPublicEnv();

  if (!env.success) {
    throw new Error("Supabase env vars fehlen.");
  }

  return createBrowserClient(
    env.data.NEXT_PUBLIC_SUPABASE_URL,
    env.data.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
