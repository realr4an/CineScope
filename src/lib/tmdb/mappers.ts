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

const LANGUAGE_NAMES = new Intl.DisplayNames(["de"], {
  type: "language"
});

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

function normalizeLanguageName(name: string | null | undefined) {
  return name?.trim() || null;
}

function getLanguageNameFromCode(code: string | null | undefined) {
  if (!code) {
    return null;
  }

  return normalizeLanguageName(LANGUAGE_NAMES.of(code)) ?? code.toUpperCase();
}

function uniqueLanguages(languages: Array<string | null | undefined>) {
  return Array.from(new Set(languages.map(normalizeLanguageName).filter(Boolean))) as string[];
}

function mapOriginalLanguageName(
  originalLanguageCode: string | null | undefined,
  fallbackLanguages: Array<{ iso_639_1?: string; english_name?: string; name?: string }> = []
) {
  const fallback = fallbackLanguages.find(language => language.iso_639_1 === originalLanguageCode);

  return (
    normalizeLanguageName(fallback?.name) ??
    normalizeLanguageName(fallback?.english_name) ??
    getLanguageNameFromCode(originalLanguageCode)
  );
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
    originalLanguage: getLanguageNameFromCode(item.original_language),
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
  const originalLanguage = mapOriginalLanguageName(
    details.original_language,
    details.spoken_languages
  );

  return {
    ...mapMediaListItem(details, "movie", genresById),
    mediaType: "movie",
    tagline: details.tagline,
    runtime: details.runtime,
    status: details.status,
    budget: details.budget || null,
    revenue: details.revenue || null,
    originalLanguage,
    spokenLanguages: uniqueLanguages([
      ...details.spoken_languages.map(
        language => language.name ?? language.english_name ?? getLanguageNameFromCode(language.iso_639_1)
      ),
      originalLanguage
    ]),
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
  const originalLanguage = getLanguageNameFromCode(details.original_language);

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
    originalLanguage,
    networks: details.networks.map(network => network.name),
    spokenLanguages: uniqueLanguages([
      ...(details.languages ?? []).map(language => getLanguageNameFromCode(language)),
      originalLanguage
    ]),
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
