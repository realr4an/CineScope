import { fetchTmdb } from "@/lib/tmdb/client";
import { getGenreMaps } from "@/lib/tmdb/discover";
import { mapPersonDetail } from "@/lib/tmdb/mappers";
import type { Locale } from "@/lib/i18n/types";
import type {
  TmdbCombinedCreditsResponse,
  TmdbPersonDetails
} from "@/lib/tmdb/types";

export async function getPersonDetail(id: number, locale: Locale = "de") {
  const { movieGenres, tvGenres } = await getGenreMaps(locale);
  const [details, credits] = await Promise.all([
    fetchTmdb<TmdbPersonDetails>(`/person/${id}`, undefined, undefined, locale),
    fetchTmdb<TmdbCombinedCreditsResponse>(`/person/${id}/combined_credits`, undefined, undefined, locale)
  ]);

  return mapPersonDetail(details, credits, movieGenres, tvGenres);
}
