import { NextResponse } from "next/server";

import { getProviderOptions } from "@/lib/tmdb/watch-providers";
import { normalizeWatchRegionCode } from "@/lib/tmdb/watch-provider-preference";

function isValidMediaType(mediaType: string) {
  return mediaType === "all" || mediaType === "movie" || mediaType === "tv";
}

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const mediaType = searchParams.get("mediaType") ?? "all";
  const region = normalizeWatchRegionCode(searchParams.get("region"));

  if (!isValidMediaType(mediaType)) {
    return NextResponse.json({ error: "Ungültiger Medientyp." }, { status: 400 });
  }

  if (!region) {
    return NextResponse.json({ error: "Ungültiger Region-Code." }, { status: 400 });
  }

  try {
    const providers = await getProviderOptions(mediaType, region);
    return NextResponse.json({ providers });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Streamingdienste konnten nicht geladen werden."
      },
      { status: 500 }
    );
  }
}
