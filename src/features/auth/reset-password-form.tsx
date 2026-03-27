"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/features/i18n/language-provider";
import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

function getHashParams() {
  if (typeof window === "undefined") {
    return new URLSearchParams();
  }

  return new URLSearchParams(window.location.hash.replace(/^#/, ""));
}

export function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [ready, setReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();
  const { dictionary } = useLanguage();

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setErrorMessage(dictionary.auth.supabaseNotConfigured);
      setVerifying(false);
      return;
    }

    const supabase = createSupabaseBrowserClient();
    let active = true;

    async function initializeRecovery() {
      const hashParams = getHashParams();
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const recoveryType = hashParams.get("type");
      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get("code");

      try {
        if (accessToken && refreshToken && recoveryType === "recovery") {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (error) {
            throw error;
          }

          window.history.replaceState({}, document.title, "/auth/reset-password");
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            throw error;
          }

          window.history.replaceState({}, document.title, "/auth/reset-password");
        }

        const {
          data: { session }
        } = await supabase.auth.getSession();

        if (!active) {
          return;
        }

        if (!session) {
          setErrorMessage(dictionary.auth.invalidResetLink);
          setReady(false);
          setVerifying(false);
          return;
        }

        setReady(true);
        setVerifying(false);
      } catch (error) {
        if (!active) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : dictionary.auth.verifyResetError
        );
        setReady(false);
        setVerifying(false);
      }
    }

    void initializeRecovery();

    return () => {
      active = false;
    };
  }, [dictionary.auth.invalidResetLink, dictionary.auth.supabaseNotConfigured, dictionary.auth.verifyResetError]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!ready) {
      return;
    }

    if (password.length < 8) {
      toast.error(dictionary.auth.passwordTooShort);
      return;
    }

    if (password !== confirmPassword) {
      toast.error(dictionary.auth.passwordsNoMatch);
      return;
    }

    setLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        throw error;
      }

      toast.success(dictionary.auth.passwordUpdated);
      router.push("/auth/login");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : dictionary.auth.updatePasswordError);
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return <p className="text-sm text-muted-foreground">{dictionary.auth.resetLinkChecking}</p>;
  }

  if (errorMessage) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-destructive">{errorMessage}</p>
        <p className="text-sm text-muted-foreground">
          {dictionary.auth.requestNewLinkStart}{" "}
          <Link href="/auth/forgot-password" className="text-primary">
            {dictionary.auth.forgotPassword}
          </Link>{" "}
          {dictionary.auth.requestNewLinkEnd}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">{dictionary.auth.newPassword}</label>
        <Input
          type="password"
          value={password}
          onChange={event => setPassword(event.target.value)}
          placeholder={dictionary.auth.minEight}
          minLength={8}
          required
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">{dictionary.auth.confirmPassword}</label>
        <Input
          type="password"
          value={confirmPassword}
          onChange={event => setConfirmPassword(event.target.value)}
          placeholder={dictionary.auth.confirmPasswordPlaceholder}
          minLength={8}
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {dictionary.auth.saveNewPassword}
      </Button>
    </form>
  );
}
