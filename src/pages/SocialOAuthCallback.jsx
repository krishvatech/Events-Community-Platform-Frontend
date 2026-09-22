// src/pages/SocialOAuthCallback.jsx
import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { saveLoginPayload } from "../utils/authStorage";
import { getCognitoGroupsFromTokens, getRoleAndRedirectPath } from "../utils/roleRedirect";
import { getAccessToken } from "../utils/tokenStore";
import { establishMemberAuthSession } from "../utils/memberAuthSession";
import { isSecureAuthSessionEnabled } from "../utils/secureAuthSession";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api").replace(/\/+$/, "");

// Small helper: decode JWT payload
const decodeJwtPayload = (token) => {
  try {
    const b64 = (token.split(".")[1] || "").replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(b64));
  } catch {
    return null;
  }
};

const fetchJSON = async (url, headers = {}) => {
  try {
    const r = await fetch(url, { headers, credentials: "include" });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
};

const fetchWithManyAuthStyles = async (url, access) => {
  const headerSets = [
    { Authorization: `Bearer ${access}`, Accept: "application/json" },
  ];
  for (const h of headerSets) {
    const obj = await fetchJSON(url, h);
    if (obj) return obj;
  }
  return null;
};

const resolveBackendUser = async (access) => {
  if (!access) return null;
  const meCandidates = [
    `${API_BASE}/auth/users/me/`,
    `${API_BASE}/users/me/`,
    `${API_BASE}/auth/me/`,
    `${API_BASE}/me/`,
  ];

  for (const url of meCandidates) {
    const u = await fetchWithManyAuthStyles(url, access);
    if (u) return u;
  }

  return null;
};

const updateTimezone = async (accessToken) => {
  if (!accessToken) return;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  try {
    await fetch(`${API_BASE}/users/me/`, {
      method: "PATCH",
      body: JSON.stringify({ profile: { timezone: tz } }),
    },
      {
        url: `${API_BASE}/auth/users/me/`,
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

/**
 * Try to resolve current user using same strategy as SignInPage:
 * /auth/users/me/, /users/me/, /auth/me/, /me/, then fallback to JWT.
 */
const resolveCurrentUser = async (access, fallbackEmail) => {
  const meCandidates = [
    `${API_BASE}/auth/users/me/`,
    `${API_BASE}/users/me/`,
    `${API_BASE}/auth/me/`,
    `${API_BASE}/me/`,
  ];

  for (const url of meCandidates) {
    const u = await fetchWithManyAuthStyles(url, access);
    if (u) return u;
  }

  const payload = decodeJwtPayload(access);
  const uid = payload?.user_id || payload?.id;

  if (uid) {
    const byIdCandidates = [
      `${API_BASE}/users/${uid}/`,
      `${API_BASE}/auth/users/${uid}/`,
    ];
    for (const url of byIdCandidates) {
      const u = await fetchWithManyAuthStyles(url, access);
      if (u) return u;
    }
  }

  if (payload) return payload;

  const name = (fallbackEmail || "").split("@")[0] || "Member";
  return { first_name: name, email: fallbackEmail };
};

const SocialOAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    // This route belongs to the legacy direct Google/LinkedIn backend flow,
    // which returns SimpleJWT tokens. Secure-session mode deliberately accepts
    // Cognito credentials only, so fail cleanly instead of attempting to mix
    // authentication systems. SocialLogin routes secure-mode users through
    // Cognito Hosted UI and /cognito/callback instead.
    if (isSecureAuthSessionEnabled()) {
      toast.error("This social sign-in session has expired. Please sign in again.");
      navigate("/signin", { replace: true });
      return;
    }

    const access = searchParams.get("access");
    const refresh = searchParams.get("refresh");

    if (!access) {
      toast.error("❌ Missing access token from OAuth callback.");
      navigate("/signin");
      return;
    }

    (async () => {
      try {
        // Establish the member session using the same secure hand-off as the
        // primary Cognito callback. With the feature flag off, this preserves
        // the previous token-storage behaviour.
        const memberAccessToken = await establishMemberAuthSession({
          accessToken: access,
          idToken: access,
          refreshToken: refresh,
        });

        await updateTimezone(memberAccessToken);

        // Try to resolve user object
        const userObj = await resolveCurrentUser(memberAccessToken, null);
        localStorage.setItem("user", JSON.stringify(userObj || {}));

        // Save login payload (sessionStorage helpers)
        const payload = { access: memberAccessToken, access_token: memberAccessToken, refresh: "", user: userObj };
        saveLoginPayload(payload, { email: userObj?.email });

        const accessTokenForGroups = getAccessToken() || "";
        const cognitoGroups = getCognitoGroupsFromTokens(accessTokenForGroups);
        const backendUser = await resolveBackendUser(memberAccessToken);

        const { path } = getRoleAndRedirectPath({
          cognitoGroups,
          backendUser,
          defaultPath: "/account/profile",
        });

        if (path === "/admin/events") {
          window.location.replace(path);
        } else {
          navigate(path, { replace: true });
        }
      } catch (err) {
        console.error(err);
        toast.error("❌ Could not complete social login. Please sign in again.");
        navigate("/signin");
      }
    })();
  }, [navigate, searchParams]);

  return (
    <div className="w-full h-screen flex items-center justify-center">
      <p style={{ color: "#555", fontSize: 14 }}>Completing sign-in…</p>
    </div>
  );
};

export default SocialOAuthCallback;
