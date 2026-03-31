"use client";

import { useMemo, useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/features/i18n/language-provider";
import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

export function PasswordChangeForm() {
  const { locale } = useLanguage();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const text = useMemo(
    () =>
      locale === "en"
        ? {
            title: "Password",
            description: "Set a new password for your account.",
            password: "New password",
            confirmPassword: "Confirm new password",
            placeholder: "At least 8 characters",
            save: "Update password",
            saving: "Saving...",
            tooShort: "Password must be at least 8 characters long.",
            mismatch: "Passwords do not match.",
            failure: "Password could not be updated.",
            success: "Password updated."
          }
        : {
            title: "Passwort",
            description: "Lege ein neues Passwort für dein Konto fest.",
            password: "Neues Passwort",
            confirmPassword: "Neues Passwort wiederholen",
            placeholder: "Mindestens 8 Zeichen",
            save: "Passwort aktualisieren",
            saving: "Speichere...",
            tooShort: "Das Passwort muss mindestens 8 Zeichen lang sein.",
            mismatch: "Die Passwörter stimmen nicht überein.",
            failure: "Passwort konnte nicht aktualisiert werden.",
            success: "Passwort aktualisiert."
          },
    [locale]
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!isSupabaseConfigured()) {
      toast.error(text.failure);
      return;
    }

    if (password.length < 8) {
      toast.error(text.tooShort);
      return;
    }

    if (password !== confirmPassword) {
      toast.error(text.mismatch);
      return;
    }

    setSaving(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast.error(error.message || text.failure);
      setSaving(false);
      return;
    }

    setPassword("");
    setConfirmPassword("");
    toast.success(text.success);
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">{text.password}</label>
        <Input
          type="password"
          value={password}
          onChange={event => setPassword(event.target.value)}
          placeholder={text.placeholder}
          required
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">{text.confirmPassword}</label>
        <Input
          type="password"
          value={confirmPassword}
          onChange={event => setConfirmPassword(event.target.value)}
          placeholder={text.placeholder}
          required
        />
      </div>

      <Button type="submit" className="w-full sm:w-auto" disabled={saving}>
        {saving ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
        {saving ? text.saving : text.save}
      </Button>
    </form>
  );
}
