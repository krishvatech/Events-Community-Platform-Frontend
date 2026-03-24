import React, { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { saveLoginPayload } from "../utils/authStorage";
import { getCognitoGroupsFromTokens, getRoleAndRedirectPath } from "../utils/roleRedirect";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api").replace(/\/+$/, "");
const COGNITO_DOMAIN = (import.meta.env.VITE_COGNITO_DOMAIN || "").replace(/\/+$/, "");
const COGNITO_CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID || "";
const COGNITO_REDIRECT_URI = import.meta.env.VITE_COGNITO_REDIRECT_URI || "http://localhost:5173/cognito/callback";

// DEBUG: Log the config being used
console.log("🔧 Cognito Config:", {
  domain: COGNITO_DOMAIN,
  clientId: COGNITO_CLIENT_ID,
  redirectUri: COGNITO_REDIRECT_URI,
  apiBase: API_BASE,
});

const decodeJwtPayload = (token) => {
  try {
    const part = token.split(".")[1] || "";
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return {};
  }
};

const updateTimezone = async (accessToken) => {
  if (!accessToken) return;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  try {
    await fetch(`${API_BASE}/users/me/`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ profile: { timezone: tz } }),
    });
  } catch (e) {
    console.warn("Timezone update failed:", e);
  }
};

const CognitoOAuthCallback = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const didRunRef = useRef(false);

  useEffect(() => {
    if (didRunRef.current) return;
    didRunRef.current = true;

    // DEBUG: Log the full URL and all params
    console.log("📍 Current URL:", window.location.href);
    console.log("📍 Current pathname:", window.location.pathname);
    console.log("📍 Current search:", window.location.search);

    const code = params.get("code");
    const state = params.get("state");
    const error = params.get("error");
    const errorDescription = params.get("error_description");

    console.log("🔍 URL Parameters:", { code, state, error, errorDescription });

    // Check if user came from WordPress login (has higher priority)
    const wpRedirect = sessionStorage.getItem("post_wordpress_cognito_redirect");

    const redirectKey = `post_login_redirect_${state}`;
    const intended = wpRedirect || sessionStorage.getItem(redirectKey) || "/account/events";

    sessionStorage.removeItem(redirectKey);
    sessionStorage.removeItem("post_wordpress_cognito_redirect");

    if (error) {
      console.error("❌ Cognito error:", error, errorDescription);
      toast.error(`❌ Cognito error: ${error}`);
      navigate("/signin", { replace: true });
      return;
    }

    // ⚠️ Accept callback with code even if state is missing
    // (Google IdP integration sometimes doesn't return state)
    if (!code) {
      console.error("❌ Missing authorization code from Cognito");
      console.log("Available params:", {
        code: params.get("code"),
        state: params.get("state"),
        error: params.get("error"),
        allParams: Array.from(params.entries()),
      });
      toast.error("❌ Missing authorization code from Cognito.");
      navigate("/signin", { replace: true });
      return;
    }

    console.log("✅ Authorization code received:", code);

    // Use state if present, otherwise generate a temporary one
    let finalState = state;
    if (!state) {
      console.warn("⚠️ State parameter missing, generating temporary one");
      finalState = "temp_" + Math.random().toString(36).substr(2, 9);
    }

    // DEBUG: Log all sessionStorage
    console.log("📦 All sessionStorage keys at callback:", Object.keys(sessionStorage));
    console.log("📦 SessionStorage items:", Array.from({ length: sessionStorage.length }, (_, i) => {
      const key = sessionStorage.key(i);
      return { key, value: sessionStorage.getItem(key)?.substring?.(0, 30) + "..." };
    }));

    const verifierKey = `pkce_verifier_${finalState}`;
    let verifier = sessionStorage.getItem(verifierKey);
    console.log("🔍 Looking for verifier with key:", verifierKey, "Found:", !!verifier);

    // If no verifier for this state, try to find any stored verifier
    if (!verifier) {
      console.warn("⚠️ PKCE verifier not found for state, checking stored verifiers");
      // Get all items from sessionStorage
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key?.startsWith("pkce_verifier_")) {
          verifier = sessionStorage.getItem(key);
          console.log("✅ Found stored verifier:", key);
          sessionStorage.removeItem(key);
          break;
        }
      }
    }

    if (!verifier) {
      console.warn("⚠️ PKCE verifier missing - proceeding without PKCE (Google IdP limitation)");
      // Don't fail here - Google IdP doesn't always return state/verifier
    }

    (async () => {
      try {
        // 1) Exchange code -> tokens
        const tokenBody = {
          grant_type: "authorization_code",
          client_id: COGNITO_CLIENT_ID,
          code,
          redirect_uri: COGNITO_REDIRECT_URI,
        };

        // Only add code_verifier if we have it (PKCE)
        if (verifier) {
          tokenBody.code_verifier = verifier;
          console.log("✅ Using PKCE code_verifier");
        } else {
          console.log("⚠️ Skipping PKCE - verifier not available");
        }

        const body = new URLSearchParams(tokenBody);

        console.log("🔄 Exchanging authorization code for tokens...");
        const resp = await fetch(`${COGNITO_DOMAIN}/oauth2/token`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: body.toString(),
        });

        console.log("📡 Token exchange response status:", resp.status);
        const t = await resp.json().catch(() => null);
        console.log("📡 Token exchange response:", t?.access_token ? "✅ Got access token" : "❌ No access token", t?.error);

        if (!resp.ok || !t?.access_token) {
          console.error("❌ Token exchange failed:", resp.status, t);
          toast.error("❌ Cognito token exchange failed: " + (t?.error_description || t?.error || "Unknown error"));
          navigate("/signin", { replace: true });
          return;
        }

        sessionStorage.removeItem(verifierKey);

        const access = t.access_token;
        const refresh = t.refresh_token || "";
        const idToken = t.id_token || "";
        const backendJwt = idToken || access;
        // 2) Store tokens (same keys your app already uses)
        // ✅ Your app should use idToken for backend APIs
        localStorage.setItem("access_token", idToken || access);

        // keep the real access token separately (used for /userInfo etc.)
        localStorage.setItem("cognito_access_token", access);

        if (refresh) localStorage.setItem("refresh_token", refresh);
        if (idToken) localStorage.setItem("id_token", idToken);

        console.log("✅ Tokens stored successfully");

        await updateTimezone(backendJwt).catch(e => {
          console.warn("Timezone update failed:", e);
        });

        // 3) Bootstrap DB (store Google profile into DB, but DO NOT overwrite username)
        const claims = idToken ? decodeJwtPayload(idToken) : {};

        // Get reliable profile info from Cognito userInfo endpoint (works for Google federated users)
        let userInfo = {};
        try {
          const uiRes = await fetch(`${COGNITO_DOMAIN}/oauth2/userInfo`, {
            headers: { Authorization: `Bearer ${backendJwt}` },
          });
          if (uiRes.ok) userInfo = await uiRes.json().catch(() => ({}));
        } catch {
          console.warn("Could not fetch Cognito userInfo");
          userInfo = {};
        }

        // Prefer userInfo, fallback to idToken claims
        const email = (userInfo.email || claims.email || "").toLowerCase().trim();
        const firstName = userInfo.given_name || claims.given_name || "";
        const lastName = userInfo.family_name || claims.family_name || "";

        console.log("📧 User email:", email);

        // ✅ IMPORTANT: don't send username for Google login
        try {
          const bootstrapRes = await fetch(`${API_BASE}/auth/cognito/bootstrap/`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${backendJwt}`,
            },
            body: JSON.stringify({ email, firstName, lastName }),
          });
          console.log("✅ Bootstrap response:", bootstrapRes.status);
        } catch (err) {
          console.warn("Bootstrap call failed:", err);
        }

        // 4) Get backend user
        let backendUser = null;
        try {
          const meRes = await fetch(`${API_BASE}/auth/users/me/`, {
            headers: { Authorization: `Bearer ${backendJwt}` }, // backendJwt = idToken
          });
          if (meRes.ok) {
            backendUser = await meRes.json().catch(() => null);
            console.log("✅ Backend user fetched:", backendUser?.id);
          } else {
            console.warn("❌ /auth/users/me/ returned:", meRes.status);
          }
        } catch (err) {
          console.warn("Could not fetch backend user:", err);
        }

        localStorage.setItem("user", JSON.stringify(backendUser || claims || {}));
        saveLoginPayload(
          { access_token: backendJwt, refresh, user: backendUser || claims },
          { email, firstName }
        );

        // 5) Role redirect (same logic you already use)
        const cognitoGroups = getCognitoGroupsFromTokens(access);
        const { path } = getRoleAndRedirectPath({
          cognitoGroups,
          backendUser,
          defaultPath: "/account/events", // Changed to dashboard instead of account/profile
        });

        console.log("🎯 Redirecting to:", path);
        if (path === "/admin/events") window.location.replace(path);
        else navigate(path, { replace: true });
      } catch (e) {
        console.error("❌ Cognito callback error:", e);
        toast.error("❌ Could not finish Cognito social login.");
        navigate("/signin", { replace: true });
      }
    })();
  }, [navigate, params]);

  return (
    <div className="w-full h-screen flex items-center justify-center">
      <p style={{ color: "#555", fontSize: 14 }}>Completing sign-in…</p>
    </div>
  );
};

export default CognitoOAuthCallback;