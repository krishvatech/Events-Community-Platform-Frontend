import React from "react";
import { Box } from "@mui/material";
import DOMPurify from "dompurify";

const TAGS = ["p", "br", "strong", "em", "s", "h1", "h2", "h3", "h4", "ul", "ol", "li", "blockquote", "a", "img", "figure", "figcaption", "iframe", "table", "thead", "tbody", "tr", "th", "td"];
const ATTR = ["href", "src", "alt", "title", "class", "data-width", "colspan", "rowspan", "allowfullscreen"];

export function plainEventDescription(value = "") {
  const raw = String(value || "");
  if (typeof DOMParser === "undefined") return raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const clean = DOMPurify.sanitize(raw, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  return new DOMParser().parseFromString(clean, "text/html").body.textContent.replace(/\s+/g, " ").trim();
}

export default function EventDescription({ value, sx }) {
  const raw = String(value || "");
  if (!/<[a-z][\s\S]*>/i.test(raw)) return <Box sx={{ whiteSpace: "pre-wrap", ...sx }}>{raw}</Box>;
  const cleaned = DOMPurify.sanitize(raw, { ALLOWED_TAGS: TAGS, ALLOWED_ATTR: ATTR });
  const doc = new DOMParser().parseFromString(cleaned, "text/html");
  doc.querySelectorAll("a").forEach(link => {
    const href = link.getAttribute("href") || "";
    if (!/^(https?:\/\/|mailto:|\/(?!\/)|#[\w-]+$)/i.test(href)) link.removeAttribute("href");
    link.setAttribute("rel", "noopener noreferrer");
  });
  doc.querySelectorAll("img").forEach(img => { if (!/^(https:\/\/[^\s]+|\/media\/event-content\/[^\s]+|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/media\/event-content\/[^\s]+)$/i.test(img.getAttribute("src") || "")) img.remove(); });
  doc.querySelectorAll("figure").forEach(figure => {
    const width = Math.max(15, Math.min(100, Number(figure.getAttribute("data-width")) || 100));
    figure.style.width = `${width}%`;
    const align = ["left", "right"].find(item => figure.classList.contains(`event-content-image--${item}`)) || "center";
    figure.className = `event-content-image event-content-image--${align}`;
  });
  doc.querySelectorAll("iframe").forEach(frame => {
    try {
      const url = new URL(frame.getAttribute("src"));
      if (url.protocol !== "https:" || !["www.youtube-nocookie.com", "www.youtube.com", "player.vimeo.com"].includes(url.hostname) || !/^\/(embed|video)\//.test(url.pathname)) frame.remove();
    } catch { frame.remove(); }
  });
  return <Box sx={{ overflowWrap: "anywhere", overflowX: "auto", "& strong, & b": { fontWeight: 700 }, "& em, & i": { fontStyle: "italic" }, "& a": { color: "primary.dark" }, "& img, & iframe": { maxWidth: "100%" }, "& figure": { maxWidth: "100%", my: 2 }, "& .event-content-image--center": { mx: "auto" }, "& .event-content-image--right": { ml: "auto" }, "& figcaption": { color: "text.secondary", fontSize: 14, textAlign: "center", mt: 1 }, "& iframe": { width: "100%", aspectRatio: "16 / 9", border: 0 }, "& table": { display: "block", overflowX: "auto", borderCollapse: "collapse" }, "& td, & th": { border: "1px solid #aaa", p: 1 }, "& .event-cta": { display: "inline-flex", bgcolor: "primary.main", color: "white", px: 2.5, py: 1.25, borderRadius: 1.5, textDecoration: "none", fontWeight: 700 }, ...sx }} dangerouslySetInnerHTML={{ __html: doc.body.innerHTML }} />;
}
