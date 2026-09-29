import React, { useEffect, useState } from "react";
import { Box } from "@mui/material";
import ArticleRoundedIcon from "@mui/icons-material/ArticleRounded";

/**
 * Featured image with a fixed aspect ratio (no layout shift) and a neutral
 * placeholder when the post has no image or the image fails to load.
 * `loading="eager"` is for the one image visible on first paint (the article
 * being opened); everything else stays lazy.
 */
export default function BlogFeaturedImage({ src, alt, ratio = "16 / 9", sx, loading = "lazy" }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [src]);

  const showImage = Boolean(src) && !failed;

  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        aspectRatio: ratio,
        bgcolor: "#EEF2F6",
        overflow: "hidden",
        ...sx,
      }}
    >
      {showImage ? (
        <Box
          component="img"
          src={src}
          alt={alt || ""}
          loading={loading}
          decoding="async"
          onError={() => setFailed(true)}
          sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      ) : (
        <Box
          role="img"
          aria-label={alt ? `${alt} (no image)` : "No image"}
          data-testid="blog-image-placeholder"
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#9AA8B8",
          }}
        >
          <ArticleRoundedIcon sx={{ fontSize: 48 }} />
        </Box>
      )}
    </Box>
  );
}
