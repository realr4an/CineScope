"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, LogIn, Moon, Search, Sparkles, Sun, Tv2, User2 } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/features/auth/sign-out-button";
import { useLanguage } from "@/features/i18n/language-provider";
import { useWatchlist } from "@/features/watchlist/watchlist-provider";
import { cn } from "@/lib/utils";

export function Header() {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const { locale, setLocale, dictionary } = useLanguage();
  const { items, user } = useWatchlist();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const navItems = [
    { href: "/", label: dictionary.nav.discover, icon: Tv2 },
    { href: "/search", label: dictionary.nav.search, icon: Search },
    { href: "/discover", label: dictionary.nav.categories, icon: Search },
    { href: "/ai", label: dictionary.nav.ai, icon: Sparkles },
    { href: "/watchlist", label: dictionary.nav.watchlist, icon: Heart }
  ];

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
            {navItems.map(item => {
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
            <div className="flex items-center rounded-xl border border-border/50 bg-card/60 p-1">
              <button
                type="button"
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors",
                  locale === "de"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setLocale("de")}
                aria-label={dictionary.common.german}
              >
                DE
              </button>
              <button
                type="button"
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors",
                  locale === "en"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setLocale("en")}
                aria-label={dictionary.common.english}
              >
                EN
              </button>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              aria-label={dictionary.common.themeSwitch}
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
                  <span className="hidden sm:inline">{user.email ?? dictionary.common.account}</span>
                </Link>
                <div className="hidden sm:block">
                  <SignOutButton />
                </div>
              </>
            ) : (
              <Button asChild variant="outline">
                <Link href="/auth/login">
                  <LogIn className="size-4" />
                  {dictionary.common.login}
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

