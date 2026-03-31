import { redirect } from "next/navigation";

type DiscoverPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DiscoverPage({ searchParams }: DiscoverPageProps) {
  const rawSearchParams = await searchParams;
  const params = new URLSearchParams();

  const mediaType = Array.isArray(rawSearchParams.mediaType)
    ? rawSearchParams.mediaType[0]
    : rawSearchParams.mediaType;
  const type = mediaType === "movie" || mediaType === "tv" ? mediaType : "all";

  params.set("type", type);

  const sort = Array.isArray(rawSearchParams.sort) ? rawSearchParams.sort[0] : rawSearchParams.sort;
  if (sort === "vote_average.desc") {
    params.set("sort", "rating");
  } else if (sort === "primary_release_date.desc" || sort === "first_air_date.desc") {
    params.set("sort", "release_date");
  } else {
    params.set("sort", "popularity");
  }

  for (const [key, value] of Object.entries(rawSearchParams)) {
    if (value === undefined || key === "mediaType" || key === "sort") {
      continue;
    }

    if (Array.isArray(value)) {
      for (const entry of value) {
        params.append(key, entry);
      }
      continue;
    }

    params.set(key, value);
  }

  redirect(`/search?${params.toString()}`);
}
