import { AppShell } from "@/components/layout/app-shell";
import { HeroSkeleton, MediaRowSkeleton } from "@/components/states/skeletons";

export default function Loading() {
  return (
    <AppShell>
      <div className="space-y-10">
        <HeroSkeleton />
        <div className="space-y-8">
          <MediaRowSkeleton />
          <MediaRowSkeleton />
          <MediaRowSkeleton />
        </div>
      </div>
    </AppShell>
  );
}
