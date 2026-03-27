import { z } from "zod";

export const searchParamsSchema = z.object({
  q: z.string().trim().default(""),
  type: z.enum(["all", "movie", "tv"]).default("all"),
  sort: z.enum(["popularity", "rating", "release_date"]).default("popularity")
});

export const discoverParamsSchema = z.object({
  mediaType: z.enum(["movie", "tv"]).default("movie"),
  genre: z.coerce.number().optional(),
  year: z.coerce.number().optional(),
  rating: z.coerce.number().min(0).max(10).optional(),
  sort: z
    .enum([
      "popularity.desc",
      "vote_average.desc",
      "primary_release_date.desc",
      "first_air_date.desc"
    ])
    .default("popularity.desc")
});
