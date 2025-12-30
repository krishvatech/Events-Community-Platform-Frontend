import React, { useEffect } from "react";
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
    const b64 = (token.split(".")[1] || "").replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(b64));
  } catch {
    return {};
  }
};

const CognitoOAuthCallback = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const code = params.get("code");
    const state = params.get("state");

    if (!code || !state) {
      toast.error("❌ Missing code/state from Cognito.");
      navigate("/signin", { replace: true });
      return;
    }

    const verifierKey = `pkce_verifier_${state}`;
    const verifier = sessionStorage.getItem(verifierKey);
    sessionStorage.removeItem(verifierKey);

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

        const access = t.access_token;
        const refresh = t.refresh_token || "";
        const idToken = t.id_token || "";

        // 2) Store tokens (same keys your app already uses)
        localStorage.setItem("access_token", access);
        if (refresh) localStorage.setItem("refresh_token", refresh);
        if (idToken) localStorage.setItem("id_token", idToken);

        // 3) Bootstrap DB (same endpoint your signup confirm already calls)
        const claims = idToken ? decodeJwtPayload(idToken) : {};
        const email = (claims.email || "").toLowerCase().trim();
        const firstName = claims.given_name || "";
        const lastName = claims.family_name || "";
        const username = email ? email.split("@")[0] : "";

        await fetch(`${API_BASE}/auth/cognito/bootstrap/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${access}`,
          },
          body: JSON.stringify({ username, email, firstName, lastName }),
        }).catch(() => null);

        // 4) Get backend user
        let backendUser = null;
        const meRes = await fetch(`${API_BASE}/auth/users/me/`, {
          headers: { Authorization: `Bearer ${access}`, Accept: "application/json" },
        });
        if (meRes.ok) backendUser = await meRes.json().catch(() => null);

        localStorage.setItem("user", JSON.stringify(backendUser || claims || {}));
        saveLoginPayload({ access, refresh, user: backendUser || claims }, { email, firstName });

        // 5) Role redirect (same logic you already use)
        const cognitoGroups = getCognitoGroupsFromTokens(access);
        const { path } = getRoleAndRedirectPath({
          cognitoGroups,
          backendUser,
          defaultPath: "/events",
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
