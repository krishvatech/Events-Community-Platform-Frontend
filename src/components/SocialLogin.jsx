import React from 'react';
import { FaGoogle, FaLinkedinIn } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { Box, Divider, Typography, Button } from '@mui/material';
import { randomString, pkceChallengeFromVerifier } from "../utils/pkce";
const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api').replace(/\/+$/, '');

const SocialLogin = () => {
  const COGNITO_DOMAIN = (import.meta.env.VITE_COGNITO_DOMAIN || "").replace(/\/+$/, "");
  const COGNITO_CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID || "";
  const COGNITO_REDIRECT_URI = import.meta.env.VITE_COGNITO_REDIRECT_URI || "http://localhost:5173/cognito/callback";

  const handleGoogle = async () => {
    try {
      const AUTH_PROVIDER = import.meta.env.VITE_AUTH_PROVIDER;

      // If Cognito config is present, use Cognito Hosted UI Google
      if (AUTH_PROVIDER === "cognito" && COGNITO_DOMAIN && COGNITO_CLIENT_ID) {
        const state = randomString(16);
        const verifier = randomString(48);
        const challenge = await pkceChallengeFromVerifier(verifier);

        sessionStorage.setItem(`pkce_verifier_${state}`, verifier);
        // ✅ store where user should land after login
        const intended =
          new URLSearchParams(window.location.search).get("next") ||
          window.location.pathname ||
          "/community";

        sessionStorage.setItem(`post_login_redirect_${state}`, intended);

        const params = new URLSearchParams({
          response_type: "code",
          client_id: COGNITO_CLIENT_ID,
          redirect_uri: COGNITO_REDIRECT_URI,
          scope: "openid email profile",
          state,
          code_challenge: challenge,
          code_challenge_method: "S256",
          identity_provider: "Google",
        });

        window.location.href = `${COGNITO_DOMAIN}/oauth2/authorize?${params.toString()}`;
        return;
      }

      // fallback (your existing backend social login)
      const res = await fetch(`${API_BASE}/auth/google/url/`, {
        method: "GET",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to start Google login");
      const data = await res.json();
      if (!data.authorization_url) throw new Error("No authorization_url from backend");
      window.location.href = data.authorization_url;
    } catch (err) {
      console.error(err);
      toast.error("❌ Could not start Google login. Please try again.");
    }
  };

  const handleLinkedIn = async () => {
    try {
      const AUTH_PROVIDER = import.meta.env.VITE_AUTH_PROVIDER;

      // Use Cognito Hosted UI LinkedIn (OIDC provider)
      if (AUTH_PROVIDER === "cognito" && COGNITO_DOMAIN && COGNITO_CLIENT_ID) {
        const state = randomString(16);
        const verifier = randomString(48);
        const challenge = await pkceChallengeFromVerifier(verifier);

        sessionStorage.setItem(`pkce_verifier_${state}`, verifier);

        // ✅ store where user should land after login
        const intended =
          new URLSearchParams(window.location.search).get("next") ||
          window.location.pathname ||
          "/community";

        sessionStorage.setItem(`post_login_redirect_${state}`, intended);

        const params = new URLSearchParams({
          response_type: "code",
          client_id: COGNITO_CLIENT_ID,
          redirect_uri: COGNITO_REDIRECT_URI,
          scope: "openid email profile",
          state,
          code_challenge: challenge,
          code_challenge_method: "S256",
          identity_provider: "LinkedIn", // must match AWS Provider name
        });

        window.location.href = `${COGNITO_DOMAIN}/oauth2/authorize?${params.toString()}`;
        return;
      }

      // fallback (your existing backend LinkedIn social login)
      const res = await fetch(`${API_BASE}/auth/linkedin/url/`, {
        method: "GET",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to start LinkedIn login");
      const data = await res.json();
      if (!data.authorization_url) throw new Error("No authorization_url from backend");
      window.location.href = data.authorization_url;
    } catch (err) {
      console.error(err);
      toast.error("❌ Could not start LinkedIn login. Please try again.");
    }
  };

  return (
    <Box sx={{ mt: 2 }}>
      {/* Just the text */}
      <Box sx={{ my: 2, textAlign: 'center' }}>
        <Typography
          variant="caption"
          sx={{ color: 'text.secondary', fontSize: 12 }}
        >
          OR CONTINUE WITH
        </Typography>
      </Box>

      {/* Buttons row */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<FaGoogle />}
          onClick={handleGoogle}
          sx={{
            textTransform: 'none',
            bgcolor: '#fff',
            color: 'black',
            borderColor: 'divider',
            '&:hover': { bgcolor: 'grey.50' },
          }}
        >
          Google
        </Button>

        <Button
          fullWidth
          variant="outlined"
          startIcon={<FaLinkedinIn />}
          onClick={handleLinkedIn}
          sx={{
            textTransform: 'none',
            bgcolor: '#fff',
            color: 'black',
            borderColor: 'divider',
            '&:hover': { bgcolor: 'grey.50' },
          }}
        >
          LinkedIn
        </Button>
      </Box>
    </Box>
  );
};

export default SocialLogin;
