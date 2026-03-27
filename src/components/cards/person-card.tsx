import Link from "next/link";
import { User } from "lucide-react";

import { cn } from "@/lib/utils";

const FALLBACK_PROFILE =
  "https://placehold.co/320x320/181414/f5f5f4?text=Person";

export function PersonCard({
  id,
  name,
  role,
  profileUrl,
  compact
}: {
  id: number;
  name: string;
  role?: string;
  profileUrl: string | null;
  compact?: boolean;
}) {
  return (
    <Link
      href={`/person/${id}`}
      className={cn(
        "group flex min-w-0 gap-3 rounded-2xl border border-border/50 bg-card/70 p-3 transition-colors hover:border-primary/30",
        compact ? "w-[15rem] shrink-0 sm:w-56" : "flex-col"
      )}
    >
      <div
        className={cn(
          "overflow-hidden bg-muted",
          compact ? "size-14 rounded-full" : "aspect-square rounded-2xl"
        )}
      >
        {profileUrl ? (
          <img
            src={profileUrl}
            alt={name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : compact ? (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <User className="size-5" />
          </div>
        ) : (
          <img src={FALLBACK_PROFILE} alt={name} className="h-full w-full object-cover" />
        )}
      </div>
      <div className="min-w-0">
        <div className="line-clamp-2 text-sm font-semibold group-hover:text-primary">
          {name}
        </div>
        {role ? <div className="mt-1 text-xs text-muted-foreground">{role}</div> : null}
      </div>
    </Link>
  );
}
