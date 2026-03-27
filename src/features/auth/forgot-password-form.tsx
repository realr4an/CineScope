"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/features/i18n/language-provider";
import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { dictionary } = useLanguage();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!isSupabaseConfigured()) {
      toast.error(dictionary.auth.supabaseNotConfigured);
      return;
    }

    setLoading(true);

    const supabase = createSupabaseBrowserClient();
    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/confirm?next=/auth/reset-password`
        : undefined;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    toast.success(dictionary.auth.resetSent);
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
      <Button type="submit" className="w-full" disabled={loading}>
        {dictionary.auth.sendResetLink}
      </Button>
      <p className="text-sm text-muted-foreground">
        {dictionary.auth.backToLogin}{" "}
        <Link href="/auth/login" className="text-primary">
          {dictionary.auth.login}
        </Link>
      </p>
    </form>
  );
}
