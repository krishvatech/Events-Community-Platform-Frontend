import React, { useEffect, useState } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { randomString, pkceChallengeFromVerifier } from "../utils/pkce";

const DEFAULT_NEXT_PATH = "/community/mygroups";

const getStoredAccessToken = () => localStorage.getItem("access_token");

const isAlreadyAuthenticated = () => {
  if (localStorage.getItem("is_guest") === "true") return false;
  return Boolean(getStoredAccessToken());
};

const normalizeLegacyNextPath = (path) => {
  if (path === "/my-groups") return "/community/mygroups";
  if (path === "/messages") return "/community?view=messages";
  if (path === "/forum") return "/community?view=forum";
  return path;
};

const getSafeNextPath = (value) => {
  if (!value) return DEFAULT_NEXT_PATH;

  try {
    const decoded = decodeURIComponent(value).trim();

    // Allow only internal app paths. This prevents open redirects to other websites.
    if (!decoded.startsWith("/") || decoded.startsWith("//")) {
      return DEFAULT_NEXT_PATH;
    }

    return normalizeLegacyNextPath(decoded);
  } catch {
    return DEFAULT_NEXT_PATH;
  }
};

export default function ImaaSsoRedirect() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Redirecting to IMAA login…");

  useEffect(() => {
    let cancelled = false;

    const startImaaSso = async () => {
      const params = new URLSearchParams(window.location.search);
      const nextPath = getSafeNextPath(params.get("next"));

      if (isAlreadyAuthenticated()) {
        navigate(nextPath, { replace: true });
        return;
      }

      const cognitoDomain = (import.meta.env.VITE_COGNITO_DOMAIN || "").replace(/\/+$/, "");
      const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID || "";
      const redirectUri =
        import.meta.env.VITE_COGNITO_REDIRECT_URI || `${window.location.origin}/cognito/callback`;
      const idpName = import.meta.env.VITE_COGNITO_IMAA_IDP_NAME || "IMAAWordPressOAuth";

      if (!cognitoDomain || !clientId || !redirectUri) {
        console.error("Missing Cognito environment variables for IMAA SSO redirect");
        if (!cancelled) {
          setMessage("IMAA login is not configured. Please use the normal sign-in page.");
          navigate("/signin", { replace: true });
        }
        return;
      }

      // Same OAuth/PKCE flow as the existing Continue with IMAA button.
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("id_token");
      localStorage.removeItem("user");
      sessionStorage.removeItem("post_wordpress_cognito_redirect");
      localStorage.removeItem("post_wordpress_cognito_redirect");

      const state = randomString(16);
      const verifier = randomString(48);
      const challenge = await pkceChallengeFromVerifier(verifier);

      sessionStorage.setItem(`pkce_verifier_${state}`, verifier);
      localStorage.setItem(`pkce_verifier_${state}`, verifier);
      sessionStorage.setItem(`post_login_redirect_${state}`, nextPath);
      localStorage.setItem(`post_login_redirect_${state}`, nextPath);

      const authParams = new URLSearchParams({
        response_type: "code",
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: "openid email profile",
        state,
        code_challenge: challenge,
        code_challenge_method: "S256",
        identity_provider: idpName,
      });

      window.location.href = `${cognitoDomain}/oauth2/authorize?${authParams.toString()}`;
    };

    startImaaSso().catch((error) => {
      console.error("Failed to start IMAA SSO redirect", error);
      if (!cancelled) {
        setMessage("Could not start IMAA login. Please use the normal sign-in page.");
        navigate("/signin", { replace: true });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        px: 3,
        textAlign: "center",
      }}
    >
      <CircularProgress size={28} />
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
    </Box>
  );
}
