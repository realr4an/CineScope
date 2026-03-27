"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

export function SignupForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!isSupabaseConfigured()) {
      toast.error("Supabase ist nicht konfiguriert.");
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
      toast.success("Account erstellt. Du bist jetzt eingeloggt.");
      router.push(nextPath);
      router.refresh();
      setLoading(false);
      return;
    }

    toast.success("Account erstellt. Bitte bestaetige jetzt deine E-Mail und melde dich danach an.");
    router.push(`/auth/login?next=${encodeURIComponent(nextPath)}`);
    router.refresh();
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
      <div className="space-y-2">
        <label className="text-sm font-medium">Passwort</label>
        <Input
          type="password"
          value={password}
          onChange={event => setPassword(event.target.value)}
          placeholder="Mindestens 8 Zeichen"
          minLength={8}
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        Registrieren
      </Button>
      <p className="text-sm text-muted-foreground">
        Bereits registriert?{" "}
        <Link href="/auth/login" className="text-primary">
          Zum Login
        </Link>
      </p>
    </form>
  );
}
