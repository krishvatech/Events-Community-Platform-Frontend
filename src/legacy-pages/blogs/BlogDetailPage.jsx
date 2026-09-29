import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Box, Button, Chip, Skeleton, Stack, Typography } from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import { Helmet } from "react-helmet-async";
import { Link as RouterLink, useLocation, useParams } from "#navigation";
import BlogArticleContent from "../../components/blogs/BlogArticleContent.jsx";
import BlogFeaturedImage from "../../components/blogs/BlogFeaturedImage.jsx";
import blogApi from "../../services/blogApi";
import { BLOGS_PATH } from "../../config/blogNavigation";
import { formatBlogDate, getBlogAuthorName, getBlogSeoMeta } from "../../utils/blogContent";
import { BLOG_BORDER, BLOG_MUTED, BLOG_NAVY, BLOG_PAGE_BG, BLOG_TEAL } from "../../components/blogs/blogTheme";

// Fetch the next chunk of the article this far before the reader reaches it.
export const CONTENT_CHUNK_ROOT_MARGIN = "0px 0px 800px 0px";

/**
 * Presentational article view. Also used by the superuser draft preview, which
 * feeds it admin API data (complete `content_html`) instead of the reader API.
 *
 * The reader passes `contentChunks` (the parts of the same article loaded so
 * far) and a `contentFooter` (lazy-loading sentinel/status); tags are shown
 * once the article is `complete`.
 */
export function BlogArticleView({
  post,
  backTo = BLOGS_PATH,
  backLabel = "All blogs",
  banner = null,
  contentChunks = null,
  contentFooter = null,
  complete = true,
}) {
  const author = getBlogAuthorName(post);
  const date = formatBlogDate(post.published_at);
  const categories = post.categories || [];
  const tags = post.tags || [];
  const chunks = contentChunks || [post.content_html];

  return (
    <Box component="article" sx={{ maxWidth: 820, mx: "auto" }}>
      {backTo && (
        <Button
          component={RouterLink}
          to={backTo}
          startIcon={<ArrowBackRoundedIcon />}
          sx={{ textTransform: "none", color: BLOG_MUTED, mb: 2, px: 0 }}
        >
          {backLabel}
        </Button>
      )}
      {banner}

      {categories.length > 0 && (
        <Stack direction="row" useFlexGap flexWrap="wrap" spacing={0.75} sx={{ mb: 1.5 }}>
          {categories.map((c) => (
            <Chip
              key={c.id}
              label={c.name}
              size="small"
              component={RouterLink}
              to={`${BLOGS_PATH}?category=${encodeURIComponent(c.slug)}`}
              clickable
              sx={{ bgcolor: "#E8F7F7", color: BLOG_TEAL, fontWeight: 700 }}
            />
          ))}
        </Stack>
      )}

      <Typography
        variant="h3"
        component="h1"
        sx={{ fontWeight: 800, color: BLOG_NAVY, fontSize: { xs: 28, md: 38 }, lineHeight: 1.2, overflowWrap: "anywhere" }}
      >
        {post.title}
      </Typography>

      {(author || date) && (
        <Typography sx={{ color: BLOG_MUTED, mt: 1.5, fontSize: 14 }}>
          {author && <span data-testid="blog-detail-author">By {author}</span>}
          {author && date && " · "}
          {date && <time dateTime={post.published_at}>{date}</time>}
        </Typography>
      )}

      {post.excerpt && (
        <Typography sx={{ color: "#4b5563", fontSize: { xs: 17, md: 19 }, mt: 2, lineHeight: 1.6 }}>
          {post.excerpt}
        </Typography>
      )}

      {post.featured_image && (
        <BlogFeaturedImage
          src={post.featured_image}
          alt={post.title}
          loading="eager"
          sx={{ mt: 3, borderRadius: "14px" }}
        />
      )}

      <Box sx={{ mt: 3 }}>
        {chunks.map((html, index) => (
          <BlogArticleContent key={index} html={html} continuation={index > 0} />
        ))}
      </Box>
      {contentFooter}

      {complete && tags.length > 0 && (
        <Stack
          direction="row"
          useFlexGap
          flexWrap="wrap"
          spacing={0.75}
          sx={{ mt: 4, pt: 3, borderTop: `1px solid ${BLOG_BORDER}` }}
          aria-label="Tags"
        >
          {tags.map((t) => (
            <Chip
              key={t.id}
              label={`#${t.name}`}
              size="small"
              variant="outlined"
              component={RouterLink}
              to={`${BLOGS_PATH}?tag=${encodeURIComponent(t.slug)}`}
              clickable
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}

/**
 * Lazy loading of ONE article's content. The detail request returns only the
 * first chunk; later chunks of the same Blog are fetched one at a time and
 * appended. Everything resets (and in-flight requests are cancelled) when the
 * article changes.
 */
function useArticleChunks(post) {
  const [chunks, setChunks] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [state, setState] = useState("idle"); // idle | loading | error
  const nextChunk = useRef(2);
  const inFlight = useRef(null);

  useEffect(() => {
    setChunks(post ? [post.content_html || ""] : []);
    setHasMore(Boolean(post?.content_has_more));
    setState("idle");
    nextChunk.current = (post?.content_chunk || 1) + 1;
    return () => {
      inFlight.current?.abort();
      inFlight.current = null;
    };
  }, [post]);

  const loadMore = useCallback(() => {
    if (!post || !hasMore || inFlight.current) return;
    const controller = new AbortController();
    const wanted = nextChunk.current;
    inFlight.current = controller;
    setState("loading");
    blogApi
      .getPublishedBlogChunk(post.slug, wanted, { signal: controller.signal })
      .then((part) => {
        if (controller.signal.aborted || part?.chunk !== wanted) return; // stale or out of order
        nextChunk.current = wanted + 1;
        setChunks((current) => [...current, part.content_html || ""]);
        setHasMore(Boolean(part.has_more));
        setState("idle");
      })
      .catch(() => {
        if (!controller.signal.aborted) setState("error");
      })
      .finally(() => {
        if (inFlight.current === controller) inFlight.current = null;
      });
  }, [post, hasMore]);

  return { chunks, hasMore, state, loadMore };
}

function ContentChunkSentinel({ active, state, onVisible, onRetry }) {
  const ref = useRef(null);
  const supported = typeof window !== "undefined" && "IntersectionObserver" in window;

  useEffect(() => {
    if (!supported || !active || state !== "idle" || !ref.current) return undefined;
    const observer = new window.IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect(); // one request per sentinel position
          onVisible();
        }
      },
      { rootMargin: CONTENT_CHUNK_ROOT_MARGIN }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [supported, active, state, onVisible]);

  if (!active) return null;
  return (
    <Box sx={{ mt: 2 }}>
      <div ref={ref} data-testid="content-chunk-sentinel" />
      {state === "loading" && (
        <Box role="status" aria-live="polite" data-testid="content-chunk-loading">
          <Typography sx={{ color: BLOG_MUTED, fontSize: 14, mb: 1 }}>Loading more…</Typography>
          <Skeleton variant="text" />
          <Skeleton variant="text" width="85%" />
        </Box>
      )}
      {state === "error" && (
        <Alert
          severity="warning"
          action={
            <Button color="inherit" size="small" onClick={onRetry}>
              Retry
            </Button>
          }
        >
          Couldn’t load more of this article.
        </Alert>
      )}
      {state === "idle" && !supported && (
        <Button onClick={onVisible} sx={{ textTransform: "none", color: BLOG_TEAL, fontWeight: 700 }}>
          Continue reading
        </Button>
      )}
    </Box>
  );
}

/**
 * A link to #section in a chunk that is not loaded yet keeps loading chunks
 * until the target exists, then scrolls to it (heading IDs are preserved).
 */
function useFragmentTarget(hash, content) {
  const done = useRef("");
  useEffect(() => {
    const id = decodeURIComponent((hash || "").replace(/^#/, ""));
    if (!id || done.current === `${id}:${content.chunks.length}` || content.state !== "idle") return;
    const target = document.getElementById(id);
    if (target) {
      done.current = `${id}:${content.chunks.length}`;
      target.scrollIntoView?.({ block: "start" });
    } else if (content.hasMore) {
      content.loadMore();
    }
  }, [hash, content]);
}

export default function BlogDetailPage() {
  const { slug } = useParams();
  const { hash } = useLocation();
  const [post, setPost] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ready | notfound | error
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const content = useArticleChunks(status === "ready" ? post : null);
  useFragmentTarget(hash, content);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    blogApi
      .getPublishedBlog(slug, { chunked: true })
      .then((data) => {
        if (cancelled) return;
        setPost(data);
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        // Drafts and missing slugs are indistinguishable by design.
        if (err.status === 404) {
          setStatus("notfound");
        } else {
          setError(err.message || "Unable to load this blog.");
          setStatus("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [slug, reloadKey]);

  const seo = post ? getBlogSeoMeta(post, window.location.origin) : null;

  return (
    <Box sx={{ width: "100%", py: { xs: 2, md: 4 }, bgcolor: BLOG_PAGE_BG, minHeight: "100vh" }}>
      <Box sx={{ px: { xs: 2, md: 3 } }}>
        {status === "loading" && (
          <Box sx={{ maxWidth: 820, mx: "auto" }} aria-busy="true" aria-label="Loading blog">
            <Skeleton variant="text" height={56} width="90%" />
            <Skeleton variant="text" width="40%" />
            <Skeleton variant="rectangular" sx={{ mt: 3, aspectRatio: "16 / 9", height: "auto", borderRadius: "14px" }} />
            <Skeleton variant="text" sx={{ mt: 3 }} />
            <Skeleton variant="text" />
            <Skeleton variant="text" width="80%" />
          </Box>
        )}

        {status === "notfound" && (
          <Box sx={{ maxWidth: 640, mx: "auto", textAlign: "center", py: 8 }}>
            <Helmet>
              <title>Blog not found</title>
            </Helmet>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 800, color: BLOG_NAVY, mb: 1 }}>
              Blog not found
            </Typography>
            <Typography sx={{ color: BLOG_MUTED, mb: 3 }}>
              This blog doesn’t exist or is no longer available.
            </Typography>
            <Button component={RouterLink} to={BLOGS_PATH} variant="contained" sx={{ textTransform: "none", bgcolor: BLOG_TEAL, "&:hover": { bgcolor: "#077B7E" } }}>
              Browse blogs
            </Button>
          </Box>
        )}

        {status === "error" && (
          <Box sx={{ maxWidth: 820, mx: "auto" }}>
            <Alert
              severity="error"
              action={
                <Button color="inherit" size="small" onClick={() => setReloadKey((k) => k + 1)}>
                  Retry
                </Button>
              }
            >
              {error}
            </Alert>
          </Box>
        )}

        {status === "ready" && post && (
          <>
            <Helmet>
              <title>{seo.title}</title>
              {seo.description && <meta name="description" content={seo.description} />}
              {seo.canonical && <link rel="canonical" href={seo.canonical} />}
              <meta property="og:title" content={seo.title} />
              {seo.description && <meta property="og:description" content={seo.description} />}
              {post.featured_image && <meta property="og:image" content={post.featured_image} />}
              <meta property="og:type" content="article" />
            </Helmet>
            <BlogArticleView
              post={post}
              contentChunks={content.chunks.length ? content.chunks : null}
              complete={!content.hasMore}
              contentFooter={
                <ContentChunkSentinel
                  active={content.hasMore}
                  state={content.state}
                  onVisible={content.loadMore}
                  onRetry={content.loadMore}
                />
              }
            />
          </>
        )}
      </Box>
    </Box>
  );
}
