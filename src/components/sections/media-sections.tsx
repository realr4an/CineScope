"use client";

import { motion } from "framer-motion";

import { MediaCard } from "@/components/cards/media-card";
import { SectionHeader } from "@/components/shared/ui-components";
import { MediaGridSkeleton, MediaRowSkeleton } from "@/components/states/skeletons";
import { ErrorState } from "@/components/states/state-components";
import { useLanguage } from "@/features/i18n/language-provider";
import { useWatchlist } from "@/features/watchlist/watchlist-provider";
import type { MediaListItem, MediaSection } from "@/types/media";

export function HorizontalMediaRow({
  section,
  loading,
  error
}: {
  section: MediaSection;
  loading?: boolean;
  error?: string;
}) {
  const { isSaved, toggleItem } = useWatchlist();
  const { dictionary } = useLanguage();

  if (loading) {
    return (
      <div className="space-y-4">
        <SectionHeader title={section.title} subtitle={section.subtitle} />
        <MediaRowSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <SectionHeader title={section.title} subtitle={section.subtitle} />
        <ErrorState
          title={dictionary.common.movie === "Movie" ? "Could not load titles" : "Inhalte konnten nicht geladen werden"}
          description={error}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title={section.title}
        subtitle={section.subtitle}
        href={section.href}
        ctaLabel={dictionary.common.language === "Language" ? "View all" : "Alle anzeigen"}
      />
      <div className="scroll-row">
        {section.items.map((item, index) => (
          <motion.div
            key={`${item.mediaType}-${item.tmdbId}`}
            className="w-40 shrink-0 sm:w-44"
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.03 }}
          >
            <MediaCard
              item={item}
              isFavorite={isSaved(item.tmdbId, item.mediaType)}
              onFavoriteToggle={toggleItem}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function MediaGrid({
  items,
  loading,
  error
}: {
  items: MediaListItem[];
  loading?: boolean;
  error?: string;
}) {
  const { isSaved, toggleItem } = useWatchlist();
  const { dictionary } = useLanguage();

  if (loading) {
    return <MediaGridSkeleton />;
  }

  if (error) {
    return (
      <ErrorState
        title={dictionary.common.language === "Language" ? "Could not load results" : "Ergebnisse konnten nicht geladen werden"}
        description={error}
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
      {items.map((item, index) => (
        <motion.div
          key={`${item.mediaType}-${item.tmdbId}`}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.02 }}
        >
          <MediaCard
            item={item}
            isFavorite={isSaved(item.tmdbId, item.mediaType)}
            onFavoriteToggle={toggleItem}
          />
        </motion.div>
      ))}
    </div>
  );
}
