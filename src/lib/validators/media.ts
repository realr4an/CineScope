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

const optionalPositiveIntArrayParam = z.preprocess(value => {
  if (value === "" || value === null || value === undefined) {
    return [];
  }

  const values = Array.isArray(value) ? value : [value];

  return values
    .flatMap(item => String(item).split(","))
    .map(item => Number(item))
    .filter(item => Number.isInteger(item) && item > 0);
}, z.array(z.number().int().positive()).default([]));

const optionalRegionParam = z.preprocess(value => {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }

  const normalized = Array.isArray(value) ? value[0] : value;
  return String(normalized).trim().toUpperCase();
}, z.string().regex(/^[A-Z]{2}$/).optional());

const optionalYearParam = optionalNumberParam.refine(
  value => value === undefined || (Number.isInteger(value) && value > 1800),
  "Expected a valid year"
);

export const searchParamsSchema = z.object({
  q: z.string().trim().default(""),
  type: z.enum(["all", "movie", "tv"]).default("all"),
  sort: z.enum(["popularity", "rating", "release_date"]).default("popularity"),
  page: z.coerce.number().int().min(1).default(1),
  region: optionalRegionParam,
  providers: optionalPositiveIntArrayParam
});

export const discoverParamsSchema = z
  .object({
    mediaType: z.enum(["movie", "tv"]).default("movie"),
    genre: optionalPositiveIntParam,
    yearFrom: optionalYearParam,
    yearTo: optionalYearParam,
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
    providers: optionalPositiveIntArrayParam
  })
  .transform(value => {
    const yearFrom = value.yearFrom;
    const yearTo = value.yearTo;

    if (yearFrom !== undefined && yearTo !== undefined && yearFrom > yearTo) {
      return {
        ...value,
        yearFrom: yearTo,
        yearTo: yearFrom
      };
    }

    return value;
  });
