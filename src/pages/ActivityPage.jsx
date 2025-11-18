// src/pages/ActivityPage.jsx

import React, { useEffect, useState, useMemo } from "react";
import {
  Box, Container, Avatar, Divider, TextField, Tabs, Tab,
  List, ListItem, ListItemIcon, ListItemText, Chip, Paper,
  Typography, InputAdornment, Stack, Pagination, CircularProgress,
  IconButton, FormControl, Select, MenuItem, Button,
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
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import VideoLibraryRoundedIcon from "@mui/icons-material/VideoLibraryRounded";
import InfoRoundedIcon from "@mui/icons-material/InfoRounded";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";

const API = (import.meta.env?.VITE_API_BASE_URL || "http://localhost:8000").toString().replace(/\/+$/, "");
const API_URL = API.endsWith("/api") ? API : `${API}/api`;

export default function ActivityPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterTime, setFilterTime] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  const [currentUser, setCurrentUser] = useState(null);
  const [registeredEvents, setRegisteredEvents] = useState([]);
  
  // Resources state with pagination
  const [resources, setResources] = useState([]);
  const [resourcesTotal, setResourcesTotal] = useState(0);
  const [resourcesLoading, setResourcesLoading] = useState(true);
  
  // Activities state with pagination
  const [activities, setActivities] = useState([]);
  const [activitiesTotal, setActivitiesTotal] = useState(0);
  const [activitiesLoading, setActivitiesLoading] = useState(false);

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
    
    if (activeTab === 0) {
      fetchResources();
    }
  }, [registeredEvents, page, searchQuery, filterType, sortBy, activeTab]);

  useEffect(() => {
  const fetchActivities = async () => {
    if (registeredEvents.length === 0) {
      setActivities([]);
      setActivitiesTotal(0);
      return;
    }

    setActivitiesLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const offset = (page - 1) * itemsPerPage;

      // Build query parameters (same style as resources)
      const params = new URLSearchParams({
        limit: itemsPerPage.toString(),
        offset: offset.toString(),
      });

      if (searchQuery) {
        params.append("search", searchQuery);
      }

      // For content resources, the field name is `type`
      if (filterType) {
        params.append("type", filterType);
      }

      if (sortBy === "newest") {
        params.append("ordering", "-created_at");
      } else if (sortBy === "oldest") {
        params.append("ordering", "created_at");
      }

      // 👉 CHANGED ENDPOINT: use content/resources instead of activity/feed
      const response = await fetch(
        `${API_URL}/content/resources/?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch activities");
      const data = await response.json();

      if (data.results) {
        // Paginated response
        const allResources = data.results;
        const filtered = allResources.filter(
          (r) => registeredEvents.includes(r.event_id) && r.is_published
        );
        setActivities(filtered);
        setActivitiesTotal(data.count || filtered.length);
      } else {
        // Non-paginated response
        const allResources = Array.isArray(data) ? data : [];
        const filtered = allResources.filter(
          (r) => registeredEvents.includes(r.event_id) && r.is_published
        );
        setActivities(filtered);
        setActivitiesTotal(filtered.length);
      }
    } catch (error) {
      console.error("Error fetching activities:", error);
      setActivities([]);
      setActivitiesTotal(0);
    } finally {
      setActivitiesLoading(false);
    }
  };

  if (activeTab === 1) {
    fetchActivities();
  }
}, [registeredEvents, page, searchQuery, filterType, sortBy, activeTab]);


  const getResourceIcon = (type) => {
    switch (type) {
      case "file": return <PictureAsPdfRoundedIcon />;
      case "video": return <MovieRoundedIcon />;
      case "link": return <LinkRoundedIcon />;
      default: return <ArticleRoundedIcon />;
    }
  };

  const getActivityIcon = (resource) => {
    // Reuse the same icon logic as resources tab
    return getResourceIcon(resource.type);
  };

  const getActivityText = (resource) => {
    // Try to derive uploader name safely
    let actor = "Someone";

    const uploader = resource.uploaded_by;
    if (uploader && typeof uploader === "object") {
      actor =
        uploader.full_name ||
        uploader.name ||
        uploader.username ||
        "Someone";
    } else if (typeof uploader === "string") {
      actor = uploader;
    }

    const resourceType = resource.type || "resource";
    const title = resource.title || "Untitled resource";

    return `${actor} uploaded ${resourceType}: "${title}"`;
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
  }, [activeTab, searchQuery, filterType, filterTime, sortBy]);

  const loading = resourcesLoading || activitiesLoading;
  const totalPages = activeTab === 0 
    ? Math.ceil(resourcesTotal / itemsPerPage) 
    : Math.ceil(activitiesTotal / itemsPerPage);

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
          <aside className="col-span-12 md:col-span-3">
            <AccountSidebar activeKey="activity" onNavigate={(k) => console.log(k)} />
          </aside>

          <main className="col-span-12 md:col-span-9">
            <Typography variant="h4" sx={{ mb: 1 }}>My Activity</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Access resources and activities from your registered events
            </Typography>

            <Tabs 
              value={activeTab} 
              onChange={(e, v) => setActiveTab(v)} 
              sx={{ 
                mb: 3,
                px: 0.5,
                "& .MuiTab-root": { textTransform: "none", minHeight: 46 },
                "& .Mui-selected": { color: "#0ea5a4 !important", fontWeight: 700 },
                "& .MuiTabs-indicator": { backgroundColor: "#0ea5a4" },
              }}
            >
              <Tab label={`RESOURCES (${resourcesTotal})`} />
              <Tab label={`ACTIVITY FEED (${activitiesTotal})`} />
            </Tabs>

            <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: "wrap" }}>
              <TextField
                placeholder={activeTab === 0 ? "Search resources..." : "Search activities..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><SearchRoundedIcon /></InputAdornment>,
                }}
                sx={{ flexGrow: 1, minWidth: 250 }}
                size="small"
              />
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} displayEmpty>
                  <MenuItem value="">Type</MenuItem>
                  <MenuItem value="file">File</MenuItem>
                  <MenuItem value="video">Video</MenuItem>
                  <MenuItem value="link">Link</MenuItem>
                </Select>
              </FormControl>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="body2">Sort</Typography>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                    <MenuItem value="newest">Newest first</MenuItem>
                    <MenuItem value="oldest">Oldest first</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Stack>

            {activeTab === 0 && (
              <>
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
                                  )}
                                </Stack>
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
                    </>
                  )}
                </Paper>
              </>
            )}

            {activeTab === 1 && (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Showing {activities.length > 0 ? (page - 1) * itemsPerPage + 1 : 0}–{Math.min(page * itemsPerPage, activitiesTotal)} of {activitiesTotal} activities
                </Typography>
                <Paper variant="outlined" sx={{ borderRadius: 2 }}>
                  {activitiesLoading ? (
                    <Box sx={{ display: "flex", justifyContent: "center", p: 8 }}><CircularProgress /></Box>
                  ) : activities.length === 0 ? (
                    <Box sx={{ p: 8, textAlign: "center" }}>
                      <Typography variant="h6" color="text.secondary" gutterBottom>No activities yet</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {registeredEvents.length === 0 ? "Register for events to see activities" : "Recent activities from your registered events will appear here"}
                      </Typography>
                    </Box>
                  ) : (
                    <>
                      <List>
                        {activities.map((activity, index) => (
                          <React.Fragment key={activity.id}>
                            {index > 0 && <Divider />}
                            <ListItem
                              button
                              onClick={() => navigate(`/resource/${activity.id}`)}
                              sx={{
                                cursor: "pointer",
                                "&:hover": {
                                  bgcolor: "#f0fdfa",
                                },
                              }}
                            >
                              <ListItemIcon>
                                <Avatar sx={{ bgcolor: "#14b8a6", width: 40, height: 40 }}>
                                  {getActivityIcon(activity)}
                                </Avatar>
                              </ListItemIcon>
                              <ListItemText
                                primary={
                                  <Typography variant="body1">
                                    {getActivityText(activity)}
                                  </Typography>
                                }
                                secondary={
                                  <>
                                    <Typography
                                      component="span"
                                      variant="caption"
                                      color="text.secondary"
                                    >
                                      {new Date(activity.created_at).toLocaleString("en-IN", {
                                        dateStyle: "short",
                                        timeStyle: "short",
                                      })}
                                    </Typography>
                                    {activity.tags && activity.tags.length > 0 && (
                                      <Box
                                        sx={{
                                          mt: 1,
                                          display: "flex",
                                          gap: 0.5,
                                          flexWrap: "wrap",
                                        }}
                                      >
                                        {activity.tags.map((tag, idx) => (
                                          <Chip
                                            key={idx}
                                            label={tag}
                                            size="small"
                                            variant="outlined"
                                          />
                                        ))}
                                      </Box>
                                    )}
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
                    </>
                  )}
                </Paper>
              </>
            )}
          </main>
        </div>
      </Container>
    </>
  );
}