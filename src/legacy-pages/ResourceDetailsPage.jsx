// src/pages/ResourceDetailsPage.jsx

import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate, useLocation } from "#navigation";
import { isOwnerUser } from "../utils/adminRole";

import Container from "@mui/material/Container";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Skeleton from "@mui/material/Skeleton";

import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";
import MovieRoundedIcon from "@mui/icons-material/MovieRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import ArticleRoundedIcon from "@mui/icons-material/ArticleRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import { getAccessToken as getStoredAccessToken } from "../utils/tokenStore";
import EmptyState from "../components/page/EmptyState.jsx";

const TEAL = "var(--imaa-teal-hover)";
const API = (import.meta.env?.VITE_API_BASE_URL || "http://localhost:8000")
  .toString()
  .replace(/\/+$/, "");
const API_URL = API.endsWith("/api") ? API : `${API}/api`;

// --- ADD: Media URL helper (same idea as LiveFeedPage.jsx) ---
const API_ORIGIN = API_URL.replace(/\/api\/?$/i, "");

function toMediaUrl(p) {
  if (!p) return "";
  try { return new URL(p).toString(); } catch { }
  const rel = String(p).replace(/^\/+/, "");
  const keepAsIs = /^(media|static|uploads|images|files|storage)\//i.test(rel);
  return `${API_ORIGIN}/${keepAsIs ? rel : `media/${rel}`}`;
}

const safeUrlParts = (u) => {
  try {
    const x = new URL(u);
    return { pathname: x.pathname || "", href: x.toString() };
  } catch {
    const s = String(u || "");
    const noQ = s.split("?")[0].split("#")[0];
    return { pathname: noQ, href: s };
  }
};

const getExt = (u) => {
  const { pathname } = safeUrlParts(u);
  const last = (pathname || "").split("/").pop() || "";
  const dot = last.lastIndexOf(".");
  if (dot === -1) return "";
  return last.slice(dot + 1).toLowerCase();
};

const getFileName = (u) => {
  const { pathname } = safeUrlParts(u);
  const last = (pathname || "").split("/").pop() || "";
  return decodeURIComponent(last || "");
};

const TypeIcon = ({ type }) => {
  const common = { sx: { color: TEAL }, "aria-hidden": true };
  switch (type) {
    case "file":
      return <PictureAsPdfRoundedIcon {...common} />;
    case "video":
      return <MovieRoundedIcon {...common} />;
    case "link":
      return <LinkRoundedIcon {...common} />;
    default:
      return <ArticleRoundedIcon {...common} />;
  }
};

function ResourceDetailsSkeleton() {
  return (
    <>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Skeleton variant="text" width={120} />
        <Skeleton variant="text" width={260} />
      </Breadcrumbs>

      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3, md: 4 }, borderRadius: "var(--imaa-radius-card)", borderColor: "var(--imaa-border)" }}>
        {/* Header */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          alignItems={{ xs: "flex-start", sm: "center" }}
          justifyContent="space-between"
          sx={{ mb: 3 }}
        >
          <Stack
            direction="row"
            spacing={2}
            alignItems="flex-start"
            sx={{ flexGrow: 1, minWidth: 0 }}
          >
            <Skeleton variant="rounded" width={48} height={48} />
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Skeleton variant="text" height={44} width="70%" />
              <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: "wrap" }}>
                <Skeleton variant="rounded" width={64} height={24} />
                <Skeleton variant="rounded" width={86} height={24} />
              </Stack>
            </Box>
          </Stack>

          <Skeleton variant="rounded" width={76} height={32} />
        </Stack>

        <Divider sx={{ my: 3 }} />

        {/* Description */}
        <Box sx={{ mb: 3 }}>
          <Skeleton variant="text" width={120} height={30} />
          <Skeleton variant="text" width="92%" />
          <Skeleton variant="text" width="78%" />
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Details */}
        <Box sx={{ mb: 3 }}>
          <Skeleton variant="text" width={90} height={30} />
          <Stack spacing={1}>
            <Skeleton variant="text" width="55%" />
            <Skeleton variant="text" width="48%" />
          </Stack>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Buttons */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 1 }}>
          <Skeleton variant="rounded" width={160} height={40} />
          <Skeleton variant="rounded" width={140} height={40} />
        </Stack>
      </Paper>
    </>
  );
}

function ResourcePreview({ resource }) {
  if (!resource) return null;

  const type = (resource.type || "").toLowerCase();

  const fileUrl = toMediaUrl(resource.file || "");
  const videoUrl = toMediaUrl(resource.video_url || "");
  const linkUrl = resource.link_url || "";

  // youtube/vimeo helpers (same regex as LiveFeed)
  const ytId = (videoUrl || "").match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/)?.[1];
  const vmId = (videoUrl || "").match(/vimeo\.com\/(\d+)/)?.[1];
  const ytEmbed = ytId ? `https://www.youtube.com/embed/${ytId}` : null;
  const vmEmbed = vmId ? `https://player.vimeo.com/video/${vmId}` : null;
  const canIframe = !!(ytEmbed || vmEmbed);
  const iframeSrc = ytEmbed || vmEmbed;

  // file detection
  const fileExt = getExt(fileUrl);
  const fileName = getFileName(fileUrl) || resource.title || "Attachment";
  const isImageFile = ["jpg", "jpeg", "png", "webp", "gif", "bmp", "svg"].includes(fileExt);
  const isPdfFile = fileExt === "pdf";
  const hasFile = !!fileUrl;

  // --- VIDEO PREVIEW ---
  if (type === "video" && videoUrl) {
    return (
      <Box sx={{ mt: 1 }}>
        {canIframe ? (
          <Box
            component="iframe"
            src={iframeSrc}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            sx={{ width: "100%", height: { xs: 240, sm: 360, md: 420 }, border: 0, borderRadius: "var(--imaa-radius-card)", display: "block" }}
            title={resource.title || "Video"}
          />
        ) : (
          <Box
            component="video"
            src={videoUrl}
            controls
            preload="metadata"
            sx={{
              width: "100%",
              maxHeight: 520,
              borderRadius: "var(--imaa-radius-card)",
              border: "1px solid var(--imaa-border)",
            }}
          />
        )}
      </Box>
    );
  }

  // --- FILE PREVIEW (image/pdf/other) ---
  if (type === "file" && hasFile) {
    if (isImageFile) {
      return (
        <Box
          sx={{
            mt: 1,
            borderRadius: "var(--imaa-radius-card)",
            overflow: "hidden",
            border: "1px solid var(--imaa-border)",
            bgcolor: "background.paper",
          }}
        >
          <Box
            component="img"
            src={fileUrl}
            alt={resource.title || "resource image"}
            sx={{ width: "100%", maxHeight: 560, objectFit: "contain", display: "block" }}
          />
        </Box>
      );
    }

    if (isPdfFile) {
      return (
        <Box
          sx={{
            mt: 1,
            borderRadius: "var(--imaa-radius-card)",
            overflow: "hidden",
            border: "1px solid var(--imaa-border)",
            bgcolor: "background.paper",
          }}
        >
          <Box
            component="iframe"
            src={fileUrl}
            title={resource.title || "PDF"}
            sx={{ width: "100%", height: { xs: 420, md: 560 }, border: 0, display: "block" }}
          />
        </Box>
      );
    }

    // other file types -> attachment card
    return (
      <Paper
        variant="outlined"
        sx={{
          mt: 1,
          p: 1.25,
          borderRadius: "var(--imaa-radius-card)",
          borderColor: "var(--imaa-border)",
          bgcolor: "background.paper",
        }}
      >
        <Stack direction="row" spacing={1.25} alignItems="center">
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 1.5,
              bgcolor: "grey.100",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              color: "var(--imaa-teal-hover)",
            }}
          >
            📎
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
              {fileName}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {(fileExt || "FILE").toUpperCase()} · Attachment
            </Typography>
          </Box>

          <Chip size="small" label={(fileExt || "FILE").toUpperCase()} variant="outlined" />
        </Stack>
      </Paper>
    );
  }

  // --- LINK PREVIEW (simple card) ---
  if (type === "link" && linkUrl) {
    return (
      <Paper
        variant="outlined"
        sx={{
          mt: 1,
          p: 1.5,
          borderRadius: "var(--imaa-radius-card)",
          borderColor: "var(--imaa-border)",
          bgcolor: "background.paper",
        }}
      >
        <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "stretch", sm: "center" }} justifyContent="space-between" spacing={2}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
              {resource.title || "Link"}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
              {linkUrl}
            </Typography>
          </Box>

          <Button
            variant="outlined"
            size="small"
            startIcon={<OpenInNewRoundedIcon />}
            onClick={() => window.open(linkUrl, "_blank")}
            sx={{ flexShrink: 0, alignSelf: { sm: "center" } }}
          >
            Open
          </Button>
        </Stack>
      </Paper>
    );
  }

  return null;
}

export default function ResourceDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const refParam = searchParams.get("ref");

  const isUserOwner = isOwnerUser();
  const backLabel = isUserOwner && refParam !== "my_resources" ? "Admin Resources" : "My Resources";
  const backPath = isUserOwner && refParam !== "my_resources" ? "/admin/resources" : "/account/resources";
  // The user only asked for "back button set back button" similar to event page.
  // Event page had "Explore" vs "My Events".
  // Here we mostly have "My Resources".
  // But let's support the ref param if I added it.

  // If I added ?ref=my_resources in MyResourcesPage, I can use it.
  // But if I want to support Admin side later, I can add logic.
  // For now, I will blindly redirect to /account/resources OR respect ref.

  // const backPath = refParam === 'my_resources' ? '/account/resources' : '/account/resources'; 
  // It seems /account/resources is the main one. I'll stick to that for now unless ref says otherwise.


  const [resource, setResource] = useState(null);
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetchResource = async () => {
      setLoading(true);
      setError(null);

      try {
        const token = getStoredAccessToken();

        const resourceResponse = await fetch(`${API_URL}/content/resources/${id}/`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!resourceResponse.ok) throw new Error("Resource not found");

        const resourceData = await resourceResponse.json();
        if (cancelled) return;

        setResource(resourceData);

        if (resourceData?.event_id) {
          try {
            const eventResponse = await fetch(`${API_URL}/events/${resourceData.event_id}/`, {
              headers: { Authorization: `Bearer ${token}` },
            });

            if (!cancelled) {
              if (eventResponse.ok) {
                const eventData = await eventResponse.json();
                setEvent(eventData);
              } else {
                setEvent(null);
              }
            }
          } catch (err) {
            console.error("Error fetching event:", err);
            if (!cancelled) setEvent(null);
          }
        } else {
          setEvent(null);
        }
      } catch (err) {
        console.error("Error fetching resource:", err);
        if (!cancelled) {
          setError(err?.message || "Failed to load resource");
          setResource(null);
          setEvent(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (id) fetchResource();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleDownload = () => {
    if (!resource || resource.type !== "file") return;

    const downloadUrl = `${API_URL}/content/resources/${resource.id}/download/`;
    const token = getStoredAccessToken();

    fetch(downloadUrl, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => {
        if (!response.ok) throw new Error("Download failed");
        return response.blob();
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${resource.title || "resource"}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      })
      .catch((error) => {
        console.error("Download error:", error);
        alert("Failed to download file");
      });
  };

  const handleView = () => {
    if (!resource) return;

    let url;
    if (resource.type === "file") url = resource.file;
    else if (resource.type === "link") url = resource.link_url;
    else if (resource.type === "video") url = resource.video_url;

    if (url) window.open(url, "_blank");
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f7f8fa", width: "100%", minWidth: 0, overflow: "hidden" }}>
      <Container maxWidth="lg" sx={{ py: { xs: 2.5, sm: 3.5 }, px: { xs: 2, sm: 3 } }}>
        <div className="grid grid-cols-12 gap-3 md:gap-4">
          <main className="col-span-12">
            {loading ? (
              <ResourceDetailsSkeleton />
            ) : error || !resource ? (
              <EmptyState
                icon={<ArticleRoundedIcon />}
                title={error || "Resource not found"}
                titleComponent="h1"
                action={
                  <Button
                    variant="contained"
                    startIcon={<ArrowBackRoundedIcon />}
                    onClick={() => navigate(backPath)}
                  >
                    Back to resources
                  </Button>
                }
              />
            ) : (
              <>

                <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "flex-start", sm: "center" }} spacing={1} sx={{ mb: 2, minWidth: 0 }}>
                  <Button
                    startIcon={<ArrowBackRoundedIcon />}
                    component={Link}
                    to={backPath}
                    sx={{
                      textTransform: "none",
                      color: "text.primary",
                      fontWeight: 600,
                      minWidth: "auto",
                      px: 1,
                      "&:hover": { bgcolor: "var(--imaa-teal-light)" },
                      "&:focus-visible": { outline: "var(--imaa-focus-width) solid var(--imaa-focus-color)", outlineOffset: "var(--imaa-focus-offset)" },
                    }}
                  >
                    Back
                  </Button>
                  <Breadcrumbs separator="›" sx={{ minWidth: 0, maxWidth: "100%", '& .MuiBreadcrumbs-ol': { flexWrap: 'nowrap' } }}>
                    <Link to={backPath} style={{ textDecoration: "none", color: "var(--imaa-ink-body)" }}>
                      {backLabel}
                    </Link>
                    <Typography color="text.primary" noWrap sx={{ maxWidth: { xs: 210, sm: 420, md: 640 } }}>
                      {resource?.title || "Resource"}
                    </Typography>
                  </Breadcrumbs>
                </Stack>

                <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3, md: 4 }, borderRadius: "var(--imaa-radius-card)", borderColor: "var(--imaa-border)", boxShadow: "var(--imaa-shadow-sm)", minWidth: 0, overflow: "hidden" }}>
                  {/* TOP HEADER */}
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={2}
                    alignItems={{ xs: "flex-start", sm: "center" }}
                    justifyContent="space-between"
                    sx={{ mb: 3 }}
                  >
                    <Stack
                      direction="row"
                      spacing={2}
                      alignItems="flex-start"
                      sx={{ flexGrow: 1, minWidth: 0 }}
                    >
                      <Box sx={{ width: 48, height: 48, borderRadius: "var(--imaa-radius-card)", bgcolor: "var(--imaa-teal-light)", display: "grid", placeItems: "center", flexShrink: 0, '& svg': { fontSize: 30 } }}>
                        <TypeIcon type={resource.type} />
                      </Box>

                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Box
                          component="h1"
                          sx={{
                            m: 0,
                            mb: 1,
                            fontFamily: "var(--imaa-font-serif)",
                            fontWeight: 700,
                            fontSize: { xs: "1.5rem", sm: "1.75rem", md: "2rem" },
                            lineHeight: 1.2,
                            color: "var(--imaa-ink)",
                            overflowWrap: "anywhere",
                          }}
                        >
                          {resource.title}
                        </Box>

                        <Stack
                          direction="row"
                          spacing={1}
                          useFlexGap
                          sx={{ mb: 1, flexWrap: "wrap" }}
                        >
                          <Chip label={resource.type} size="small" variant="outlined" sx={{ textTransform: "capitalize" }} />
                          {resource.is_published ? (
                            <Chip label="Published" size="small" color="success" />
                          ) : (
                            <Chip label="Draft" size="small" color="default" />
                          )}
                        </Stack>
                      </Box>
                    </Stack>

                    <Box sx={{ mt: { xs: 1, sm: 0 } }}>
                      {/* Removed inner Back button */}
                    </Box>
                  </Stack>

                  <Divider sx={{ my: 3 }} />

                  <Box sx={{ mb: 3 }}>
                    <Typography component="h2" variant="h6" gutterBottom>
                      Description
                    </Typography>
                    <Typography
                      variant="body1"
                      color="text.secondary"
                      sx={{ maxWidth: "var(--imaa-prose-max)", whiteSpace: "pre-wrap", overflowWrap: "anywhere", lineHeight: 1.7 }}
                    >
                      {resource.description || "No description provided"}
                    </Typography>
                  </Box>

                  {/* ADD: Preview (video/file/image) */}
                  {(resource?.type === "video" || resource?.type === "file" || resource?.type === "link") && (
                    <>
                      <Divider sx={{ my: 3 }} />
                      <Box sx={{ mb: 3 }}>
                        <Typography component="h2" variant="h6" gutterBottom>
                          Preview
                        </Typography>
                        <ResourcePreview resource={resource} />
                      </Box>
                    </>
                  )}

                  {event && (
                    <>
                      <Divider sx={{ my: 3 }} />
                      <Box sx={{ mb: 3 }}>
                        <Typography component="h2" variant="h6" gutterBottom>
                          Event
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                          {event.title}
                        </Typography>
                      </Box>
                    </>
                  )}

                  {Array.isArray(resource.tags) && resource.tags.length > 0 && (
                    <>
                      <Divider sx={{ my: 3 }} />
                      <Box sx={{ mb: 3 }}>
                        <Typography component="h2" variant="h6" gutterBottom>
                          Tags
                        </Typography>
                        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                          {resource.tags.map((tag, idx) => (
                            <Chip
                              key={`${tag}-${idx}`}
                              label={tag}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                        </Stack>
                      </Box>
                    </>
                  )}

                  <Divider sx={{ my: 3 }} />

                  <Box sx={{ mb: 3 }}>
                    <Typography component="h2" variant="h6" gutterBottom>
                      Details
                    </Typography>
                    <Stack spacing={1} sx={{ overflowWrap: "anywhere" }}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Created:</strong>{" "}
                        {new Date(resource.created_at).toLocaleString("en-IN", {
                          dateStyle: "long",
                          timeStyle: "short",
                        })}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Last Updated:</strong>{" "}
                        {new Date(resource.updated_at).toLocaleString("en-IN", {
                          dateStyle: "long",
                          timeStyle: "short",
                        })}
                      </Typography>
                    </Stack>
                  </Box>

                  <Divider sx={{ my: 3 }} />

                  {/* Bottom buttons */}
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={2}
                    sx={{ mt: 1 }}
                  >
                    <Button
                      variant="contained"
                      startIcon={<OpenInNewRoundedIcon />}
                      onClick={handleView}
                      sx={{
                        bgcolor: TEAL,
                        minHeight: 44,
                        textTransform: "none",
                        fontWeight: 700,
                        "&:hover": { bgcolor: "var(--imaa-navy)" },
                        "&:focus-visible": { outline: "var(--imaa-focus-width) solid var(--imaa-focus-color)", outlineOffset: "var(--imaa-focus-offset)" },
                        width: { xs: "100%", sm: "auto" },
                      }}
                    >
                      View Resource
                    </Button>

                    {resource.type === "file" && (
                      <Button
                        variant="outlined"
                        startIcon={<DownloadRoundedIcon />}
                        onClick={handleDownload}
                        sx={{ width: { xs: "100%", sm: "auto" }, minHeight: 44, textTransform: "none", fontWeight: 700 }}
                      >
                        Download
                      </Button>
                    )}
                  </Stack>
                </Paper>
              </>
            )}
          </main>
        </div>
      </Container>
    </Box>
  );
}
