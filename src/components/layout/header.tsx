"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, LogIn, Moon, Search, Sparkles, Sun, Tv2, User2 } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/features/auth/sign-out-button";
import { useWatchlist } from "@/features/watchlist/watchlist-provider";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Entdecken", icon: Tv2 },
  { href: "/search", label: "Suche", icon: Search },
  { href: "/discover", label: "Kategorien", icon: Search },
  { href: "/ai", label: "KI", icon: Sparkles },
  { href: "/watchlist", label: "Watchlist", icon: Heart }
];

export function Header() {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const { items, user } = useWatchlist();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/85 backdrop-blur-xl">
      <div className="page-content">
        <div className="content-container flex h-16 items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Tv2 className="size-4" />
            </div>
            <div className="text-lg font-bold tracking-tight">
              Cine<span className="text-primary">Scope</span>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {NAV_ITEMS.map(item => {
              const active = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                  {item.href === "/watchlist" && items.length ? (
                    <span className="inline-flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                      {items.length > 9 ? "9+" : items.length}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              aria-label="Theme wechseln"
            >
              {!mounted ? (
                <span className="size-4" aria-hidden="true" />
              ) : resolvedTheme === "dark" ? (
                <Sun className="size-4" />
              ) : (
                <Moon className="size-4" />
              )}
            </Button>
            {user ? (
              <>
                <Link
                  href="/watchlist"
                  className="inline-flex items-center gap-2 rounded-xl border border-border/50 px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <User2 className="size-4" />
                  <span className="hidden sm:inline">{user.email ?? "Account"}</span>
                </Link>
                <div className="hidden sm:block">
                  <SignOutButton />
                </div>
              </>
            ) : (
              <Button asChild variant="outline">
                <Link href="/auth/login">
                  <LogIn className="size-4" />
                  Login
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

