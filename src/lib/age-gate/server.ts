import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";

import {
  AGE_GATE_COOKIE_NAME,
  createAgeGateState,
  isCertificationAllowed,
  mapMovieCertificationToMinAge,
  mapTvCertificationToMinAge,
  normalizeBirthDate,
  type AgeCertification
} from "@/lib/age-gate";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchTmdb } from "@/lib/tmdb/client";
import type {
  TmdbMovieReleaseDatesResponse,
  TmdbTvContentRatingsResponse
} from "@/lib/tmdb/types";
import type { MediaType } from "@/types/media";

const PREFERRED_CERTIFICATION_REGIONS = ["DE", "US"] as const;

const getProfileBirthDate = cache(async () => {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data } = await (supabase.from("profiles") as any)
    .select("birth_date")
    .eq("id", user.id)
    .maybeSingle();

  return normalizeBirthDate(data?.birth_date ?? null);
});

export const getAgeGateState = cache(async () => {
  const cookieStore = await cookies();
  const cookieBirthDate = normalizeBirthDate(cookieStore.get(AGE_GATE_COOKIE_NAME)?.value ?? null);
  const profileBirthDate = await getProfileBirthDate();

  if (profileBirthDate) {
    return createAgeGateState(profileBirthDate, "profile");
  }

  if (cookieBirthDate) {
    return createAgeGateState(cookieBirthDate, "cookie");
  }

  return createAgeGateState(null, null);
});

function chooseMovieCertification(
  response: TmdbMovieReleaseDatesResponse
): AgeCertification | null {
  for (const region of PREFERRED_CERTIFICATION_REGIONS) {
    const regionEntry = response.results.find(entry => entry.iso_3166_1 === region);

    if (!regionEntry) {
      continue;
    }

    const dated = [...regionEntry.release_dates]
      .filter(entry => entry.certification?.trim())
      .sort((left, right) => {
        const leftPriority = left.type === 3 ? 0 : 1;
        const rightPriority = right.type === 3 ? 0 : 1;
        return leftPriority - rightPriority;
      });

    const candidate = dated[0];

    if (!candidate?.certification) {
      continue;
    }

    return {
      region,
      label: region === "DE" ? `FSK ${candidate.certification.trim()}` : candidate.certification.trim(),
      minAge: mapMovieCertificationToMinAge(candidate.certification, region),
      system: "movie"
    };
  }

  return null;
}

function chooseTvCertification(response: TmdbTvContentRatingsResponse): AgeCertification | null {
  for (const region of PREFERRED_CERTIFICATION_REGIONS) {
    const regionEntry = response.results.find(entry => entry.iso_3166_1 === region && entry.rating?.trim());

    if (!regionEntry?.rating) {
      continue;
    }

    return {
      region,
      label: regionEntry.rating.trim(),
      minAge: mapTvCertificationToMinAge(regionEntry.rating, region),
      system: "tv"
    };
  }

  return null;
}

const getMovieAgeCertification = cache(async (tmdbId: number) => {
  try {
    const response = await fetchTmdb<TmdbMovieReleaseDatesResponse>(`/movie/${tmdbId}/release_dates`);
    return chooseMovieCertification(response);
  } catch {
    return null;
  }
});

const getTvAgeCertification = cache(async (tmdbId: number) => {
  try {
    const response = await fetchTmdb<TmdbTvContentRatingsResponse>(`/tv/${tmdbId}/content_ratings`);
    return chooseTvCertification(response);
  } catch {
    return null;
  }
});

export async function getMediaAgeCertification(mediaType: MediaType, tmdbId: number) {
  return mediaType === "movie"
    ? getMovieAgeCertification(tmdbId)
    : getTvAgeCertification(tmdbId);
}

export async function getAgeAccessForMedia(mediaType: MediaType, tmdbId: number) {
  const [ageGate, certification] = await Promise.all([
    getAgeGateState(),
    getMediaAgeCertification(mediaType, tmdbId)
  ]);

  return {
    ageGate,
    certification,
    allowed: isCertificationAllowed(certification?.minAge ?? null, ageGate.age)
  };
}

export async function filterMediaForViewerAge<
  T extends {
    tmdbId: number;
    mediaType: MediaType;
  }
>(items: T[]) {
  const ageGate = await getAgeGateState();

  if (ageGate.age === null) {
    return items;
  }

  const checks = await Promise.all(
    items.map(async item => ({
      item,
      certification: await getMediaAgeCertification(item.mediaType, item.tmdbId)
    }))
  );

  return checks
    .filter(result => isCertificationAllowed(result.certification?.minAge ?? null, ageGate.age))
    .map(result => result.item);
}
