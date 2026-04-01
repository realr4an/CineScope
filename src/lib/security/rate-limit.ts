type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __cineScopeRateLimitBuckets__: Map<string, Bucket> | undefined;
}

function getStore() {
  if (!globalThis.__cineScopeRateLimitBuckets__) {
    globalThis.__cineScopeRateLimitBuckets__ = new Map<string, Bucket>();
  }

  return globalThis.__cineScopeRateLimitBuckets__;
}

export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const store = getStore();
  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    store.set(key, {
      count: 1,
      resetAt: now + windowMs
    });

    return {
      allowed: true,
      retryAfterSeconds: Math.ceil(windowMs / 1000)
    };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000))
    };
  }

  current.count += 1;
  store.set(key, current);

  return {
    allowed: true,
    retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000))
  };
}
