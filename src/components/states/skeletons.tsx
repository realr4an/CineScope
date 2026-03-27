import { cn } from "@/lib/utils";

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton-shimmer rounded-md", className)} />;
}

export function HeroSkeleton() {
  return (
    <div className="relative min-h-[70vh] overflow-hidden rounded-[2rem] border border-border/50 bg-card">
      <Skeleton className="absolute inset-0 rounded-none" />
      <div className="absolute bottom-0 left-0 w-full max-w-2xl space-y-4 p-8 md:p-12">
        <Skeleton className="h-6 w-28 rounded-full" />
        <Skeleton className="h-14 w-4/5 rounded-2xl" />
        <Skeleton className="h-5 w-3/5 rounded-full" />
        <Skeleton className="h-12 w-full rounded-2xl" />
      </div>
    </div>
  );
}

export function MediaGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-2xl border border-border/50">
          <Skeleton className="poster-aspect w-full rounded-none" />
          <div className="space-y-2 p-3">
            <Skeleton className="h-4 w-full rounded-full" />
            <Skeleton className="h-3 w-2/3 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MediaRowSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="scroll-row">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="w-40 shrink-0 overflow-hidden rounded-2xl border border-border/50 sm:w-44"
        >
          <Skeleton className="poster-aspect w-full rounded-none" />
          <div className="space-y-2 p-3">
            <Skeleton className="h-4 w-full rounded-full" />
            <Skeleton className="h-3 w-2/3 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-[55vh] w-full rounded-[2rem]" />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-8">
          <Skeleton className="h-10 w-2/3 rounded-full" />
          <Skeleton className="h-28 w-full rounded-3xl" />
          <Skeleton className="h-52 w-full rounded-3xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-3xl" />
          <Skeleton className="h-64 w-full rounded-3xl" />
        </div>
      </div>
    </div>
  );
}
