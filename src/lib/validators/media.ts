import { z } from "zod";

const optionalNumberParam = z.preprocess(value => {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }

  const normalized = Array.isArray(value) ? value[0] : value;
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? undefined : parsed;
}, z.number().optional());

const optionalPositiveIntParam = optionalNumberParam.refine(
  value => value === undefined || (Number.isInteger(value) && value > 0),
  "Expected a positive integer"
);

const optionalRegionParam = z.preprocess(value => {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }

  const normalized = Array.isArray(value) ? value[0] : value;
  return String(normalized).trim().toUpperCase();
}, z.string().regex(/^[A-Z]{2}$/).optional());

export const searchParamsSchema = z.object({
  q: z.string().trim().default(""),
  type: z.enum(["all", "movie", "tv"]).default("all"),
  sort: z.enum(["popularity", "rating", "release_date"]).default("popularity"),
  page: z.coerce.number().int().min(1).default(1),
  region: optionalRegionParam,
  provider: optionalPositiveIntParam
});

export const discoverParamsSchema = z.object({
  mediaType: z.enum(["movie", "tv"]).default("movie"),
  genre: optionalPositiveIntParam,
  year: optionalNumberParam.refine(
    value => value === undefined || (Number.isInteger(value) && value > 1800),
    "Expected a valid year"
  ),
  rating: optionalNumberParam.refine(
    value => value === undefined || (value >= 0 && value <= 10),
    "Expected a rating between 0 and 10"
  ),
  page: z.coerce.number().int().min(1).default(1),
  sort: z
    .enum([
      "popularity.desc",
      "vote_average.desc",
      "primary_release_date.desc",
      "first_air_date.desc"
    ])
    .default("popularity.desc"),
  region: optionalRegionParam,
  provider: optionalPositiveIntParam
});
