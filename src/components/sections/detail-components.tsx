"use client";

import { useMemo, useState } from "react";
import { Play, X } from "lucide-react";
import { motion } from "framer-motion";

import { PersonCard } from "@/components/cards/person-card";
import { SectionHeader } from "@/components/shared/ui-components";
import { cn } from "@/lib/utils";
import type { CastMember, VideoItem } from "@/types/media";

export function CastSection({ cast }: { cast: CastMember[] }) {
  if (!cast.length) {
    return null;
  }

  return (
    <section className="min-w-0 space-y-4">
      <SectionHeader title="Besetzung" subtitle="Die wichtigsten Rollen und Mitwirkenden" />
      <div className="scroll-row w-full max-w-full">
        {cast.map(member => (
          <PersonCard
            key={member.id}
            id={member.id}
            name={member.name}
            role={member.character}
            profileUrl={member.profileUrl}
            compact
          />
        ))}
      </div>
    </section>
  );
}

export function TrailerSection({ videos }: { videos: VideoItem[] }) {
  const trailers = useMemo(
    () => videos.filter(video => video.site === "YouTube" && video.key),
    [videos]
  );
  const [activeVideo, setActiveVideo] = useState<VideoItem | null>(null);

  if (!trailers.length) {
    return null;
  }

  return (
    <section className="space-y-4">
      <SectionHeader title="Trailer & Videos" subtitle="Offizielle Clips und Trailer" />
      <div className="scroll-row">
        {trailers.map(video => (
          <button
            key={video.id}
            type="button"
            onClick={() => setActiveVideo(video)}
            className="group min-w-[18rem] overflow-hidden rounded-2xl border border-border/50 bg-card/70 text-left"
          >
            <div className="backdrop-aspect relative">
              <img
                src={`https://img.youtube.com/vi/${video.key}/mqdefault.jpg`}
                alt={video.name}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/45">
                <div className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Play className="ml-0.5 size-5 fill-current" />
                </div>
              </div>
            </div>
            <div className="space-y-1 p-3">
              <div className="text-sm font-semibold">{video.name}</div>
              <div className="text-xs text-muted-foreground">{video.type}</div>
            </div>
          </button>
        ))}
      </div>

      {activeVideo ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setActiveVideo(null)}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative w-full max-w-5xl overflow-hidden rounded-3xl border border-border/50 bg-black"
            onClick={event => event.stopPropagation()}
          >
            <div className="backdrop-aspect">
              <iframe
                src={`https://www.youtube.com/embed/${activeVideo.key}?autoplay=1&rel=0`}
                title={activeVideo.name}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full"
              />
            </div>
            <button
              type="button"
              onClick={() => setActiveVideo(null)}
              className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-black/60 text-white"
            >
              <X className="size-4" />
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </section>
  );
}

export function InfoPanel({
  items,
  className
}: {
  items: Array<{ label: string; value: React.ReactNode }>;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {items.map(item => (
        <div key={item.label} className="flex flex-col gap-1 border-b border-border/30 pb-3 last:border-0 last:pb-0 sm:flex-row sm:gap-3">
          <div className="shrink-0 text-sm text-muted-foreground sm:w-28">{item.label}</div>
          <div className="min-w-0 break-words text-sm font-medium">{item.value}</div>
        </div>
      ))}
    </div>
  );
}
