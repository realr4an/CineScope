"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

type BackNavigationButtonProps = {
  label: string;
  fallbackHref?: string;
  className?: string;
};

export function BackNavigationButton({
  label,
  fallbackHref = "/",
  className = "mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
}: BackNavigationButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push(fallbackHref);
  };

  return (
    <button type="button" onClick={handleClick} className={className}>
      <ArrowLeft className="size-4" />
      {label}
    </button>
  );
}
