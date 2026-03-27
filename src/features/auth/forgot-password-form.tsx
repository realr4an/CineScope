"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!isSupabaseConfigured()) {
      toast.error("Supabase ist nicht konfiguriert.");
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

    toast.success("Reset-Link versendet. Bitte pruefe dein Postfach.");
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">E-Mail</label>
        <Input
          type="email"
          value={email}
          onChange={event => setEmail(event.target.value)}
          placeholder="name@example.com"
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        Reset-Link senden
      </Button>
      <p className="text-sm text-muted-foreground">
        ZurÜck zum{" "}
        <Link href="/auth/login" className="text-primary">
          Login
        </Link>
      </p>
    </form>
  );
}
