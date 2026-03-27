const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";

export function tmdbImageUrl(
  path: string | null | undefined,
  size: "w92" | "w154" | "w185" | "w342" | "w500" | "w780" | "w1280" = "w500"
) {
  return path ? `${TMDB_IMAGE_BASE_URL}/${size}${path}` : null;
}
