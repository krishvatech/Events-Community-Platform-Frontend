// src/components/AccountHero.jsx
import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { Avatar, Box, Button, Container } from "@mui/material";

/** Decode a JWT without verifying (used as a fallback to guess first name) */
function decodeJwtNoVerify(token) {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(atob(payload));
    return json || null;
  } catch {
    return null;
  }
}
function toTitle(word) {
  if (!word) return word;
  return word.charAt(0).toUpperCase() + word.slice(1);
}
function looksLikeEmailOrHandle(s) {
  if (!s || typeof s !== "string") return false;
  const v = s.trim();
  return v.includes("@") || /\d/.test(v) || v.includes(".");
}

/**
 * Consistent account hero that shows the user's name from localStorage,
 * matching how your Account page derives it.
 *
 * Props:
 *  - title?    override text (defaults to computed full name)
 *  - subtitle? defaults to "Active just now • Welcome back"
 *  - actions?  custom right-side buttons (React node). If missing, defaults to Explore/Community.
 */
export default function AccountHero({ title, subtitle, actions }) {
  const { fullName, initial } = useMemo(() => {
    // Prefer user object from localStorage
    let user = null;
    try {
      user = JSON.parse(localStorage.getItem("user") || "null");
    } catch {}

    // First name token
    let firstNameToken = "";
    if (user && user.first_name && !looksLikeEmailOrHandle(user.first_name)) {
      firstNameToken = user.first_name.trim().split(" ")[0];
    } else {
      // Fallback to JWT claims
      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("access") ||
        localStorage.getItem("access_token") ||
        localStorage.getItem("jwt") ||
        "";
      const claims = token ? decodeJwtNoVerify(token) : null;
      const raw =
        (claims && (claims.given_name || claims.name || claims.preferred_username)) ||
        (user && user.name) ||
        "";
      firstNameToken = (raw || "").trim().split(" ")[0];
    }

    const first = toTitle(firstNameToken || "Member");
    const last = user && typeof user.last_name === "string" ? user.last_name.trim() : "";
    const full = [firstNameToken, last].filter(Boolean).join(" ").trim() || first;
    const init = (full || "M").trim().charAt(0).toUpperCase();
    return { fullName: full, initial: init };
  }, []);

  const heading = title || fullName; // << prints the user's name from localStorage
  const sub = subtitle || "Active just now • Welcome back";

  return (
    <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white">
      <Container maxWidth="lg" className="py-8 sm:py-10">
        <Box className="flex items-center gap-4">
          <Avatar sx={{ width: 72, height: 72, fontSize: 28, bgcolor: "#0ea5a4" }}>
            {initial}
          </Avatar>

          <div className="flex-1">
            <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight">{heading}</h1>
            <p className="text-slate-200 mt-1">{sub}</p>
          </div>

          <div className="hidden sm:flex gap-2">
            {actions ?? (
              <>
                <Button
                  component={Link}
                  to="/events"
                  variant="contained"
                  sx={{ textTransform: "none", backgroundColor: "#10b8a6", "&:hover": { backgroundColor: "#0ea5a4" } }}
                  className="rounded-xl px-4"
                >
                  Explore events
                </Button>
                <Button
                  component={Link}
                  to="/community"
                  variant="outlined"
                  sx={{ textTransform: "none", borderColor: "rgba(255,255,255,0.35)", color: "white", "&:hover": { borderColor: "white" } }}
                  className="rounded-xl px-4"
                >
                  Join Community
                </Button>
              </>
            )}
          </div>
        </Box>
      </Container>
    </div>
  );
}