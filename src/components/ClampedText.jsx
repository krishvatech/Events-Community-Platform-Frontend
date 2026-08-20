import * as React from "react";
import { Box, Button, Typography } from "@mui/material";

/**
 * Long text clamped to a few lines with a See more / See less toggle.
 *
 * Mirrors the ClampedText already used for post bodies in GroupManagePage so
 * the expand affordance looks the same everywhere. Group descriptions can run
 * to 2000 words, so summary panels stay scannable and expand on demand. The
 * toggle only renders when the text is actually taller than the clamp.
 */
export default function ClampedText({
  text = "",
  lines = 10,
  variant = "body2",
  className,
  sx = {},
}) {
  const [expanded, setExpanded] = React.useState(false);
  const [showToggle, setShowToggle] = React.useState(false);
  const ref = React.useRef(null);

  React.useLayoutEffect(() => {
    if (!ref.current || expanded) return;

    // Wait a frame so line-clamp styles apply before measuring
    const id = requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      setShowToggle(el.scrollHeight > el.clientHeight + 1);
    });

    return () => cancelAnimationFrame(id);
  }, [text, lines, expanded]);

  if (!text) return null;

  return (
    <Box sx={{ ...sx }}>
      <Typography
        ref={ref}
        variant={variant}
        className={className}
        sx={{
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          ...(expanded
            ? {}
            : {
              display: "-webkit-box",
              WebkitLineClamp: lines,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }),
        }}
      >
        {text}
      </Typography>

      {showToggle && (
        <Button
          size="small"
          onClick={() => setExpanded((v) => !v)}
          sx={{ textTransform: "none", px: 0, mt: 0.5, color: "#0ea5a4" }}
        >
          {expanded ? "See less" : "See more"}
        </Button>
      )}
    </Box>
  );
}
