// src/pages/ResourceDetailsPage.jsx

import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";

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
import AccountSidebar from "../components/AccountSidebar";

const TEAL = "#0ea5a4";
const API = (import.meta.env?.VITE_API_BASE_URL || "http://localhost:8000")
  .toString()
  .replace(/\/+$/, "");
const API_URL = API.endsWith("/api") ? API : `${API}/api`;

const TypeIcon = ({ type }) => {
  const common = { sx: { color: TEAL } };
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

      <Paper variant="outlined" sx={{ p: 4, borderRadius: 2 }}>
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

export default function ResourceDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

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
        const token = localStorage.getItem("access_token");

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
    const token = localStorage.getItem("access_token");

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
    <div className="min-h-screen bg-slate-50">
      <Container maxWidth="xl" className="py-6 sm:py-8">
        <div className="grid grid-cols-12 gap-3 md:gap-4">
          <aside className="col-span-12 lg:col-span-3">
            <AccountSidebar
              activeKey="resources"
              onNavigate={(k) => console.log(k)}
            />
          </aside>

          <main className="col-span-12 lg:col-span-9">
            {loading ? (
              <ResourceDetailsSkeleton />
            ) : error || !resource ? (
              <Paper variant="outlined" sx={{ borderRadius: 2, p: 6 }}>
                <Box sx={{ textAlign: "center" }}>
                  <Typography variant="h5" color="error" gutterBottom>
                    {error || "Resource not found"}
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<ArrowBackRoundedIcon />}
                    onClick={() => navigate("/account/resources")}
                    sx={{ mt: 2 }}
                  >
                    Back to resources
                  </Button>
                </Box>
              </Paper>
            ) : (
              <>
                <Breadcrumbs sx={{ mb: 2 }}>
                  <Link
                    to="/account/resources"
                    style={{ textDecoration: "none", color: "#666" }}
                  >
                    My Resources
                  </Link>
                  <Typography color="text.primary">{resource.title}</Typography>
                </Breadcrumbs>

                <Paper variant="outlined" sx={{ p: 4, borderRadius: 2 }}>
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
                      <Box sx={{ fontSize: 48 }}>
                        <TypeIcon type={resource.type} />
                      </Box>

                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography
                          variant="h4"
                          gutterBottom
                          sx={{ wordBreak: "break-word" }}
                        >
                          {resource.title}
                        </Typography>

                        <Stack
                          direction="row"
                          spacing={1}
                          sx={{ mb: 2, flexWrap: "wrap" }}
                        >
                          <Chip label={resource.type} size="small" color="primary" />
                          {resource.is_published ? (
                            <Chip label="Published" size="small" color="success" />
                          ) : (
                            <Chip label="Draft" size="small" color="default" />
                          )}
                        </Stack>
                      </Box>
                    </Stack>

                    <Box sx={{ mt: { xs: 1, sm: 0 } }}>
                      <Button
                        variant="text"
                        startIcon={<ArrowBackRoundedIcon />}
                        onClick={() => navigate("/account/resources")}
                        sx={{ textTransform: "none" }}
                      >
                        Back
                      </Button>
                    </Box>
                  </Stack>

                  <Divider sx={{ my: 3 }} />

                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Description
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      {resource.description || "No description provided"}
                    </Typography>
                  </Box>

                  {event && (
                    <>
                      <Divider sx={{ my: 3 }} />
                      <Box sx={{ mb: 3 }}>
                        <Typography variant="h6" gutterBottom>
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
                        <Typography variant="h6" gutterBottom>
                          Tags
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
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
                    <Typography variant="h6" gutterBottom>
                      Details
                    </Typography>
                    <Stack spacing={1}>
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
                        "&:hover": { bgcolor: "#0d9493" },
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
                        sx={{ width: { xs: "100%", sm: "auto" } }}
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
    </div>
  );
}
