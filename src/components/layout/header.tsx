"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Heart,
  ListFilter,
  LogIn,
  Menu,
  Moon,
  RefreshCw,
  Search,
  Sparkles,
  Sun,
  Tv2,
  User2,
  X
} from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/features/auth/sign-out-button";
import { useLanguage } from "@/features/i18n/language-provider";
import { useWatchlist } from "@/features/watchlist/watchlist-provider";
import { cn } from "@/lib/utils";

export function Header() {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const { locale, setLocale, dictionary, isSwitchingLocale, switchingToLocale } = useLanguage();
  const { user } = useWatchlist();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const navItems = [
    { href: "/", label: dictionary.nav.discover, icon: Tv2 },
    { href: "/search", label: dictionary.nav.search, icon: Search },
    { href: "/discover", label: dictionary.nav.categories, icon: ListFilter },
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
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-xl border border-border/50 bg-card/60 p-1">
              <button
                type="button"
                className={cn(
                  "inline-flex min-w-[3rem] items-center justify-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors disabled:pointer-events-none disabled:opacity-80",
                  locale === "de"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setLocale("de")}
                aria-label={dictionary.common.german}
                disabled={isSwitchingLocale}
              >
                {isSwitchingLocale && (switchingToLocale ?? locale) === "de" ? (
                  <RefreshCw className="size-3.5 animate-spin" />
                ) : null}
                DE
              </button>
              <button
                type="button"
                className={cn(
                  "inline-flex min-w-[3rem] items-center justify-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors disabled:pointer-events-none disabled:opacity-80",
                  locale === "en"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setLocale("en")}
                aria-label={dictionary.common.english}
                disabled={isSwitchingLocale}
              >
                {isSwitchingLocale && (switchingToLocale ?? locale) === "en" ? (
                  <RefreshCw className="size-3.5 animate-spin" />
                ) : null}
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
                  href="/account"
                  className="hidden items-center gap-2 rounded-xl border border-border/50 px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground lg:inline-flex"
                >
                  <User2 className="size-4" />
                  <span className="hidden sm:inline">{user.email ?? dictionary.common.account}</span>
                </Link>
                <div className="hidden lg:block">
                  <SignOutButton />
                </div>
              </>
            ) : (
              <Button asChild variant="outline" className="hidden lg:inline-flex">
                <Link href="/auth/login">
                  <LogIn className="size-4" />
                  {dictionary.common.login}
                </Link>
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              className="lg:hidden"
              aria-label={mobileMenuOpen ? "Menü schließen" : "Menü öffnen"}
              onClick={() => setMobileMenuOpen(current => !current)}
            >
              <AnimatePresence mode="wait" initial={false}>
                {mobileMenuOpen ? (
                  <motion.span
                    key="close"
                    initial={{ rotate: -120, opacity: 0, scale: 0.8 }}
                    animate={{ rotate: 0, opacity: 1, scale: 1 }}
                    exit={{ rotate: 120, opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <X className="size-4" />
                  </motion.span>
                ) : (
                  <motion.span
                    key="open"
                    initial={{ rotate: -120, opacity: 0, scale: 0.8 }}
                    animate={{ rotate: 0, opacity: 1, scale: 1 }}
                    exit={{ rotate: 120, opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Menu className="size-4" />
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {mobileMenuOpen ? (
          <div className="lg:hidden">
            <motion.button
              type="button"
              aria-label="Menü schließen"
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px]"
              onClick={() => setMobileMenuOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
            <motion.aside
              className="fixed right-0 top-16 z-50 h-[calc(100dvh-4rem)] w-[min(88vw,22rem)] overflow-y-auto border-l border-border/50 bg-background p-4 shadow-2xl"
              initial={{ x: "100%", opacity: 0.98 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0.98 }}
              transition={{ type: "spring", stiffness: 360, damping: 34, mass: 0.9 }}
            >
              <motion.nav
                className="space-y-2"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: {},
                  visible: {
                    transition: {
                      staggerChildren: 0.04,
                      delayChildren: 0.05
                    }
                  }
                }}
              >
                {navItems.map(item => {
                  const active = pathname === item.href;
                  const Icon = item.icon;

                  return (
                    <motion.div
                      key={item.href}
                      variants={{
                        hidden: { x: 18, opacity: 0 },
                        visible: { x: 0, opacity: 1 }
                      }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                    >
                      <Link
                        href={item.href}
                        className={cn(
                          "inline-flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                          active
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        )}
                      >
                        <Icon className="size-4" />
                        {item.label}
                      </Link>
                    </motion.div>
                  );
                })}
              </motion.nav>

              <motion.div
                className="mt-4 border-t border-border/50 pt-4"
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 12, opacity: 0 }}
                transition={{ duration: 0.2, delay: 0.08 }}
              >
                {user ? (
                  <div className="space-y-2">
                    <Link
                      href="/account"
                      className="inline-flex w-full items-center gap-3 rounded-xl border border-border/50 px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <User2 className="size-4" />
                      <span className="truncate">{user.email ?? dictionary.common.account}</span>
                    </Link>
                    <div className="inline-flex w-full">
                      <SignOutButton />
                    </div>
                  </div>
                ) : (
                  <Button asChild variant="outline" className="w-full justify-start">
                    <Link href="/auth/login">
                      <LogIn className="size-4" />
                      {dictionary.common.login}
                    </Link>
                  </Button>
                )}
              </motion.div>
            </motion.aside>
          </div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
