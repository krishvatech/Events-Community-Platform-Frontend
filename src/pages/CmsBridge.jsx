import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.spinner} aria-hidden="true" />
        <div style={styles.title}>Opening CMS…</div>
        <div style={styles.subtitle}>
          Redirecting you to Wagtail. This usually takes a moment.
        </div>

        <div style={styles.hint}>
          If it doesn’t open, go back and try logging in again.
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: 24,
    background:
      "radial-gradient(1200px 600px at 10% 10%, rgba(108, 99, 255, 0.18), transparent 60%), radial-gradient(900px 500px at 90% 20%, rgba(163, 210, 202, 0.20), transparent 55%), #0b1020",
    color: "#e8eaf6",
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
  },
  card: {
    width: "min(520px, 100%)",
    padding: 28,
    borderRadius: 18,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.10)",
    boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
    backdropFilter: "blur(10px)",
    display: "grid",
    gap: 10,
    justifyItems: "center",
    textAlign: "center",
  },
  spinner: {
    width: 42,
    height: 42,
    borderRadius: "999px",
    border: "4px solid rgba(255,255,255,0.18)",
    borderTopColor: "rgba(255,255,255,0.95)",
    animation: "spin 0.9s linear infinite",
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.85,
    lineHeight: 1.45,
  },
  hint: {
    marginTop: 10,
    fontSize: 12,
    opacity: 0.7,
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
