import React from "react";
import { Box, Button, Chip, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "#navigation";
import BlogFeaturedImage from "./BlogFeaturedImage.jsx";
import { blogDetailPath } from "../../config/blogNavigation";
import { formatBlogDate, getBlogAuthorName } from "../../utils/blogContent";
import { BLOG_BORDER, BLOG_MUTED, BLOG_NAVY, BLOG_TEAL } from "./blogTheme";

const MAX_TERMS = 3;

/**
 * Blog card shared by Explore Blogs and My Blogs.
 *
 * Public (default): title/image/"Read more" link to the reader page.
 * Admin (`variant="admin"`): `href` overrides the link (preview for drafts),
 * `badges` renders above the title, the updated date is shown and `actions`
 * replaces "Read more". The card itself is never one big link, so action
 * buttons stay independent.
 */
export default function BlogCard({
  post,
  onCategoryClick,
  onTagClick,
  variant = "public",
  href: hrefOverride,
  badges = null,
  actions = null,
}) {
  const admin = variant === "admin";
  const author = getBlogAuthorName(post);
  const date = formatBlogDate(post.published_at);
  const updated = admin ? formatBlogDate(post.updated_at) : "";
  const href = hrefOverride || blogDetailPath(post.slug);
  const categories = (post.categories || []).slice(0, MAX_TERMS);
  const tags = (post.tags || []).slice(0, MAX_TERMS);

  return (
    <Box
      component="article"
      data-testid="blog-card"
      data-variant={variant}
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: "var(--imaa-dm-surface, #fff)",
        border: `1px solid ${BLOG_BORDER}`,
        borderRadius: admin ? "14px" : "var(--imaa-radius-card)",
        overflow: "hidden",
        minWidth: 0,
        boxShadow: admin ? "none" : "var(--imaa-shadow-sm)",
        transition: "border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease",
        ...(!admin && {
          "&:hover": { borderColor: BLOG_NAVY, boxShadow: "0 8px 20px rgba(27, 42, 74, 0.12)", transform: "translateY(-2px)" },
          "&:focus-within": { borderColor: BLOG_TEAL, boxShadow: "0 0 0 2px rgba(10, 147, 150, 0.18)" },
          "& h2 a:focus-visible": { outline: "2px solid", outlineColor: BLOG_TEAL, outlineOffset: 3, borderRadius: "2px" },
        }),
      }}
    >
      <RouterLink to={href} tabIndex={-1} aria-hidden="true">
        <BlogFeaturedImage src={post.featured_image} alt={post.title} />
      </RouterLink>

      <Box sx={{ p: { xs: 2, sm: 2.25 }, display: "flex", flexDirection: "column", flexGrow: 1, gap: 1 }}>
        {badges && (
          <Stack direction="row" useFlexGap flexWrap="wrap" spacing={0.75} data-testid="blog-card-badges">
            {badges}
          </Stack>
        )}
        {categories.length > 0 && (
          <Stack direction="row" useFlexGap flexWrap="wrap" spacing={0.75}>
            {categories.map((category) => (
              <Chip
                key={category.id}
                label={category.name}
                size="small"
                onClick={onCategoryClick ? () => onCategoryClick(category) : undefined}
                sx={{ bgcolor: "var(--imaa-dm-surface-alt, #E8F7F7)", color: BLOG_TEAL, fontWeight: 700, fontSize: 11 }}
              />
            ))}
          </Stack>
        )}

        <Typography
          component="h2"
          sx={{
            fontFamily: admin ? "inherit" : "var(--imaa-font-serif)",
            fontSize: 18,
            fontWeight: 800,
            color: BLOG_NAVY,
            lineHeight: 1.3,
            overflowWrap: "anywhere",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          <RouterLink to={href} style={{ color: "inherit", textDecoration: "none" }}>
            {post.title}
          </RouterLink>
        </Typography>

        {(author || date) && (
          <Typography sx={{ fontSize: 13, color: BLOG_MUTED, lineHeight: 1.5, overflowWrap: "anywhere" }}>
            {author && <span data-testid="blog-card-author">{author}</span>}
            {author && date && " · "}
            {date && <time dateTime={post.published_at}>{date}</time>}
          </Typography>
        )}
        {updated && (
          <Typography sx={{ fontSize: 12, color: BLOG_MUTED }} data-testid="blog-card-updated">
            Updated <time dateTime={post.updated_at}>{updated}</time>
          </Typography>
        )}

        {post.excerpt && (
          <Typography
            sx={{
              fontSize: 14,
              color: "var(--imaa-dm-text-2, #374151)",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              lineHeight: 1.6,
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

        <Box sx={{ mt: "auto", pt: 1.5, borderTop: admin ? "none" : "1px solid var(--imaa-bg-cool, #F0F4F5)" }}>
          {admin ? (
            <Stack direction="row" spacing={0.5} alignItems="center" data-testid="blog-card-actions">
              {actions}
            </Stack>
          ) : (
            <Button
              component={RouterLink}
              to={href}
              size="small"
              aria-label={`Read more: ${post.title}`}
              sx={{ textTransform: "none", fontWeight: 700, color: BLOG_TEAL, px: 0, minHeight: 40 }}
            >
              Read more →
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
}
