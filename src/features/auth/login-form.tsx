"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

export function LoginForm() {
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
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    toast.success("Login erfolgreich.");
    const nextPath = searchParams?.get("next") ?? "/watchlist";
    router.push(nextPath);
    router.refresh();
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
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        Einloggen
      </Button>
      <div className="text-right">
        <Link href="/auth/forgot-password" className="text-sm text-primary">
          Passwort vergessen?
        </Link>
      </div>
      <p className="text-sm text-muted-foreground">
        Noch kein Konto?{" "}
        <Link href="/auth/signup" className="text-primary">
          Jetzt registrieren
        </Link>
      </p>
    </form>
  );
}
