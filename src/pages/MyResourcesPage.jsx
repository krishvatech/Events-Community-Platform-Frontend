// src/pages/MyResourcesPage.jsx

import React, { useEffect, useState } from "react";
import {
  Box, Container, Divider, TextField,
  List, ListItem, ListItemIcon, ListItemText, Chip, Paper,
  Typography, InputAdornment, Stack, Pagination, CircularProgress,
  IconButton, FormControl, Select, MenuItem, Button, useTheme, useMediaQuery, Menu,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import AccountSidebar from "../components/AccountSidebar.jsx";
import AccountHero from "../components/AccountHero.jsx";

// Icons
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";
import MovieRoundedIcon from "@mui/icons-material/MovieRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import ArticleRoundedIcon from "@mui/icons-material/ArticleRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import InfoRoundedIcon from "@mui/icons-material/InfoRounded";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";

const API = (import.meta.env?.VITE_API_BASE_URL || "http://localhost:8000").toString().replace(/\/+$/, "");
const API_URL = API.endsWith("/api") ? API : `${API}/api`;

export default function MyResourcesPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  const [currentUser, setCurrentUser] = useState(null);
  const [registeredEvents, setRegisteredEvents] = useState([]);

  // Resources state with pagination
  const [resources, setResources] = useState([]);
  const [resourcesTotal, setResourcesTotal] = useState(0);
  const [resourcesLoading, setResourcesLoading] = useState(true);

  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuResource, setMenuResource] = useState(null);

  const handleMenuOpen = (event, resource) => {
    event.preventDefault();
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setMenuResource(resource);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setMenuResource(null);
  };

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
    const fetchRegisteredEvents = async () => {
      if (!currentUser) return;
      try {
        const token = localStorage.getItem("access_token");
        const response = await fetch(`${API_URL}/event-registrations/mine/`, {
          headers: { "Authorization": `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("Failed to fetch registrations");
        const data = await response.json();
        let registrations = Array.isArray(data) ? data : data.results || [];
        const eventIds = registrations
          .map(reg => {
            if (reg.event && typeof reg.event === 'object') return reg.event.id;
            return reg.event_id || reg.event;
          })
          .filter(Boolean);
        setRegisteredEvents(eventIds);
      } catch (error) {
        console.error("Error fetching registrations:", error);
        setRegisteredEvents([]);
      }
    };
    fetchRegisteredEvents();
  }, [currentUser]);

  // Fetch resources with pagination
  useEffect(() => {
    const fetchResources = async () => {
      if (registeredEvents.length === 0) {
        setResourcesLoading(false);
        setResources([]);
        setResourcesTotal(0);
        return;
      }

      setResourcesLoading(true);
      try {
        const token = localStorage.getItem("access_token");
        const offset = (page - 1) * itemsPerPage;

        // Build query parameters
        const params = new URLSearchParams({
          limit: itemsPerPage.toString(),
          offset: offset.toString(),
        });

        // Add search query if exists
        if (searchQuery) {
          params.append('search', searchQuery);
        }

        // Add type filter if exists
        if (filterType) {
          params.append('type', filterType);
        }

        // Add ordering
        if (sortBy === 'newest') {
          params.append('ordering', '-created_at');
        } else if (sortBy === 'oldest') {
          params.append('ordering', 'created_at');
        }

        const response = await fetch(`${API_URL}/content/resources/?${params.toString()}`, {
          headers: { "Authorization": `Bearer ${token}` },
        });

        if (!response.ok) throw new Error("Failed to fetch resources");
        const data = await response.json();

        // Handle both paginated and non-paginated responses
        if (data.results) {
          // Paginated response
          const allResources = data.results;
          const filteredResources = allResources.filter(r =>
            registeredEvents.includes(r.event_id) && r.is_published
          );
          setResources(filteredResources);
          setResourcesTotal(data.count || filteredResources.length);
        } else {
          // Non-paginated response
          const allResources = Array.isArray(data) ? data : [];
          const filteredResources = allResources.filter(r =>
            registeredEvents.includes(r.event_id) && r.is_published
          );
          setResources(filteredResources);
          setResourcesTotal(filteredResources.length);
        }
      } catch (error) {
        console.error("Error fetching resources:", error);
        setResources([]);
        setResourcesTotal(0);
      } finally {
        setResourcesLoading(false);
      }
    };

    fetchResources();
  }, [registeredEvents, page, searchQuery, filterType, sortBy]);


  const getResourceIcon = (type) => {
    switch (type) {
      case "file": return <PictureAsPdfRoundedIcon />;
      case "video": return <MovieRoundedIcon />;
      case "link": return <LinkRoundedIcon />;
      default: return <ArticleRoundedIcon />;
    }
  };

  // const getresourcesIcon = (resource) => {
  //   // Reuse the same icon logic as resources tab
  //   return getResourceIcon(resource.type);
  // };

  // const getresourcesText = (resource) => {
  //   // Try to derive uploader name safely
  //   let actor = "Someone";

  //   const uploader = resource.uploaded_by;
  //   if (uploader && typeof uploader === "object") {
  //     actor =
  //       uploader.full_name ||
  //       uploader.name ||
  //       uploader.username ||
  //       "Someone";
  //   } else if (typeof uploader === "string") {
  //     actor = uploader;
  //   }

  //   const resourceType = resource.type || "resource";
  //   const title = resource.title || "Untitled resource";

  //   return `${actor} uploaded ${resourceType}: "${title}"`;
  // };

  const getResourceUrl = (resource) => {
    if (resource.type === "file") return resource.file;
    if (resource.type === "link") return resource.link_url;
    if (resource.type === "video") return resource.video_url;
    return "#";
  };

  const handleDownload = (resource, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (resource.type !== 'file') return alert('Only files can be downloaded');
    const downloadUrl = `${API_URL}/content/resources/${resource.id}/download/`;
    const token = localStorage.getItem('access_token');
    fetch(downloadUrl, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(response => { if (!response.ok) throw new Error('Download failed'); return response.blob(); })
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${resource.title}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      })
      .catch(error => { console.error('Download error:', error); alert('Failed to download file'); });
  };

  const handleView = (resource, e) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(getResourceUrl(resource), '_blank');
  };

  const handleDetails = (resource, e) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/resource/${resource.id}`);
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, filterType, sortBy]);

  const totalPages = Math.ceil(resourcesTotal / itemsPerPage);

  if (!currentUser) {
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

  return (
    <>
      <AccountHero user={currentUser} />

      <Container maxWidth="lg" className="py-6 sm:py-8">
        <div className="grid grid-cols-12 gap-6">
          <aside className="col-span-12 lg:col-span-3">
            <AccountSidebar activeKey="resources" onNavigate={(k) => console.log(k)} />
          </aside>

          <main className="col-span-12 lg:col-span-9">
            <Typography variant="h4" sx={{ mb: 1 }}>My resources</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Access resources from your registered events
            </Typography>


            <Stack
              direction={{ xs: "column", sm: "column", md: "row" }}
              spacing={2}
              sx={{
                mb: 3,
                flexWrap: { xs: "nowrap", md: "wrap" }, // row wrap only on desktop
              }}
            >
              <TextField
                placeholder="Search resources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRoundedIcon />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  flexGrow: 1,
                  minWidth: { xs: "100%", sm: "100%", md: 250 },
                }}
                size="small"
              />

              <FormControl
                size="small"
                sx={{
                  minWidth: { xs: "100%", sm: 220, md: 120 }, // full width below search
                }}
              >
                <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} displayEmpty>
                  <MenuItem value="">Type</MenuItem>
                  <MenuItem value="file">File</MenuItem>
                  <MenuItem value="video">Video</MenuItem>
                  <MenuItem value="link">Link</MenuItem>
                </Select>
              </FormControl>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  width: { xs: "100%", sm: "100%", md: "auto" }, // full width on mobile/tablet
                  justifyContent: { xs: "flex-start", sm: "flex-start" },
                }}
              >
                {/* Show "Sort" label only on laptop/desktop */}
                <Typography
                  variant="body2"
                  sx={{
                    display: { xs: "none", sm: "none", md: "inline" },
                  }}
                >
                  Sort
                </Typography>

                <FormControl
                  size="small"
                  sx={{
                    // 👉 Same style as Type box on mobile & tablet
                    minWidth: { xs: "100%", sm: 220, md: 140 },
                    flexGrow: { xs: 1, sm: 0, md: 0 }, // stretches on small screens
                  }}
                >
                  <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                    <MenuItem value="newest">Newest first</MenuItem>
                    <MenuItem value="oldest">Oldest first</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Stack>

            <>
              {/* RESOURCES LIST (unchanged content) */}
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Showing {resources.length > 0 ? (page - 1) * itemsPerPage + 1 : 0}–{Math.min(page * itemsPerPage, resourcesTotal)} of {resourcesTotal} resources
              </Typography>
              <Paper variant="outlined" sx={{ borderRadius: 2 }}>
                {resourcesLoading ? (
                  <Box sx={{ display: "flex", justifyContent: "center", p: 8 }}>
                    <CircularProgress />
                  </Box>
                ) : resources.length === 0 ? (
                  <Box sx={{ p: 8, textAlign: "center" }}>
                    <Typography variant="h6" color="text.secondary" gutterBottom>No resources found</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {registeredEvents.length === 0 ? "Register for events to access resources" : "Resources uploaded by publishers will appear here"}
                    </Typography>
                  </Box>
                ) : (
                  <>
                    <List>
                      {resources.map((resource, index) => (
                        <React.Fragment key={resource.id}>
                          {index > 0 && <Divider />}
                          <ListItem
                            button
                            onClick={() => navigate(`/resource/${resource.id}`)}
                            sx={{
                              cursor: 'pointer',
                              '&:hover': {
                                bgcolor: '#f0fdfa'
                              }
                            }}
                            secondaryAction={
                              isMobile ? (
                                // 👇 MOBILE: three-dot menu
                                <IconButton
                                  size="small"
                                  onClick={(e) => handleMenuOpen(e, resource)}
                                  title="More actions"
                                >
                                  <MoreVertRoundedIcon />
                                </IconButton>
                              ) : (
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <Chip label={resource.type} size="small" />
                                  <IconButton size="small" onClick={(e) => handleDetails(resource, e)} title="Details">
                                    <InfoRoundedIcon />
                                  </IconButton>
                                  <IconButton size="small" onClick={(e) => handleView(resource, e)} title="View">
                                    <VisibilityRoundedIcon />
                                  </IconButton>
                                  {resource.type === 'file' ? (
                                    <IconButton size="small" onClick={(e) => handleDownload(resource, e)} title="Download">
                                      <DownloadRoundedIcon />
                                    </IconButton>
                                  ) : (
                                    <IconButton size="small" disabled title="Download not available" sx={{ cursor: 'not-allowed', opacity: 0.4 }}>
                                      <BlockRoundedIcon />
                                    </IconButton>
                                  )
                                  }
                                </Stack>
                              )
                            }
                          >
                            <ListItemIcon>{getResourceIcon(resource.type)}</ListItemIcon>
                            <ListItemText
                              primary={
                                <Typography variant="body1" sx={{ fontWeight: 500, color: '#0ea5a4', '&:hover': { textDecoration: 'underline' } }}>
                                  {resource.title}
                                </Typography>
                              }
                              secondary={
                                <>
                                  <Typography component="span" variant="body2" color="text.secondary">{resource.description || "No description"}</Typography>
                                  <br />
                                  <Typography component="span" variant="caption" color="text.secondary">Added {new Date(resource.created_at).toLocaleDateString()}</Typography>
                                </>
                              }
                            />
                          </ListItem>
                        </React.Fragment>
                      ))}
                    </List>
                    {totalPages > 1 && (
                      <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                        <Pagination count={totalPages} page={page} onChange={(e, value) => setPage(value)} color="primary" shape="rounded" />
                      </Box>
                    )}
                    {/* 👇 MOBILE ACTION MENU – used by the three-dot button */}
                    <Menu
                      anchorEl={menuAnchor}
                      open={Boolean(menuAnchor)}
                      onClose={handleMenuClose}
                      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                      transformOrigin={{ vertical: "top", horizontal: "right" }}
                    >
                      <MenuItem
                        onClick={(e) => {
                          if (menuResource) handleDetails(menuResource, e);
                          handleMenuClose();
                        }}
                      >
                        <ListItemIcon>
                          <InfoRoundedIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary="Details" />
                      </MenuItem>
                      <MenuItem
                        onClick={(e) => {
                          if (menuResource) handleView(menuResource, e);
                          handleMenuClose();
                        }}
                      >
                        <ListItemIcon>
                          <VisibilityRoundedIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary="View" />
                      </MenuItem>
                      {menuResource?.type === "file" ? (
                        <MenuItem
                          onClick={(e) => {
                            if (menuResource) handleDownload(menuResource, e);
                            handleMenuClose();
                          }}
                        >
                          <ListItemIcon>
                            <DownloadRoundedIcon fontSize="small" />
                          </ListItemIcon>
                          <ListItemText primary="Download" />
                        </MenuItem>
                      ) : (
                        <MenuItem disabled>
                          <ListItemIcon>
                            <BlockRoundedIcon fontSize="small" />
                          </ListItemIcon>
                          <ListItemText primary="Download not available" />
                        </MenuItem>
                      )}
                    </Menu>
                  </>
                )}
              </Paper>
            </>
          </main>
        </div>
      </Container>
    </>
  );
}