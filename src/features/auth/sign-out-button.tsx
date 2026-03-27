"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();

  return (
    <Button
      variant="ghost"
      onClick={async () => {
        if (!isSupabaseConfigured()) {
          toast.error("Supabase ist nicht konfiguriert.");
          return;
        }

        const supabase = createSupabaseBrowserClient();
        const { error } = await supabase.auth.signOut();

        if (error) {
          toast.error(error.message);
          return;
        }

        toast.success("Du wurdest abgemeldet.");
        router.push("/");
        router.refresh();
      }}
    >
      <LogOut className="size-4" />
      Logout
    </Button>
  );
}
