import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { getPublicEnv } from "@/lib/env";

const AUTH_PATH_PREFIXES = ["/auth/login", "/auth/forgot-password", "/auth/reset-password", "/auth/confirm"];

function isAllowedWithoutAdmin(pathname: string) {
  return AUTH_PATH_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isApiRoute(pathname: string) {
  return pathname.startsWith("/api/");
}

export async function middleware(request: NextRequest) {
  const env = getPublicEnv();

  if (!env.success) {
    return NextResponse.next({ request });
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
    if (pathname === "/auth/signup" || pathname.startsWith("/auth/signup/")) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/auth/login";
      loginUrl.searchParams.set("reason", "admin_only");
      return NextResponse.redirect(loginUrl);
    }

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

  const isAuthPath = isAllowedWithoutAdmin(pathname) || pathname === "/auth/signup" || pathname.startsWith("/auth/signup/");

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

  if (isAuthPath) {
    return response;
  }

  if (isApiRoute(pathname)) {
    return NextResponse.json({ error: "Admin account required." }, { status: 403 });
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/auth/login";
  loginUrl.searchParams.set("reason", "admin_required");
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"]
};
