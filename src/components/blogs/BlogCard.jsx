import React from "react";
import { Box, Button, Chip, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import BlogFeaturedImage from "./BlogFeaturedImage.jsx";
import { blogDetailPath } from "../../config/blogNavigation";
import { formatBlogDate, getBlogAuthorName } from "../../utils/blogContent";
import { BLOG_BORDER, BLOG_MUTED, BLOG_NAVY, BLOG_TEAL } from "./blogTheme";

const MAX_TERMS = 3;

export default function BlogCard({ post, onCategoryClick, onTagClick }) {
  const author = getBlogAuthorName(post);
  const date = formatBlogDate(post.published_at);
  const href = blogDetailPath(post.slug);
  const categories = (post.categories || []).slice(0, MAX_TERMS);
  const tags = (post.tags || []).slice(0, MAX_TERMS);

  return (
    <Box
      component="article"
      data-testid="blog-card"
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: "#fff",
        border: `1px solid ${BLOG_BORDER}`,
        borderRadius: "14px",
        overflow: "hidden",
      }}
    >
      <RouterLink to={href} tabIndex={-1} aria-hidden="true">
        <BlogFeaturedImage src={post.featured_image} alt={post.title} />
      </RouterLink>

      <Box sx={{ p: 2, display: "flex", flexDirection: "column", flexGrow: 1, gap: 1 }}>
        {categories.length > 0 && (
          <Stack direction="row" useFlexGap flexWrap="wrap" spacing={0.75}>
            {categories.map((category) => (
              <Chip
                key={category.id}
                label={category.name}
                size="small"
                onClick={onCategoryClick ? () => onCategoryClick(category) : undefined}
                sx={{ bgcolor: "#E8F7F7", color: BLOG_TEAL, fontWeight: 700, fontSize: 11 }}
              />
            ))}
          </Stack>
        )}

        <Typography
          component="h2"
          sx={{ fontSize: 18, fontWeight: 800, color: BLOG_NAVY, lineHeight: 1.3, overflowWrap: "anywhere" }}
        >
          <RouterLink to={href} style={{ color: "inherit", textDecoration: "none" }}>
            {post.title}
          </RouterLink>
        </Typography>

        {(author || date) && (
          <Typography sx={{ fontSize: 13, color: BLOG_MUTED }}>
            {author && <span data-testid="blog-card-author">{author}</span>}
            {author && date && " · "}
            {date && <time dateTime={post.published_at}>{date}</time>}
          </Typography>
        )}

        {post.excerpt && (
          <Typography
            sx={{
              fontSize: 14,
              color: "#374151",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {post.excerpt}
          </Typography>
        )}

        {tags.length > 0 && (
          <Stack direction="row" useFlexGap flexWrap="wrap" spacing={0.75}>
            {tags.map((tag) => (
              <Chip
                key={tag.id}
                label={`#${tag.name}`}
                size="small"
                variant="outlined"
                onClick={onTagClick ? () => onTagClick(tag) : undefined}
                sx={{ fontSize: 11 }}
              />
            ))}
          </Stack>
        )}

        <Box sx={{ mt: "auto", pt: 1 }}>
          <Button
            component={RouterLink}
            to={href}
            size="small"
            aria-label={`Read more: ${post.title}`}
            sx={{ textTransform: "none", fontWeight: 700, color: BLOG_TEAL, px: 0 }}
          >
            Read more →
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
