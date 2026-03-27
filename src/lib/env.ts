import { z } from "zod";

const optionalNonEmptyString = z.preprocess(value => {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }

  return value;
}, z.string().min(1).optional());

const optionalUrl = z.preprocess(value => {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }

  return value;
}, z.string().url().optional());

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1)
});

const serverBaseEnvSchema = publicEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: optionalNonEmptyString,
  TMDB_API_KEY: optionalNonEmptyString,
  TMDB_ACCESS_TOKEN: optionalNonEmptyString,
  OPENROUTER_API_KEY: optionalNonEmptyString,
  NEXT_PUBLIC_APP_URL: optionalUrl,
  OPENROUTER_MODEL: optionalNonEmptyString
});

const tmdbEnvSchema = serverBaseEnvSchema.refine(
  data => !!data.TMDB_API_KEY || !!data.TMDB_ACCESS_TOKEN,
  {
    message: "TMDB_API_KEY oder TMDB_ACCESS_TOKEN ist erforderlich."
  }
);

const openRouterEnvSchema = serverBaseEnvSchema.refine(
  data => !!data.OPENROUTER_API_KEY,
  {
    message: "OPENROUTER_API_KEY ist erforderlich."
  }
);

export function getPublicEnv() {
  return publicEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  });
}

function getRawServerEnv() {
  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    TMDB_API_KEY: process.env.TMDB_API_KEY,
    TMDB_ACCESS_TOKEN: process.env.TMDB_ACCESS_TOKEN,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    OPENROUTER_MODEL: process.env.OPENROUTER_MODEL
  };
}

export function getServerEnv() {
  return serverBaseEnvSchema.safeParse(getRawServerEnv());
}

export function getTmdbEnv() {
  return tmdbEnvSchema.safeParse(getRawServerEnv());
}

export function getOpenRouterEnv() {
  return openRouterEnvSchema.safeParse(getRawServerEnv());
}

export function isTmdbConfigured() {
  return !!process.env.TMDB_API_KEY || !!process.env.TMDB_ACCESS_TOKEN;
}

export function isOpenRouterConfigured() {
  return !!process.env.OPENROUTER_API_KEY;
}
