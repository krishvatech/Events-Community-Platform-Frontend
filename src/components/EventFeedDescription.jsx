import React from "react";
import { Box, Button } from "@mui/material";
import EventDescription from "./EventDescription.jsx";

const PREVIEW_HEIGHT = 240;

export default function EventFeedDescription({ value }) {
  const [expanded, setExpanded] = React.useState(false);
  const [hasOverflow, setHasOverflow] = React.useState(false);
  const contentRef = React.useRef(null);
  const raw = String(value || "");
  React.useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const measure = () => setHasOverflow(content.scrollHeight > PREVIEW_HEIGHT + 1);
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(content);
    window.addEventListener("resize", measure);
    content.addEventListener("load", measure, true);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
      content.removeEventListener("load", measure, true);
    };
  }, [raw]);
  if (!raw.trim()) return null;

  return (
    <Box sx={{ mt: 1, width: "100%", minWidth: 0, maxWidth: "100%" }}>
      <Box sx={{ maxHeight: expanded ? "none" : PREVIEW_HEIGHT, overflow: "hidden", minWidth: 0, maxWidth: "100%" }}>
        <Box ref={contentRef} sx={{ minWidth: 0, maxWidth: "100%" }}>
          <EventDescription value={raw} sx={{ fontSize: "0.875rem", color: "text.primary", maxWidth: "100%" }} />
        </Box>
      </Box>
      {hasOverflow && (
        <Button size="small" variant="text" sx={{ mt: 0.5, px: 0 }} onClick={() => setExpanded(current => !current)}>
          {expanded ? "See less" : "See more"}
        </Button>
      )}
    </Box>
  );
}
