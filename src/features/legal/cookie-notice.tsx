"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useLanguage } from "@/features/i18n/language-provider";

const COOKIE_NOTICE_ACK = "cinescope_cookie_notice_ack";
const COOKIE_NOTICE_MAX_AGE = 60 * 60 * 24 * 180;

function hasAcknowledgedNotice() {
  if (typeof document === "undefined") {
    return false;
  }

  return document.cookie
    .split(";")
    .map(entry => entry.trim())
    .some(entry => entry.startsWith(`${COOKIE_NOTICE_ACK}=`));
}

function acknowledgeNotice() {
  document.cookie = `${COOKIE_NOTICE_ACK}=1; Max-Age=${COOKIE_NOTICE_MAX_AGE}; Path=/; SameSite=Lax`;
}

export function CookieNotice() {
  const { dictionary } = useLanguage();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!hasAcknowledgedNotice());
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed inset-x-4 bottom-4 z-[110] sm:inset-x-6 lg:left-8 lg:right-8">
      <div className="mx-auto max-w-4xl rounded-[1.75rem] border border-border/60 bg-background/95 p-4 shadow-2xl shadow-black/35 backdrop-blur-xl sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">
              {dictionary.cookieNotice.title}
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              {dictionary.cookieNotice.description}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row lg:shrink-0">
            <Button
              variant="outline"
              asChild
              className="w-full sm:w-auto"
            >
              <Link href="/datenschutz">{dictionary.cookieNotice.learnMore}</Link>
            </Button>
            <Button
              className="w-full sm:w-auto"
              onClick={() => {
                acknowledgeNotice();
                setVisible(false);
              }}
            >
              {dictionary.cookieNotice.accept}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
