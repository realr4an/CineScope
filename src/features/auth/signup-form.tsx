"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/features/i18n/language-provider";
import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

export function SignupForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { dictionary } = useLanguage();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!isSupabaseConfigured()) {
      toast.error(dictionary.auth.supabaseNotConfigured);
      return;
    }

    setLoading(true);

    const supabase = createSupabaseBrowserClient();
    const nextPath = searchParams?.get("next") ?? "/watchlist";
    const emailRedirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/confirm?next=${encodeURIComponent(nextPath)}`
        : undefined;

    const {
      data: { session },
      error
    } = await supabase.auth.signUp({
      email,
      password,
      options: emailRedirectTo
        ? {
            emailRedirectTo
          }
        : undefined
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    if (session) {
      toast.success(dictionary.auth.signupSuccessLoggedIn);
      router.push(nextPath);
      router.refresh();
      setLoading(false);
      return;
    }

    toast.success(dictionary.auth.signupSuccessConfirm);
    router.push(`/auth/login?next=${encodeURIComponent(nextPath)}`);
    router.refresh();
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">{dictionary.auth.email}</label>
        <Input
          type="email"
          value={email}
          onChange={event => setEmail(event.target.value)}
          placeholder="name@example.com"
          required
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">{dictionary.auth.password}</label>
        <Input
          type="password"
          value={password}
          onChange={event => setPassword(event.target.value)}
          placeholder={dictionary.auth.minEight}
          minLength={8}
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {dictionary.auth.signUp}
      </Button>
      <p className="text-sm text-muted-foreground">
        {dictionary.auth.alreadyRegistered}{" "}
        <Link href="/auth/login" className="text-primary">
          {dictionary.auth.backToLogin}
        </Link>
      </p>
    </form>
  );
}
