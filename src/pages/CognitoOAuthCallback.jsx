import React, { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { saveLoginPayload } from "../utils/authStorage";
import { getCognitoGroupsFromTokens, getRoleAndRedirectPath } from "../utils/roleRedirect";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api").replace(/\/+$/, "");
const COGNITO_DOMAIN = (import.meta.env.VITE_COGNITO_DOMAIN || "").replace(/\/+$/, "");
const COGNITO_CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID || "";
const COGNITO_REDIRECT_URI = import.meta.env.VITE_COGNITO_REDIRECT_URI || "http://localhost:5173/cognito/callback";

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
    const code = params.get("code");
    const state = params.get("state");

    const redirectKey = `post_login_redirect_${state}`;
    const intended = sessionStorage.getItem(redirectKey) || "/community";
    sessionStorage.removeItem(redirectKey);

    if (!code || !state) {
      toast.error("❌ Missing code/state from Cognito.");
      navigate("/signin", { replace: true });
      return;
    }

    const verifierKey = `pkce_verifier_${state}`;
    const verifier = sessionStorage.getItem(verifierKey);
    // sessionStorage.removeItem(verifierKey);

    if (!verifier) {
      toast.error("❌ PKCE verifier missing (try login again).");
      navigate("/signin", { replace: true });
      return;
    }

    (async () => {
      try {
        // 1) Exchange code -> tokens
        const body = new URLSearchParams({
          grant_type: "authorization_code",
          client_id: COGNITO_CLIENT_ID,
          code,
          redirect_uri: COGNITO_REDIRECT_URI,
          code_verifier: verifier,
        });

        const resp = await fetch(`${COGNITO_DOMAIN}/oauth2/token`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: body.toString(),
        });

        const t = await resp.json().catch(() => null);
        if (!resp.ok || !t?.access_token) {
          console.error("Token exchange failed:", t);
          toast.error("❌ Cognito token exchange failed.");
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

        await updateTimezone(backendJwt);

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
          userInfo = {};
        }

        // Prefer userInfo, fallback to idToken claims
        const email = (userInfo.email || claims.email || "").toLowerCase().trim();
        const firstName = userInfo.given_name || claims.given_name || "";
        const lastName = userInfo.family_name || claims.family_name || "";

        // ✅ IMPORTANT: don't send username for Google login
        await fetch(`${API_BASE}/auth/cognito/bootstrap/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${backendJwt}`,
          },
          body: JSON.stringify({ email, firstName, lastName }),
        }).catch(() => null);

        // 4) Get backend user
        let backendUser = null;
        const meRes = await fetch(`${API_BASE}/auth/users/me/`, {
          headers: { Authorization: `Bearer ${backendJwt}` }, // backendJwt = idToken
        });
        if (meRes.ok) backendUser = await meRes.json().catch(() => null);

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
          defaultPath: intended,
        });

        if (path === "/admin/events") window.location.replace(path);
        else navigate(path, { replace: true });
      } catch (e) {
        console.error(e);
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
