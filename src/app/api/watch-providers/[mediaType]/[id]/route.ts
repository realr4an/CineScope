import { NextResponse } from "next/server";

import {
  getMovieWatchProviders,
  getTvWatchProviders,
  mapWatchProvidersForRegion
} from "@/lib/tmdb/watch-providers";

type RouteContext = {
  params: Promise<{
    mediaType: string;
    id: string;
  }>;
};

function isValidRegion(region: string) {
  return /^[A-Za-z]{2}$/.test(region);
}

export async function GET(request: Request, context: RouteContext) {
  const { mediaType, id } = await context.params;
  const region = new URL(request.url).searchParams.get("region")?.toUpperCase();
  const parsedId = Number(id);

  if ((mediaType !== "movie" && mediaType !== "tv") || Number.isNaN(parsedId)) {
    return NextResponse.json({ error: "Ungültiger Medientyp oder Titel." }, { status: 400 });
  }

  if (!region || !isValidRegion(region)) {
    return NextResponse.json({ error: "Ungültiger Region-Code." }, { status: 400 });
  }

  try {
    const rawResponse =
      mediaType === "movie"
        ? await getMovieWatchProviders(parsedId)
        : await getTvWatchProviders(parsedId);

    const result = mapWatchProvidersForRegion(rawResponse, region);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Watch-Provider konnten nicht geladen werden."
      },
      { status: 500 }
    );
  }
}
