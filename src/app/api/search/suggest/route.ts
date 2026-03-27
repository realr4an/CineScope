import { NextResponse } from "next/server";

import { filterMediaForViewerAge } from "@/lib/age-gate/server";
import { searchMediaWithFallback } from "@/lib/tmdb/search";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const mediaType = searchParams.get("type");
  const type = mediaType === "movie" || mediaType === "tv" ? mediaType : "all";

  if (query.length < 2) {
    return NextResponse.json({ items: [] });
  }

  try {
    const searchResult = await searchMediaWithFallback({ query, mediaType: type });
    const safeItems = await filterMediaForViewerAge(searchResult.items);

    return NextResponse.json({
      items: safeItems.slice(0, 8),
      appliedQuery: searchResult.appliedQuery,
      fallbackUsed: searchResult.fallbackUsed
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Vorschläge konnten nicht geladen werden."
      },
      { status: 500 }
    );
  }
}
