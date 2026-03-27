import { NextResponse } from "next/server";

import { getAvailableRegions } from "@/lib/tmdb/watch-providers";

export async function GET() {
  try {
    const regions = await getAvailableRegions();
    return NextResponse.json({ regions });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Regionen konnten nicht geladen werden."
      },
      { status: 500 }
    );
  }
}
