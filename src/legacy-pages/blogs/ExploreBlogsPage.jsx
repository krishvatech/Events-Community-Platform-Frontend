import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
  InputAdornment,
  LinearProgress,
  Pagination,
  Skeleton,
  Stack,
  TextField,
} from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { useSearchParams } from "#navigation";
import BlogCard from "../../components/blogs/BlogCard.jsx";
import useDebouncedValue from "../../hooks/useDebouncedValue";
import blogApi from "../../services/blogApi";
import { BLOG_CARD_PAGE_SIZE, totalPagesFor } from "../../services/blogService";
import { BLOG_BORDER, BLOG_PAGE_BG, BLOG_TEAL } from "../../components/blogs/blogTheme";
import PageHeader from "../../components/page/PageHeader.jsx";
import EmptyState from "../../components/page/EmptyState.jsx";

function BlogCardSkeleton() {
  return (
    <Box sx={{ border: `1px solid ${BLOG_BORDER}`, borderRadius: 2, overflow: "hidden", bgcolor: "#fff" }}>
      <Skeleton variant="rectangular" sx={{ aspectRatio: "16 / 9", height: "auto" }} />
      <Box sx={{ p: 2 }}>
        <Skeleton variant="text" height={28} width="85%" />
        <Skeleton variant="text" width="45%" />
        <Skeleton variant="text" width="95%" />
        <Skeleton variant="text" width="80%" />
      </Box>
    </Box>
  );
}

const readPage = (params) => Math.max(1, parseInt(params.get("page") || "1", 10) || 1);

export default function ExploreBlogsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";
  const tag = searchParams.get("tag") || "";
  const page = readPage(searchParams);

  const [searchInput, setSearchInput] = useState(search);
  const debouncedSearch = useDebouncedValue(searchInput, 350);

  const [data, setData] = useState(null); // last successful page
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [termNames, setTermNames] = useState({}); // "category:slug" -> name
  const resultsRef = useRef(null);

  // Any param change resets to page 1 unless the page itself is being set.
  const updateParams = useCallback(
    (changes) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          Object.entries(changes).forEach(([key, value]) => {
            if (value) next.set(key, String(value));
            else next.delete(key);
          });
          if (!("page" in changes)) next.delete("page");
          return next;
        },
        { replace: !("page" in changes) }
      );
    },
    [setSearchParams]
  );

  useEffect(() => {
    if (debouncedSearch.trim() !== search) updateParams({ search: debouncedSearch.trim() });
  }, [debouncedSearch, search, updateParams]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    blogApi
      .listPublishedBlogs({ page, search, category, tag })
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setTermNames((prev) => {
          const next = { ...prev };
          result.results.forEach((post) => {
            (post.categories || []).forEach((c) => { next[`category:${c.slug}`] = c.name; });
            (post.tags || []).forEach((t) => { next[`tag:${t.slug}`] = t.name; });
          });
          return next;
        });
      })
      .catch((err) => {
        if (cancelled) return;
        if (err.status === 404 && page > 1) {
          updateParams({ page: "" }); // page no longer exists (e.g. after a filter change)
          return;
        }
        setError(err.message || "Unable to load blogs.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, search, category, tag, reloadKey, updateParams]);

  const posts = data?.results || [];
  const totalPages = totalPagesFor(data?.count, BLOG_CARD_PAGE_SIZE);
  const hasFilters = Boolean(search || category || tag);

  const activeFilters = useMemo(
    () =>
      [
        category && { key: "category", label: `Category: ${termNames[`category:${category}`] || category}` },
        tag && { key: "tag", label: `Tag: ${termNames[`tag:${tag}`] || tag}` },
      ].filter(Boolean),
    [category, tag, termNames]
  );

  const clearAll = () => {
    setSearchInput("");
    setSearchParams({}, { replace: true });
  };

  return (
    <Box sx={{ width: "100%", minWidth: 0, maxWidth: "100%", overflow: "hidden", py: { xs: 2, md: 3 }, bgcolor: BLOG_PAGE_BG, minHeight: "100vh" }}>
      <Box sx={{ px: { xs: 2, md: 2.5, lg: 3 }, maxWidth: { xs: "100%", lg: "1200px" }, mx: "auto", minWidth: 0 }}>
        <PageHeader
          eyebrow="Explore"
          title="Blogs"
          subtitle="Explore articles and insights from the community."
          sx={{ mb: 3, pt: 1 }}
        />

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          alignItems={{ xs: "stretch", sm: "center" }}
          sx={{ mb: 2 }}
        >
          <TextField
            size="small"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            label="Search blogs"
            placeholder="Search blogs"
            inputProps={{ "aria-label": "Search blogs" }}
            sx={{ bgcolor: "#fff", minWidth: { sm: 320 } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          {activeFilters.map((filter) => (
            <Chip
              key={filter.key}
              label={filter.label}
              onDelete={() => updateParams({ [filter.key]: "" })}
              sx={{ alignSelf: { xs: "flex-start", sm: "center" } }}
            />
          ))}
        </Stack>

        <Box ref={resultsRef} sx={{ minHeight: 4, mb: 1, scrollMarginTop: 80 }}>
          {loading && data && <LinearProgress aria-label="Loading blogs" />}
        </Box>

        {error ? (
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
        ) : loading && !data ? (
          <Grid container spacing={2.5} aria-busy="true" aria-label="Loading blogs">
            {Array.from({ length: BLOG_CARD_PAGE_SIZE }).map((_, i) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
                <BlogCardSkeleton />
              </Grid>
            ))}
          </Grid>
        ) : posts.length === 0 ? (
          <EmptyState
            title={hasFilters ? "No blogs match your search." : "No blogs have been published yet."}
            action={hasFilters ? (
              <Button onClick={clearAll} sx={{ textTransform: "none", color: BLOG_TEAL, fontWeight: 700 }}>
                Clear search and filters
              </Button>
            ) : null}
          />
        ) : (
          <Grid container spacing={2.5} data-testid="blog-grid">
            {posts.map((post) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={post.id}>
                <BlogCard
                  post={post}
                  onCategoryClick={(c) => updateParams({ category: c.slug })}
                  onTagClick={(t) => updateParams({ tag: t.slug })}
                />
              </Grid>
            ))}
          </Grid>
        )}

        {!error && totalPages > 1 && (
          <Stack sx={{ mt: 4, alignItems: "center" }}>
            <Pagination
              count={totalPages}
              page={Math.min(page, totalPages)}
              onChange={(_e, value) => {
                updateParams({ page: value > 1 ? value : "" });
                resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              color="primary"
              disabled={loading}
            />
          </Stack>
        )}
      </Box>
    </Box>
  );
}
