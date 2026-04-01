import type { NextApiRequest } from "next";

function normalizeHost(value: string) {
  return value.trim().toLowerCase();
}

function extractForwardedHost(value: string | null) {
  if (!value) {
    return null;
  }

  return normalizeHost(value.split(",")[0] ?? "");
}

function parseOriginHost(origin: string | null) {
  if (!origin) {
    return null;
  }

  try {
    return normalizeHost(new URL(origin).host);
  } catch {
    return null;
  }
}

export function isSameOriginRequest(request: Request) {
  const originHost = parseOriginHost(request.headers.get("origin"));

  if (!originHost) {
    return true;
  }

  const host =
    extractForwardedHost(request.headers.get("x-forwarded-host")) ??
    normalizeHost(request.headers.get("host") ?? "");

  return !!host && host === originHost;
}

export function isSameOriginNextApiRequest(request: NextApiRequest) {
  const originValue = request.headers.origin;
  const originHost = parseOriginHost(typeof originValue === "string" ? originValue : null);

  if (!originHost) {
    return true;
  }

  const forwardedHost = request.headers["x-forwarded-host"];
  const hostHeader = request.headers.host;

  const host =
    extractForwardedHost(typeof forwardedHost === "string" ? forwardedHost : null) ??
    normalizeHost(hostHeader ?? "");

  return !!host && host === originHost;
}

function normalizeIp(value: string | undefined | null) {
  if (!value) {
    return "unknown";
  }

  return value.trim();
}

export function getRequestIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");

  if (forwarded) {
    return normalizeIp(forwarded.split(",")[0]);
  }

  const realIp = request.headers.get("x-real-ip");

  if (realIp) {
    return normalizeIp(realIp);
  }

  const cloudflare = request.headers.get("cf-connecting-ip");

  if (cloudflare) {
    return normalizeIp(cloudflare);
  }

  return "unknown";
}

export function getNextApiRequestIp(request: NextApiRequest) {
  const forwarded = request.headers["x-forwarded-for"];

  if (typeof forwarded === "string" && forwarded.length) {
    return normalizeIp(forwarded.split(",")[0]);
  }

  const realIp = request.headers["x-real-ip"];

  if (typeof realIp === "string" && realIp.length) {
    return normalizeIp(realIp);
  }

  const cloudflare = request.headers["cf-connecting-ip"];

  if (typeof cloudflare === "string" && cloudflare.length) {
    return normalizeIp(cloudflare);
  }

  return "unknown";
}

export function getRateLimitIdentityKey(base: string, ip: string, userId?: string | null) {
  return [base, userId ?? "anon", ip].join(":");
}
