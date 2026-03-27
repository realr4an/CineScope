"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useLanguage } from "@/features/i18n/language-provider";
import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const { locale, dictionary } = useLanguage();

  return (
    <Button
      variant="ghost"
      onClick={async () => {
        if (!isSupabaseConfigured()) {
          toast.error(dictionary.auth.supabaseNotConfigured);
          return;
        }

        const supabase = createSupabaseBrowserClient();
        const { error } = await supabase.auth.signOut();

        if (error) {
          toast.error(error.message);
          return;
        }

        toast.success(locale === "en" ? "You have been signed out." : "Du wurdest abgemeldet.");
        router.push("/");
        router.refresh();
      }}
    >
      <LogOut className="size-4" />
      {dictionary.common.logout}
    </Button>
  );
}
