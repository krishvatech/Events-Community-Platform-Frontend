import React, { useMemo } from "react";
import { Box } from "@mui/material";
import { sanitizeBlogHtml } from "../../utils/blogContent";
import { BLOG_NAVY, BLOG_TEAL } from "./blogTheme";

// Article typography scoped to this container only (emotion-generated class),
// so article HTML can never restyle the rest of ECP.
const articleSx = {
  color: "#1f2937",
  fontSize: { xs: 16, md: 17 },
  lineHeight: 1.75,
  overflowWrap: "anywhere",
  "& > :first-of-type": { mt: 0 },
  "& p": { my: 2 },
  "& h1, & h2, & h3, & h4, & h5, & h6": {
    color: BLOG_NAVY,
    fontWeight: 800,
    lineHeight: 1.3,
    mt: 4,
    mb: 1.5,
  },
  "& h1": { fontSize: { xs: 26, md: 30 } },
  "& h2": { fontSize: { xs: 22, md: 26 } },
  "& h3": { fontSize: { xs: 19, md: 21 } },
  "& h4, & h5, & h6": { fontSize: 17 },
  "& a": { color: BLOG_TEAL, textDecoration: "underline", textUnderlineOffset: "2px" },
  // The app's global CSS reset removes list markers; restore them here only.
  "& ul, & ol": { pl: 3, my: 2 },
  "& ul": { listStyleType: "disc" },
  "& ol": { listStyleType: "decimal" },
  "& li": { mb: 0.75 },
  "& img": { maxWidth: "100%", height: "auto", borderRadius: "8px", display: "block", my: 2 },
  "& figure": { mx: 0, my: 3 },
  "& figcaption": { fontSize: 13, color: "#6b7280", textAlign: "center", mt: 1 },
  "& blockquote": {
    borderLeft: `4px solid ${BLOG_TEAL}`,
    bgcolor: "#F3FAFA",
    m: 0,
    my: 3,
    px: 2.5,
    py: 1.5,
    color: "#374151",
    fontStyle: "italic",
  },
  "& pre": { bgcolor: "#f3f4f6", p: 2, borderRadius: "8px", overflowX: "auto", fontSize: 14 },
  "& code": { fontFamily: "monospace", fontSize: "0.9em" },
  "& hr": { border: 0, borderTop: "1px solid #e5e7eb", my: 4 },
  "& table": {
    display: "block",
    width: "100%",
    overflowX: "auto",
    borderCollapse: "collapse",
    my: 3,
    fontSize: 15,
  },
  "& th, & td": { border: "1px solid #e5e7eb", p: 1, textAlign: "left", verticalAlign: "top" },
  "& th": { bgcolor: "#f9fafb", fontWeight: 700 },
  "& .aligncenter": { mx: "auto", textAlign: "center" },
};

/** Renders Blog `content_html` after sanitisation. Never renders raw HTML. */
export default function BlogArticleContent({ html }) {
  const safeHtml = useMemo(() => sanitizeBlogHtml(html), [html]);
  return (
    <Box
      className="ecp-blog-article"
      data-testid="blog-article-content"
      sx={articleSx}
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
}
