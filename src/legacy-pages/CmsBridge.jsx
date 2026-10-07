import React, { useEffect } from "react";
import { useNavigate } from "#navigation";
import { createWagtailSession } from "../utils/api";

export default function CmsBridge() {
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const cmsUrl = await createWagtailSession(); // sets sessionid
        window.location.href = cmsUrl;              // open wagtail
      } catch (e) {
        alert("CMS login failed. Please login again.");
        navigate("/admin");
      }
    })();
  }, [navigate]);

  return (
    <main style={styles.page} aria-live="polite">
      <div style={styles.card}>
        <div style={styles.spinner} aria-hidden="true" />
        <h1 style={styles.title}>Opening CMS…</h1>
        <div style={styles.subtitle}>
          Redirecting you to Wagtail. This usually takes a moment.
        </div>

        <div style={styles.hint}>
          If it doesn’t open, go back and try logging in again.
        </div>
      </div>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: "24px 16px",
    background: "#F5F7FA",
    color: "#1B2A4A",
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  },
  card: {
    width: "min(520px, 100%)",
    boxSizing: "border-box",
    padding: "32px 28px",
    borderRadius: 8,
    background: "#FFFFFF",
    border: "1px solid #DCE3EB",
    boxShadow: "0 8px 24px rgba(27, 42, 74, 0.10)",
    display: "grid",
    gap: 10,
    justifyItems: "center",
    textAlign: "center",
  },
  spinner: {
    width: 36,
    height: 36,
    borderRadius: "999px",
    border: "3px solid #DCE3EB",
    borderTopColor: "#0A9396",
    animation: "spin 0.9s linear infinite",
    marginBottom: 8,
  },
  title: {
    margin: 0,
    fontFamily: '"Source Serif 4", Georgia, serif',
    fontSize: "clamp(1.75rem, 5vw, 2rem)",
    fontWeight: 700,
    letterSpacing: "-0.01em",
    lineHeight: 1.2,
  },
  subtitle: {
    fontSize: 14,
    color: "#4B5A73",
    lineHeight: 1.45,
  },
  hint: {
    marginTop: 10,
    fontSize: 12,
    color: "#63708A",
    lineHeight: 1.45,
  },
};

// Inject keyframes (UI-only)
const styleTagId = "__cms_bridge_spinner_styles__";
if (typeof document !== "undefined" && !document.getElementById(styleTagId)) {
  const style = document.createElement("style");
  style.id = styleTagId;
  style.innerHTML = `
    @keyframes spin { to { transform: rotate(360deg); } }
  `;
  document.head.appendChild(style);
}
