// src/pages/MyResourcesPage.jsx

import React, { useEffect, useState } from "react";
import {
  Alert, Box, Container, TextField,
  List, ListItem, ListItemIcon, ListItemText, Chip, Paper,
  Typography, InputAdornment, Stack, Pagination, Skeleton,
  IconButton, FormControl, Select, MenuItem, Button, useTheme, useMediaQuery, Menu,
} from "@mui/material";
import { Link, useNavigate } from "#navigation";

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
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import FolderOpenRoundedIcon from "@mui/icons-material/FolderOpenRounded";
import { getAccessToken as getStoredAccessToken } from "../utils/tokenStore";
import PageHeader from "../components/page/PageHeader.jsx";
import FilterToolbar from "../components/page/FilterToolbar.jsx";
import EmptyState from "../components/page/EmptyState.jsx";

const API = (import.meta.env?.VITE_API_BASE_URL || "http://localhost:8000").toString().replace(/\/+$/, "");
const API_URL = API.endsWith("/api") ? API : `${API}/api`;

function ResourcesListSkeleton({ rows = 10, isMobile }) {
  return (
    <List disablePadding aria-label="Loading resources" aria-busy="true" sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(3, minmax(0, 1fr))" }, gap: 2 }}>
      {Array.from({ length: rows }).map((_, idx) => (
        <Paper
          component="li"
          variant="outlined"
          key={idx}
          sx={{ listStyle: "none", p: { xs: 1.5, sm: 2 }, minHeight: 230, borderRadius: "var(--imaa-radius-card)", borderColor: "var(--imaa-border)" }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <ListItemIcon sx={{ minWidth: 44 }}>
              <Skeleton variant="circular" width={28} height={28} />
            </ListItemIcon>
            <ListItemText
              primary={<Skeleton variant="text" width="40%" height={28} />}
              secondary={
                <>
                  <Skeleton variant="text" width="75%" />
                  <Skeleton variant="text" width="30%" />
                </>
              }
            />
            {isMobile ? (
              <Skeleton variant="circular" width={36} height={36} />
            ) : (
              <Stack direction="row" spacing={1} alignItems="center">
                <Skeleton variant="circular" width={36} height={36} />
                <Skeleton variant="circular" width={36} height={36} />
                <Skeleton variant="circular" width={36} height={36} />
              </Stack>
            )}
          </Stack>
        </Paper>
      ))}
    </List>
  );
}

export default function MyResourcesPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const itemsPerPage = 5;

  const renderRangeText = (total, page, size) => {
    if (total === 0) return "Showing 0 resources";
    const start = (page - 1) * size + 1;
    const end = Math.min(page * size, total);
    return `Showing ${start}–${end} of ${total} resources`;
  };

  const [currentUser, setCurrentUser] = useState(null);
  const [registeredEvents, setRegisteredEvents] = useState([]);

  // Resources state with pagination
  const [resources, setResources] = useState([]);
  const [resourcesTotal, setResourcesTotal] = useState(0);
  const [resourcesLoading, setResourcesLoading] = useState(true);
  const [resourcesError, setResourcesError] = useState("");

  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuResource, setMenuResource] = useState(null);
  const [registrationsLoaded, setRegistrationsLoaded] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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
        const token = getStoredAccessToken();
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
    let cancelled = false;

    const fetchRegisteredEvents = async () => {
      try {
        const token = getStoredAccessToken();
        const response = await fetch(`${API_URL}/event-registrations/mine/`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error("Failed to fetch registrations");

        const data = await response.json();
        const registrations = Array.isArray(data) ? data : data.results || [];

        const eventIds = registrations
          .filter((reg) => reg.status === "registered" && reg.attendee_status === "confirmed")
          .map((reg) => {
            if (reg.event && typeof reg.event === "object") return reg.event.id;
            return reg.event_id || reg.event;
          })
          .filter(Boolean);

        if (!cancelled) setRegisteredEvents(eventIds);
      } catch (error) {
        console.error("Error fetching registrations:", error);
        if (!cancelled) setRegisteredEvents([]);
      } finally {
        if (!cancelled) setRegistrationsLoaded(true);
      }
    };

    fetchRegisteredEvents();
    return () => {
      cancelled = true;
    };
  }, [refreshTrigger]);


  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch resources with pagination and AbortController
  useEffect(() => {
    const controller = new AbortController();

    const fetchResources = async () => {
      if (!currentUser || !registrationsLoaded) return;
      if (registeredEvents.length === 0) {
        setResourcesLoading(false);
        setResourcesError("");
        setResources([]);
        setResourcesTotal(0);
        return;
      }

      setResourcesLoading(true);
      setResourcesError("");
      try {
        const token = getStoredAccessToken();
        const offset = (page - 1) * itemsPerPage;

        // Build query parameters
        const params = new URLSearchParams({
          limit: itemsPerPage.toString(),
          offset: offset.toString(),
          event_isnull: "false",
        });

        // Add search query if exists
        if (debouncedSearchQuery) {
          params.append('search', debouncedSearchQuery);
        }

        // Add type filter if exists
        if (filterType) {
          params.append('type', filterType);
        }

        // Add ordering
        if (sortBy === 'newest') {
          params.append('ordering', '-created_at,-id');
        } else if (sortBy === 'oldest') {
          params.append('ordering', 'created_at,id');
        }

        const response = await fetch(`${API_URL}/content/resources/?${params.toString()}`, {
          headers: { "Authorization": `Bearer ${token}` },
          signal: controller.signal,
        });

        if (!response.ok) throw new Error("Failed to fetch resources");
        const data = await response.json();

        // Enforce paginated response structure
        if (data && typeof data.count === "number" && Array.isArray(data.results)) {
          setResources(data.results);
          setResourcesTotal(data.count);
        } else {
          alert("Invalid response format from server.");
          setResources([]);
          setResourcesTotal(0);
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          return;
        }
        console.error("Error fetching resources:", error);
        setResources([]);
        setResourcesTotal(0);
        setResourcesError("Resources could not be loaded. Please try again.");
      } finally {
        if (!controller.signal.aborted) {
          setResourcesLoading(false);
        }
      }
    };

    fetchResources();

    return () => {
      controller.abort();
    };
  }, [currentUser, registrationsLoaded, registeredEvents, page, debouncedSearchQuery, filterType, sortBy, refreshTrigger]);


  const getResourceIcon = (type) => {
    switch (type) {
      case "file": return <PictureAsPdfRoundedIcon />;
      case "video": return <MovieRoundedIcon />;
      case "link": return <LinkRoundedIcon />;
      default: return <ArticleRoundedIcon />;
    }
  };

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
    const token = getStoredAccessToken();
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
    navigate(`/resource/${resource.id}?ref=my_resources`);
  };

  const totalPages = Math.ceil(resourcesTotal / itemsPerPage);


  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "var(--imaa-dm-page, #f7f8fa)", width: "100%", minWidth: 0, overflow: "hidden" }}>
      <Container maxWidth="lg" sx={{ py: { xs: 2.5, sm: 3.5 }, px: { xs: 2, sm: 3 } }}>
        <div className="grid grid-cols-12 gap-3 md:gap-4">
          <main className="col-span-12">
            <PageHeader
              eyebrow="E-Library"
              title="My Resources"
              subtitle="Access resources from your registered events"
              sx={{ mb: 3 }}
            />

            <FilterToolbar surface aria-label="Resource filters" sx={{ mb: 3 }}>
              <TextField
                label="Search resources"
                placeholder="Search resources..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRoundedIcon />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  flexGrow: 1,
                  minWidth: { xs: "100%", sm: 260 },
                  bgcolor: "background.paper",
                }}
                size="small"
              />

              <FormControl
                size="small"
                sx={{
                  minWidth: { xs: "100%", sm: 150 },
                }}
              >
                <Select value={filterType} onChange={(e) => {
                  setFilterType(e.target.value);
                  setPage(1);
                }}
                  displayEmpty
                  inputProps={{ "aria-label": "Filter by resource type" }}
                  renderValue={(value) => {
                    if (value === "") return "All Types";
                    if (value === "file") return "File";
                    if (value === "video") return "Video";
                    if (value === "link") return "Link";
                    return value;
                  }}
                >
                  <MenuItem value="">All Types</MenuItem>
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
                  width: { xs: "100%", sm: "auto" },
                }}
              >
                <FormControl
                  size="small"
                  sx={{
                    // 👉 Same style as Type box on mobile & tablet
                    minWidth: { xs: "100%", sm: 160 },
                    flexGrow: { xs: 1, sm: 0 },
                  }}
                >
                  <Select value={sortBy} onChange={(e) => {
                    setSortBy(e.target.value);
                    setPage(1);
                  }}
                    inputProps={{ "aria-label": "Sort resources" }}
                  >
                    <MenuItem value="newest">Newest first</MenuItem>
                    <MenuItem value="oldest">Oldest first</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </FilterToolbar>

            <>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, mb: 1.5 }}>
                <Typography variant="body2" color="text.secondary">
                  {renderRangeText(resourcesTotal, page, itemsPerPage)}
                </Typography>
                <IconButton
                  onClick={() => setRefreshTrigger(prev => prev + 1)}
                  disabled={resourcesLoading}
                  size="small"
                  title="Refresh resources"
                  aria-label="Refresh resources"
                  sx={{
                    color: 'var(--imaa-dm-teal-text, var(--imaa-teal-hover))',
                    minWidth: 40,
                    minHeight: 40,
                    '&:hover': {
                      bgcolor: 'var(--imaa-teal-light)',
                    },
                    '&:focus-visible': { outline: 'var(--imaa-focus-width) solid var(--imaa-focus-color)', outlineOffset: 'var(--imaa-focus-offset)' },
                  }}
                >
                  <RefreshRoundedIcon
                    fontSize="small"
                    sx={{
                      animation: resourcesLoading ? "spin 1s linear infinite" : "none",
                      "@keyframes spin": {
                        "0%": { transform: "rotate(0deg)" },
                        "100%": { transform: "rotate(360deg)" }
                      }
                    }}
                  />
                </IconButton>
              </Box>
              {resourcesError ? (
                <Alert
                  severity="error"
                  action={
                    <Button color="inherit" size="small" onClick={() => setRefreshTrigger((prev) => prev + 1)}>
                      Retry
                    </Button>
                  }
                  sx={{ borderRadius: "var(--imaa-radius-card)" }}
                >
                  {resourcesError}
                </Alert>
              ) : resourcesLoading ? (
                  <ResourcesListSkeleton rows={itemsPerPage} isMobile={isMobile} />
                ) : resources.length === 0 ? (
                  <EmptyState
                    icon={<FolderOpenRoundedIcon />}
                    title="No resources found"
                    description={registeredEvents.length === 0 ? "Register for events to access resources" : "Resources uploaded by publishers will appear here"}
                  />
                ) : (
                  <>
                    <List disablePadding aria-label="Resources" sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(3, minmax(0, 1fr))" }, gap: 2 }}>
                      {resources.map((resource) => (
                        <React.Fragment key={resource.id}>
                          <ListItem
                            sx={{
                              bgcolor: "background.paper",
                              border: "1px solid var(--imaa-border)",
                              borderRadius: "var(--imaa-radius-card)",
                              borderColor: "var(--imaa-border)",
                              boxShadow: "var(--imaa-shadow-sm)",
                              overflow: "hidden",
                              minHeight: 250,
                              alignItems: "stretch",
                              flexDirection: "column",
                              pr: 2,
                              py: 2,
                              transition: "border-color 160ms ease, box-shadow 160ms ease",
                              '&:hover': {
                                borderColor: "var(--imaa-border-hover)",
                                boxShadow: "var(--imaa-shadow-md)",
                              },
                              '&:focus-within': { borderColor: "var(--imaa-teal)" },
                              '& .MuiListItemSecondaryAction-root': {
                                position: 'static',
                                transform: 'none',
                                width: '100%',
                                mt: 'auto',
                                pt: 1.5,
                                borderTop: '1px solid var(--imaa-bg-cool)',
                                display: 'flex',
                                justifyContent: 'flex-end',
                              },
                            }}
                            secondaryAction={
                              isMobile ? (
                                // 👇 MOBILE: three-dot menu
                                (<IconButton
                                  size="small"
                                  onClick={(e) => handleMenuOpen(e, resource)}
                                  title="More actions"
                                  aria-label={`More actions for ${resource.title}`}
                                  sx={{ minWidth: 40, minHeight: 40 }}
                                >
                                  <MoreVertRoundedIcon />
                                </IconButton>)
                              ) : (
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <IconButton size="small" onClick={(e) => handleDetails(resource, e)} title="Details" aria-label={`Details for ${resource.title}`} sx={{ minWidth: 40, minHeight: 40 }}>
                                    <InfoRoundedIcon />
                                  </IconButton>
                                  <IconButton size="small" onClick={(e) => handleView(resource, e)} title="View" aria-label={`View ${resource.title}`} sx={{ minWidth: 40, minHeight: 40 }}>
                                    <VisibilityRoundedIcon />
                                  </IconButton>
                                  {resource.type === 'file' ? (
                                    <IconButton size="small" onClick={(e) => handleDownload(resource, e)} title="Download" aria-label={`Download ${resource.title}`} sx={{ minWidth: 40, minHeight: 40 }}>
                                      <DownloadRoundedIcon />
                                    </IconButton>
                                  ) : (
                                    <IconButton size="small" disabled title="Download not available" aria-label={`Download not available for ${resource.title}`} sx={{ minWidth: 40, minHeight: 40, cursor: 'not-allowed', opacity: 0.4 }}>
                                      <BlockRoundedIcon />
                                    </IconButton>
                                  )
                                  }
                                </Stack>
                              )
                            }
                          >
                            <ListItemIcon
                              aria-hidden="true"
                              sx={{
                                minWidth: 0,
                                width: "100%",
                                height: 96,
                                mr: 0,
                                mb: 1.5,
                                borderRadius: "var(--imaa-radius-card)",
                                bgcolor: "var(--imaa-teal-light)",
                                color: "var(--imaa-dm-teal-text, var(--imaa-teal-hover))",
                                display: "grid",
                                placeItems: "center",
                              }}
                            >
                              {getResourceIcon(resource.type)}
                            </ListItemIcon>
                            <ListItemText
                              sx={{ pr: 0, width: "100%", flex: 1 }}
                              secondaryTypographyProps={{ component: "div" }}
                              primary={
                                <Typography
                                  component={Link}
                                  to={`/resource/${resource.id}`}
                                  variant="body1"
                                  sx={{
                                    display: "inline-block",
                                    fontWeight: 700,
                                    color: 'var(--imaa-ink)',
                                    textDecoration: "none",
                                    overflowWrap: "anywhere",
                                    '&:hover': { color: "var(--imaa-dm-teal-text, var(--imaa-teal-hover))", textDecoration: 'underline' },
                                    '&:focus-visible': { outline: 'var(--imaa-focus-width) solid var(--imaa-focus-color)', outlineOffset: 'var(--imaa-focus-offset)' },
                                  }}
                                >
                                  {resource.title}
                                </Typography>
                              }
                              secondary={
                                <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, minWidth: 0, width: '100%', mt: 0.5 }}>
                                  <Typography
                                    component="span"
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{
                                      flex: 1,
                                      minWidth: 0,
                                      display: '-webkit-box',
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: 'vertical',
                                      overflow: 'hidden',
                                      overflowWrap: 'anywhere',
                                    }}
                                  >
                                    {resource.description || "No description"}
                                  </Typography>
                                  <Chip label={resource.type} size="small" variant="outlined" sx={{ textTransform: "capitalize", height: 22 }} />
                                  <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>Added {new Date(resource.created_at).toLocaleDateString()}</Typography>
                                </Box>
                              }
                            />
                          </ListItem>
                        </React.Fragment>
                      ))}
                    </List>
                    {totalPages > 1 && (
                      <Box sx={{ display: "flex", justifyContent: "center", py: 3, overflowX: "auto" }}>
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
            </>
          </main>
        </div>
      </Container>
    </Box>
  );
}
