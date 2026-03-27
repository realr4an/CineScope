import { fetchTmdb } from "@/lib/tmdb/client";
import { getGenreMaps } from "@/lib/tmdb/discover";
import { mapPersonDetail } from "@/lib/tmdb/mappers";
import type {
  TmdbCombinedCreditsResponse,
  TmdbPersonDetails
} from "@/lib/tmdb/types";

export async function getPersonDetail(id: number) {
  const { movieGenres, tvGenres } = await getGenreMaps();
  const [details, credits] = await Promise.all([
    fetchTmdb<TmdbPersonDetails>(`/person/${id}`),
    fetchTmdb<TmdbCombinedCreditsResponse>(`/person/${id}/combined_credits`)
  ]);

  return mapPersonDetail(details, credits, movieGenres, tvGenres);
}
