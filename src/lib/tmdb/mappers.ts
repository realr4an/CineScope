import { tmdbImageUrl } from "@/lib/tmdb/images";
import type {
  TmdbCombinedCreditsResponse,
  TmdbCreditsResponse,
  TmdbGenre,
  TmdbListResult,
  TmdbMovieDetails,
  TmdbPersonDetails,
  TmdbTvDetails,
  TmdbVideosResponse
} from "@/lib/tmdb/types";
import type {
  CastMember,
  Genre,
  MediaListItem,
  MovieDetail,
  PersonCredit,
  PersonDetail,
  TvDetail,
  VideoItem
} from "@/types/media";

export function mapGenres(
  genreIds: number[] | undefined,
  genresById: Map<number, TmdbGenre>
) {
  return (genreIds ?? []).map(id => ({
    id,
    name: genresById.get(id)?.name ?? "Unbekannt"
  }));
}

function mapResolvedGenres(genres: TmdbGenre[] | undefined) {
  return (genres ?? []).map<Genre>(genre => ({
    id: genre.id,
    name: genre.name
  }));
}

export function mapMediaListItem(
  item: TmdbListResult,
  mediaType: "movie" | "tv",
  genresById: Map<number, TmdbGenre>
): MediaListItem {
  return {
    tmdbId: item.id,
    mediaType,
    title: item.title ?? item.name ?? "Unbekannt",
    originalTitle: item.original_title ?? item.original_name ?? undefined,
    overview: item.overview ?? "",
    posterUrl: tmdbImageUrl(item.poster_path, "w500"),
    backdropUrl: tmdbImageUrl(item.backdrop_path, "w1280"),
    releaseDate: item.release_date ?? item.first_air_date ?? null,
    rating: Number(item.vote_average?.toFixed(1) ?? 0),
    voteCount: item.vote_count ?? 0,
    genres:
      item.genres && item.genres.length
        ? mapResolvedGenres(item.genres)
        : mapGenres(item.genre_ids, genresById)
  };
}

export function mapCast(cast: TmdbCreditsResponse["cast"]): CastMember[] {
  return cast.slice(0, 12).map(member => ({
    id: member.id,
    name: member.name,
    character: member.character ?? "Unbekannt",
    profileUrl: tmdbImageUrl(member.profile_path, "w185"),
    order: member.order
  }));
}

export function mapVideos(videos: TmdbVideosResponse["results"]): VideoItem[] {
  return videos
    .filter(video => video.site === "YouTube")
    .slice(0, 8)
    .map(video => ({
      id: video.id,
      name: video.name,
      key: video.key,
      site: video.site,
      type: video.type,
      official: video.official,
      publishedAt: video.published_at
    }));
}

export function mapMovieDetail(
  details: TmdbMovieDetails,
  credits: TmdbCreditsResponse,
  videos: TmdbVideosResponse,
  similar: TmdbListResult[],
  genresById: Map<number, TmdbGenre>
): MovieDetail {
  return {
    ...mapMediaListItem(details, "movie", genresById),
    mediaType: "movie",
    tagline: details.tagline,
    runtime: details.runtime,
    status: details.status,
    budget: details.budget || null,
    revenue: details.revenue || null,
    spokenLanguages: details.spoken_languages.map(language => language.english_name),
    cast: mapCast(credits.cast),
    videos: mapVideos(videos.results),
    similar: similar.map(item => mapMediaListItem(item, "movie", genresById))
  };
}

export function mapTvDetail(
  details: TmdbTvDetails,
  credits: TmdbCreditsResponse,
  videos: TmdbVideosResponse,
  similar: TmdbListResult[],
  genresById: Map<number, TmdbGenre>
): TvDetail {
  return {
    ...mapMediaListItem(details, "tv", genresById),
    mediaType: "tv",
    tagline: details.tagline,
    status: details.status,
    firstAirDate: details.first_air_date,
    lastAirDate: details.last_air_date,
    numberOfSeasons: details.number_of_seasons,
    numberOfEpisodes: details.number_of_episodes,
    episodeRuntime: details.episode_run_time ?? [],
    networks: details.networks.map(network => network.name),
    cast: mapCast(credits.cast),
    videos: mapVideos(videos.results),
    similar: similar.map(item => mapMediaListItem(item, "tv", genresById))
  };
}

export function mapPersonDetail(
  details: TmdbPersonDetails,
  credits: TmdbCombinedCreditsResponse,
  movieGenres: Map<number, TmdbGenre>,
  tvGenres: Map<number, TmdbGenre>
): PersonDetail {
  const mappedCredits: PersonCredit[] = credits.cast
    .filter(credit => credit.media_type === "movie" || credit.media_type === "tv")
    .slice(0, 18)
    .map(credit => ({
      ...mapMediaListItem(
        credit,
        credit.media_type,
        credit.media_type === "movie" ? movieGenres : tvGenres
      ),
      roleLabel: credit.character ?? "Mitwirkung"
    }));

  return {
    id: details.id,
    name: details.name,
    biography: details.biography,
    birthday: details.birthday,
    deathday: details.deathday,
    placeOfBirth: details.place_of_birth,
    knownForDepartment: details.known_for_department,
    profileUrl: tmdbImageUrl(details.profile_path, "w500"),
    credits: mappedCredits
  };
}
