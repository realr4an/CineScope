"use client";

import { AIComparePanel } from "@/features/ai/compare-panel";
import type { AITitleInsightsResponse } from "@/lib/ai/types";
import type { MediaDetail } from "@/types/media";

export function AITitlePanel({
  media,
  initialInsights: _initialInsights
}: {
  media: MediaDetail;
  initialInsights?: AITitleInsightsResponse | null;
}) {
  return (
    <div className="space-y-4">
      <AIComparePanel leftPreset={{ title: media.title, mediaType: media.mediaType }} />
    </div>
  );
}
