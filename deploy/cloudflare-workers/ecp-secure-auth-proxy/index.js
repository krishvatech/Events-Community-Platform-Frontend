/**
 * IMAA Connect secure-auth proxy.
 *
 * Intended Cloudflare route (added only after review):
 *   connect.imaa-institute.org/_auth/*
 *
 * This Worker is deliberately isolated from the existing social-preview Worker.
 * It proxies only the three secure-session endpoints to Django and rejects every
 * other path. It does not contain credentials and must not log request bodies,
 * Authorization headers, cookies, or tokens.
 */

export const DEFAULTS = Object.freeze({
  backendOrigin: "https://api.colligatus.com",
  allowedOrigin: "https://connect.imaa-institute.org",
  secureCookieName: "__Host-ecp_secure_session",
});

export const ROUTE_MAP = Object.freeze({
  "/_auth/session/establish": "/api/auth/secure-session/establish/",
  "/_auth/session/refresh": "/api/auth/secure-session/refresh/",
  "/_auth/session/logout": "/api/auth/secure-session/logout/",
});

const NO_STORE_HEADERS = Object.freeze({
  "Cache-Control": "no-store, private, max-age=0",
  "CDN-Cache-Control": "no-store",
  "Cloudflare-CDN-Cache-Control": "no-store",
  Pragma: "no-cache",
  Expires: "0",
});

function config(env = {}) {
  return {
    backendOrigin: env.AUTH_BACKEND_ORIGIN || DEFAULTS.backendOrigin,
    allowedOrigin: env.AUTH_ALLOWED_ORIGIN || DEFAULTS.allowedOrigin,
    secureCookieName: env.AUTH_COOKIE_NAME || DEFAULTS.secureCookieName,
  };
}

export function normalizeAuthPath(pathname) {
  if (!pathname || pathname === "/") return pathname;
  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

export function backendPathFor(pathname) {
  return ROUTE_MAP[normalizeAuthPath(pathname)] || null;
}

export function extractNamedCookie(cookieHeader, cookieName) {
  if (!cookieHeader || !cookieName) return null;

  const prefix = `${cookieName}=`;
  for (const part of cookieHeader.split(";")) {
    const candidate = part.trim();
    if (candidate.startsWith(prefix)) {
      return candidate;
    }
  }
  return null;
}

function jsonResponse(status, code) {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
  });
  for (const [name, value] of Object.entries(NO_STORE_HEADERS)) {
    headers.set(name, value);
  }

  return new Response(JSON.stringify({ detail: code }), {
    status,
    headers,
  });
}

function copyHeaderIfPresent(source, target, name) {
  const value = source.get(name);
  if (value) target.set(name, value);
}

export function buildUpstreamHeaders(request, routeKey, cfg) {
  const headers = new Headers();

  // Minimal forwarding only. Do not clone arbitrary browser headers.
  copyHeaderIfPresent(request.headers, headers, "Accept");
  copyHeaderIfPresent(request.headers, headers, "Content-Type");
  copyHeaderIfPresent(request.headers, headers, "Origin");
  copyHeaderIfPresent(request.headers, headers, "X-ECP-Secure-Auth");
  copyHeaderIfPresent(request.headers, headers, "User-Agent");

  // Establish is the only endpoint that needs the existing Cognito Bearer token.
  if (routeKey === "/_auth/session/establish") {
    copyHeaderIfPresent(request.headers, headers, "Authorization");
  }

  // Refresh/logout need only the secure-session cookie. Never forward unrelated
  // Connect/Amplify/application cookies to the API origin.
  if (
    routeKey === "/_auth/session/refresh" ||
    routeKey === "/_auth/session/logout"
  ) {
    const secureCookie = extractNamedCookie(
      request.headers.get("Cookie"),
      cfg.secureCookieName,
    );
    if (secureCookie) headers.set("Cookie", secureCookie);
  }

  // Deliberately do not forward browser-supplied X-Forwarded-For. The backend's
  // secure-session throttle must not trust a client-selected forwarding header.
  headers.set("X-Forwarded-Proto", "https");
  headers.set("X-Forwarded-Host", new URL(cfg.allowedOrigin).host);

  return headers;
}

function secureResponse(upstream) {
  const headers = new Headers(upstream.headers);
  for (const [name, value] of Object.entries(NO_STORE_HEADERS)) {
    headers.set(name, value);
  }
  headers.set("X-Content-Type-Options", "nosniff");

  // Creating a new Response makes upstream headers mutable while preserving
  // Set-Cookie from Django. Django remains responsible for cookie attributes.
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
}

export async function handleSecureAuthRequest(request, env = {}) {
  const cfg = config(env);
  const url = new URL(request.url);
  const routeKey = normalizeAuthPath(url.pathname);
  const backendPath = backendPathFor(url.pathname);

  if (!backendPath) {
    return jsonResponse(404, "not_found");
  }

  if (request.method !== "POST") {
    const response = jsonResponse(405, "method_not_allowed");
    response.headers.set("Allow", "POST");
    return response;
  }

  // Auth endpoints do not use query-string inputs. Reject them instead of
  // forwarding ambiguous/cachable variants of credential-bearing requests.
  if (url.search) {
    return jsonResponse(400, "query_not_allowed");
  }

  if (request.headers.get("Origin") !== cfg.allowedOrigin) {
    return jsonResponse(403, "origin_not_allowed");
  }

  if (request.headers.get("X-ECP-Secure-Auth") !== "1") {
    return jsonResponse(403, "secure_auth_header_required");
  }

  let target;
  try {
    const backendOrigin = new URL(cfg.backendOrigin);
    if (backendOrigin.protocol !== "https:") {
      return jsonResponse(503, "proxy_misconfigured");
    }
    target = new URL(backendPath, backendOrigin);
  } catch {
    return jsonResponse(503, "proxy_misconfigured");
  }

  const upstreamHeaders = buildUpstreamHeaders(request, routeKey, cfg);

  let upstream;
  try {
    upstream = await fetch(target.toString(), {
      method: "POST",
      headers: upstreamHeaders,
      body: request.body,
      redirect: "manual",
    });
  } catch {
    // Never include upstream exception details: they may contain request data.
    return jsonResponse(502, "auth_backend_unavailable");
  }

  return secureResponse(upstream);
}

export default {
  fetch(request, env) {
    return handleSecureAuthRequest(request, env);
  },
};
