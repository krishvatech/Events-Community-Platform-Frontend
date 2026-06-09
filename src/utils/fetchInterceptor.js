import { cognitoRefreshSession } from "./cognitoAuth";
import { getRefreshToken, getToken } from "./api";
import { getUserName, clearAuth } from "./authStorage";

// Store original fetch
const originalFetch = window.fetch;

let isRefreshing = false;
let failedQueue = [];
const inFlightGetRequests = new Map();
const DEFAULT_FETCH_TIMEOUT_MS = 20000;
const MUTATION_FETCH_TIMEOUT_MS = 120000;

//  403 Forbidden Cache - Prevent retry storms on permission denied
const forbiddenCache = new Map();
const FORBIDDEN_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const isForbiddenCached = (url) => {
    if (!forbiddenCache.has(url)) return false;
    const cached = forbiddenCache.get(url);
    const isExpired = Date.now() - cached.timestamp > FORBIDDEN_CACHE_TTL_MS;
    if (isExpired) {
        forbiddenCache.delete(url);
        return false;
    }
    return true;
};

const cacheForbidden = (url) => {
    forbiddenCache.set(url, { timestamp: Date.now(), status: 403 });
    console.log(`[Global Fetch] Cached 403 for ${url} (5min TTL)`);
};

// Helper: Check if a 403 response is actually an expired token error
const isExpiredTokenError = (status, responseBody) => {
    if (status !== 403) return false;

    const text = String(responseBody || "").toLowerCase();
    const expiredPatterns = [
        "signature has expired",
        "token expired",
        "expired token",
        "cognito auth failed"
    ];

    return expiredPatterns.some(pattern => text.includes(pattern));
};

const processQueue = (error, token = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

window.fetch = async (...args) => {
    let [resource, config] = args;
    const requestConfig = config || {};
    const method = (requestConfig.method || "GET").toUpperCase();
    const url = typeof resource === "string" ? resource : resource?.url || "";
    const canDedupeGet = method === "GET" && !!url && !requestConfig.signal;

    // Deduplicate same GET request while in-flight to avoid storms from overlapping pollers.
    if (canDedupeGet && inFlightGetRequests.has(url)) {
        return inFlightGetRequests.get(url).then((res) => res.clone());
    }

    const executeFetch = async () => {
        // Apply timeout only when no external signal is supplied.
        if (!requestConfig.signal) {
            const controller = new AbortController();
            const hasFormDataBody = typeof FormData !== "undefined" && requestConfig.body instanceof FormData;
            const timeoutMs =
                method === "GET" && !hasFormDataBody
                    ? DEFAULT_FETCH_TIMEOUT_MS
                    : MUTATION_FETCH_TIMEOUT_MS;
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
            try {
                return await originalFetch(resource, { ...requestConfig, signal: controller.signal });
            } finally {
                clearTimeout(timeoutId);
            }
        }
        return originalFetch(resource, requestConfig);
    };

    // 1. Attempt original request
    let response;
    try {
        if (canDedupeGet) {
            const sharedPromise = executeFetch().finally(() => {
                inFlightGetRequests.delete(url);
            });
            inFlightGetRequests.set(url, sharedPromise);
            response = await sharedPromise;
        } else {
            response = await executeFetch();
        }
    } catch (error) {
        return Promise.reject(error);
    }

    const readAuthHeader = (headers) => {
        if (!headers) return "";
        if (headers instanceof Headers) {
            return headers.get("Authorization") || "";
        }
        return headers.Authorization || headers.authorization || "";
    };

    //  Only refresh on 401 (token expired), NOT on 403 (permission denied)
    // 403 is permission denied and should never trigger a token refresh
    const authHeader = readAuthHeader(requestConfig?.headers);
    const requestToken = authHeader.replace(/^Bearer\s+/i, "").trim();
    const storedAccessToken = getToken();
    const hasAuthenticatedSession = Boolean(requestToken || storedAccessToken);

    // GUEST EXCEPTION: For guest users, return forbidden response without refresh attempt
    const isGuest = localStorage.getItem("is_guest") === "true";

    // 403 (Forbidden) - Check if it's actually an expired token error
    if (response.status === 403) {
        // Try to read response body safely to check for expired token error
        let responseText = "";
        try {
            const clonedResponse = response.clone();
            responseText = await clonedResponse.text();
        } catch {
            // If we can't read body, treat as real 403
        }

        const isExpiredToken = isExpiredTokenError(403, responseText);

        if (!isExpiredToken) {
            console.warn(`[Global Fetch] 403 Forbidden for ${url}. This is permission denied, not token expiration.`);
            // Cache to prevent repeated calls for the same forbidden endpoint
            cacheForbidden(url);
            return response;
        }

        // If it IS an expired token error, fall through to refresh logic below
        console.warn(`[Global Fetch] 403 Forbidden for ${url} but detected as expired token error. Treating as 401.`);
        response.status = 401; // Treat as 401 so refresh logic kicks in
    }

    // Only attempt refresh on 401 (token expired)
    const shouldAttemptRefresh =
        response.status === 401 &&
        hasAuthenticatedSession &&
        !isGuest;

    if (shouldAttemptRefresh) {
        // Check if we are already refreshing
        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                failedQueue.push({ resolve, reject });
            })
                .then((newToken) => {
                    // Retry with new token
                    const newConfig = { ...requestConfig, headers: { ...requestConfig?.headers } };
                    newConfig.headers["Authorization"] = `Bearer ${newToken}`;
                    return originalFetch(resource, newConfig);
                })
                .catch((err) => {
                    return Promise.reject(err);
                });
        }

        // Start Refresh Process
        isRefreshing = true;
        const statusCode = response.status;
        console.log(`[Global Fetch] ${statusCode} detected. Attempting token refresh...`);

        try {
            const refreshToken = getRefreshToken();
            let username = getUserName();

            // Fallback 1: Try getting username from localStorage 'user' object
            if (!username) {
                try {
                    const u = JSON.parse(localStorage.getItem("user") || "{}");
                    username = u.username || u.email || "";
                } catch { }
            }

            // Fallback 2: Decode the expired token to find a username/sub
            if (!username) {
                // Try to get token from header if available, else localStorage
                // Note: Headers might be headers object or Headers instance
                let currentToken = getToken();
                if (!currentToken && requestConfig?.headers) {
                    if (requestConfig.headers instanceof Headers) {
                        const auth = requestConfig.headers.get("Authorization");
                        if (auth) currentToken = auth.replace("Bearer ", "");
                    } else if (requestConfig.headers["Authorization"]) {
                        currentToken = requestConfig.headers["Authorization"].replace("Bearer ", "");
                    }
                }

                if (currentToken) {
                    try {
                        const parts = currentToken.split('.');
                        if (parts.length === 3) {
                            const payload = JSON.parse(atob(parts[1]));
                            username = payload.username || payload['cognito:username'] || payload.sub;
                        }
                    } catch { }
                }
            }

            if (!refreshToken || !username) {
                console.error("[Global Fetch] Missing refresh token or username. Cannot refresh. Logging out.");
                processQueue(new Error("Cannot refresh: missing credentials"), null);
                isRefreshing = false;
                clearAuth();
                return response;
            }

            console.log(`[Global Fetch] Refreshing session for user: ${username}`);

            const { idToken, refreshToken: newRefresh } = await cognitoRefreshSession({
                username,
                refreshToken,
            });

            console.log("[Global Fetch] Token refresh successful!");

            // Update LocalStorage
            localStorage.setItem("access_token", idToken);
            if (newRefresh) {
                localStorage.setItem("refresh_token", newRefresh);
            }

            // Process Queue
            processQueue(null, idToken);
            isRefreshing = false;

            //  Retry original request with new token
            const newConfig = { ...requestConfig, headers: { ...requestConfig?.headers } };
            newConfig.headers["Authorization"] = `Bearer ${idToken}`;
            const retryResponse = await originalFetch(resource, newConfig);

            //  Check retry response
            // 401 after refresh = token still bad (user suspended/locked)
            // 403 after refresh = permission denied for this resource (not a token issue)
            if (retryResponse.status === 401) {
                console.error("[Global Fetch] Retry still failed with 401 after refresh. User likely suspended or token invalid.");
                clearAuth();
            } else if (retryResponse.status === 403) {
                console.warn("[Global Fetch] Retry returned 403 after refresh. User lacks permission for this resource.");
                // Cache the forbidden result to prevent repeated calls
                cacheForbidden(url);
            }

            return retryResponse;

        } catch (refreshError) {
            console.error("[Global Fetch] Token refresh failed:", refreshError);
            processQueue(refreshError, null);
            isRefreshing = false;
            clearAuth(); // Log out user
            // window.location.href = "/signin";
            return response; // Return the original error response
        }
    }

    return response;
};

console.log("[Auth] Global fetch interceptor installed.");
