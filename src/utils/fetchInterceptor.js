import { cognitoRefreshSession } from "./cognitoAuth";
import { getRefreshToken, getToken } from "./api";
import { getUserName, clearAuth } from "./authStorage";

// Store original fetch
const originalFetch = window.fetch;

let isRefreshing = false;
let failedQueue = [];

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

    // 1. Attempt original request
    let response;
    try {
        response = await originalFetch(resource, config);
    } catch (error) {
        return Promise.reject(error);
    }

    // 2. Check for 401 (Unauthorized Token) or 403 (Forbidden - might be expired token or actual ban).
    // We attempt refresh for both statuses. If 403 persists after refresh, it's a real ban.
    if (response.status === 401 || response.status === 403) {
        // Check if we are already refreshing
        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                failedQueue.push({ resolve, reject });
            })
                .then((newToken) => {
                    // Retry with new token
                    const newConfig = { ...config, headers: { ...config?.headers } };
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
                if (!currentToken && config?.headers) {
                    if (config.headers instanceof Headers) {
                        const auth = config.headers.get("Authorization");
                        if (auth) currentToken = auth.replace("Bearer ", "");
                    } else if (config.headers["Authorization"]) {
                        currentToken = config.headers["Authorization"].replace("Bearer ", "");
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
                console.error("[Global Fetch] Missing refresh token or username. Cannot refresh.");
                throw new Error("No refresh token or username");
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

            // Retry Original Request with new token
            const newConfig = { ...config, headers: { ...config?.headers } };
            newConfig.headers["Authorization"] = `Bearer ${idToken}`;
            const retryResponse = await originalFetch(resource, newConfig);

            // Check retry response
            if (retryResponse.status === 401) {
                // 401 after refresh = token is bad or user is suspended
                console.error("[Global Fetch] Retry failed with 401 after refresh. User likely suspended.");
                clearAuth();
            } else if (retryResponse.status === 403) {
                // 403 after refresh = permission denied for this specific resource, not a token issue
                // Keep user logged in and let frontend handle the permission error
                console.warn("[Global Fetch] Retry failed with 403 after refresh. User lacks permission for this resource.");
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
