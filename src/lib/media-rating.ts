export const STAR_RATING_BUCKETS = [
  { value: 5, min: 9, max: 10 },
  { value: 4, min: 8, max: 8.9 },
  { value: 3, min: 7, max: 7.9 },
  { value: 2, min: 6, max: 6.9 },
  { value: 1, min: 5, max: 5.9 }
] as const;

export function normalizeStarRatings(values: number[]) {
  return [...new Set(values.filter(value => Number.isInteger(value) && value >= 1 && value <= 5))].sort(
    (left, right) => right - left
  );
}

export function matchesStarRatings(rating: number, selectedRatings: number[]) {
  if (!selectedRatings.length) {
    return true;
  }

  return STAR_RATING_BUCKETS.some(
    bucket =>
      selectedRatings.includes(bucket.value) &&
      rating >= bucket.min &&
      rating <= bucket.max
  );
}

export function getMinimumRatingForStars(selectedRatings: number[]) {
  const normalized = normalizeStarRatings(selectedRatings);

  if (!normalized.length) {
    return undefined;
  }

  return STAR_RATING_BUCKETS.filter(bucket => normalized.includes(bucket.value)).reduce(
    (minimum, bucket) => Math.min(minimum, bucket.min),
    Number.POSITIVE_INFINITY
  );
}
