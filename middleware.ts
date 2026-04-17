import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { getPublicEnv } from "@/lib/env";

const AUTH_PATH_PREFIXES = ["/auth/login", "/auth/signup", "/auth/forgot-password", "/auth/reset-password", "/auth/confirm"];
const NON_ADMIN_ALLOWED_PATHS = ["/under-development"];

function isAllowedWithoutAdmin(pathname: string) {
  return AUTH_PATH_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isAllowedForNonAdmin(pathname: string) {
  return NON_ADMIN_ALLOWED_PATHS.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isApiRoute(pathname: string) {
  return pathname.startsWith("/api/");
}

export async function middleware(request: NextRequest) {
  const env = getPublicEnv();

  if (!env.success) {
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "App configuration incomplete." }, { status: 503 });
    }

    const unavailableUrl = request.nextUrl.clone();
    unavailableUrl.pathname = "/under-development";
    unavailableUrl.search = "";
    return NextResponse.rewrite(unavailableUrl);
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    env.data.NEXT_PUBLIC_SUPABASE_URL,
    env.data.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        }
      }
    }
  );

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user) {
    if (isAllowedWithoutAdmin(pathname)) {
      return response;
    }

    if (isApiRoute(pathname)) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/auth/login";
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const isAuthPath = isAllowedWithoutAdmin(pathname);

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.is_admin) {
    if (isAuthPath) {
      const destination = request.nextUrl.clone();
      destination.pathname = request.nextUrl.searchParams.get("redirectTo") || "/";
      destination.search = "";
      return NextResponse.redirect(destination);
    }

    return response;
  }

  if (isAuthPath || isAllowedForNonAdmin(pathname)) {
    return response;
  }

  if (isApiRoute(pathname)) {
    return NextResponse.json({ error: "Admin account required." }, { status: 403 });
  }

  const infoUrl = request.nextUrl.clone();
  infoUrl.pathname = "/under-development";
  infoUrl.search = "";
  return NextResponse.redirect(infoUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"]
};
