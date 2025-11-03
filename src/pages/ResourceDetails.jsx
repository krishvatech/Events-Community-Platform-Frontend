// src/pages/ResourceDetails.jsx

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
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";
import MovieRoundedIcon from "@mui/icons-material/MovieRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import ArticleRoundedIcon from "@mui/icons-material/ArticleRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import AccountHero from "../components/AccountHero.jsx";
import AccountSidebar from "../components/AccountSidebar.jsx";

const TEAL = "#0ea5a4";
const API = (import.meta.env?.VITE_API_BASE_URL || "http://localhost:8000").toString().replace(/\/+$/, "");
const API_URL = API.endsWith("/api") ? API : `${API}/api`;

const TypeIcon = ({ type }) => {
  const common = { sx: { color: TEAL } };
  switch (type) {
    case "file": return <PictureAsPdfRoundedIcon {...common} />;
    case "video": return <MovieRoundedIcon {...common} />;
    case "link": return <LinkRoundedIcon {...common} />;
    default: return <ArticleRoundedIcon {...common} />;
  }
};

export default function ResourceDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [resource, setResource] = useState(null);
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const token = localStorage.getItem("access_token");
        const response = await fetch(`${API_URL}/users/me/`, {
          headers: { "Authorization": `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("Failed to fetch user");
        const data = await response.json();
        setCurrentUser(data);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    const fetchResource = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("access_token");
        
        // Fetch resource details
        const resourceResponse = await fetch(`${API_URL}/content/resources/${id}/`, {
          headers: { "Authorization": `Bearer ${token}` },
        });
        
        if (!resourceResponse.ok) {
          throw new Error("Resource not found");
        }
        
        const resourceData = await resourceResponse.json();
        setResource(resourceData);
        
        // Fetch associated event details
        if (resourceData.event_id) {
          try {
            const eventResponse = await fetch(`${API_URL}/events/${resourceData.event_id}/`, {
              headers: { "Authorization": `Bearer ${token}` },
            });
            if (eventResponse.ok) {
              const eventData = await eventResponse.json();
              setEvent(eventData);
            }
          } catch (err) {
            console.error("Error fetching event:", err);
          }
        }
      } catch (err) {
        console.error("Error fetching resource:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchResource();
    }
  }, [id]);

  const handleDownload = () => {
    if (resource.type !== 'file') return;
    const downloadUrl = `${API_URL}/content/resources/${resource.id}/download/`;
    const token = localStorage.getItem('access_token');
    fetch(downloadUrl, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(response => {
        if (!response.ok) throw new Error('Download failed');
        return response.blob();
      })
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${resource.title}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      })
      .catch(error => {
        console.error('Download error:', error);
        alert('Failed to download file');
      });
  };

  const handleView = () => {
    let url;
    if (resource.type === "file") url = resource.file;
    else if (resource.type === "link") url = resource.link_url;
    else if (resource.type === "video") url = resource.video_url;
    
    if (url) window.open(url, '_blank');
  };

  if (loading) {
    return (
      <>
        <AccountHero user={currentUser} />
        <Container maxWidth="lg" className="py-6 sm:py-8">
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
            <CircularProgress />
          </Box>
        </Container>
      </>
    );
  }

  if (error || !resource) {
    return (
      <>
        <AccountHero user={currentUser} />
        <Container maxWidth="lg" className="py-6 sm:py-8">
          <Box sx={{ p: 8, textAlign: "center" }}>
            <Typography variant="h5" color="error" gutterBottom>
              {error || "Resource not found"}
            </Typography>
            <Button
              variant="contained"
              startIcon={<ArrowBackRoundedIcon />}
              onClick={() => navigate('/account')}
              sx={{ mt: 2 }}
            >
              Back to Activity
            </Button>
          </Box>
        </Container>
      </>
    );
  }

  return (
    <>
      <AccountHero user={currentUser} />
      
      <Container maxWidth="lg" className="py-6 sm:py-8">
        <div className="grid grid-cols-12 gap-6">
          <aside className="col-span-12 md:col-span-3">
            <AccountSidebar activeKey="activity" onNavigate={(k) => console.log(k)} />
          </aside>

          <main className="col-span-12 md:col-span-9">
            <Breadcrumbs sx={{ mb: 2 }}>
              <Link to="/account" style={{ textDecoration: "none", color: "#666" }}>
                My Activity
              </Link>
              <Typography color="text.primary">{resource.title}</Typography>
            </Breadcrumbs>

            <Paper sx={{ p: 4, borderRadius: 2 }} elevation={1}>
              <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ mb: 3 }}>
                <Box sx={{ fontSize: 48 }}>
                  <TypeIcon type={resource.type} />
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="h4" gutterBottom>
                    {resource.title}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                    <Chip label={resource.type} size="small" color="primary" />
                    {resource.is_published ? (
                      <Chip label="Published" size="small" color="success" />
                    ) : (
                      <Chip label="Draft" size="small" color="default" />
                    )}
                  </Stack>
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

              {resource.tags && resource.tags.length > 0 && (
                <>
                  <Divider sx={{ my: 3 }} />
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Tags
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {resource.tags.map((tag, idx) => (
                        <Chip key={idx} label={tag} size="small" variant="outlined" />
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
                    <strong>Created:</strong> {new Date(resource.created_at).toLocaleString('en-IN', {
                      dateStyle: 'long',
                      timeStyle: 'short'
                    })}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Last Updated:</strong> {new Date(resource.updated_at).toLocaleString('en-IN', {
                      dateStyle: 'long',
                      timeStyle: 'short'
                    })}
                  </Typography>
                </Stack>
              </Box>

              <Divider sx={{ my: 3 }} />

              <Stack direction="row" spacing={2}>
                <Button
                  variant="contained"
                  startIcon={<OpenInNewRoundedIcon />}
                  onClick={handleView}
                  sx={{ bgcolor: TEAL, '&:hover': { bgcolor: '#0d9493' } }}
                >
                  View Resource
                </Button>
                {resource.type === 'file' && (
                  <Button
                    variant="outlined"
                    startIcon={<DownloadRoundedIcon />}
                    onClick={handleDownload}
                  >
                    Download
                  </Button>
                )}
                <Button
                  variant="outlined"
                  startIcon={<ArrowBackRoundedIcon />}
                  onClick={() => navigate('/account')}
                >
                  Back
                </Button>
              </Stack>
            </Paper>
          </main>
        </div>
      </Container>
    </>
  );
}