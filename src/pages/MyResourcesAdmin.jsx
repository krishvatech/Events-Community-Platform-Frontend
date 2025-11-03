// src/pages/MyResourcesAdmin.jsx

import React, { useEffect, useState } from "react";
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, InputAdornment, MenuItem, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Tooltip, Typography, FormControlLabel, Paper,
  Tabs, Tab, Select, Pagination, Switch, FormControl
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";
import VideoLibraryRoundedIcon from "@mui/icons-material/VideoLibraryRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import PublicOutlinedIcon from "@mui/icons-material/PublicOutlined";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import axios from "axios";

const RAW_API = (import.meta.env?.VITE_API_BASE_URL || "http://localhost:8000").toString().replace(/\/+$/, "");
const API = RAW_API.endsWith("/api") ? RAW_API : `${RAW_API}/api`;

const iconForType = (t) => {
  switch (t) {
    case "file": return <PictureAsPdfRoundedIcon />;
    case "video": return <VideoLibraryRoundedIcon />;
    case "link": return <LinkRoundedIcon />;
    default: return <CloudUploadRoundedIcon />;
  }
};

// ---- Upload/Edit Dialog Component ----
function ResourceDialog({ open, onClose, onSaved, initial, events }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "file",
    event_id: "",
    file: null,
    link_url: "",
    video_url: "",
    tags: [],
    publishNow: true,        
    publishDate: "",         
    publishTime: "",        
    is_published: false,    
  });
  const [tagInput, setTagInput] = useState("");
  const [uploading, setUploading] = useState(false);

 useEffect(() => {
  if (initial) {
    console.log("Initial data:", initial);
    
    // Extract event ID - handle null case
    let eventId = "";
    if (initial.event_id) {
      eventId = initial.event_id;
    } else if (initial.event && typeof initial.event === 'object') {
      eventId = initial.event.id;
    } else if (initial.event) {
      eventId = initial.event;
    }
    // If still empty, leave it empty so user can select
    const dt = initial.publish_at ? new Date(initial.publish_at) : null;
    const publishNow = initial.is_published || !dt;
    const dStr = dt ? dt.toISOString().slice(0, 10) : "";
    const tStr = dt ? dt.toISOString().slice(11, 16) : "";
    setForm({
      title: initial.title || "",
      description: initial.description || "",
      type: initial.type || "file",
      event_id: eventId,  // Will be "" if null
      file: null,
      link_url: initial.link_url || "",
      video_url: initial.video_url || "",
      tags: initial.tags || [],
      publishNow,
      publishDate: dStr,
      publishTime: tStr,
      is_published: initial.is_published || false,
    });
  } else {
    setForm({
      title: "",
      description: "",
      type: "file",
      event_id: "",
      file: null,
      link_url: "",
      video_url: "",
      tags: [],
      publishNow: true,
      publishDate: "",
      publishTime: "",
      is_published: false,
    });
  }
}, [initial, open]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setForm((prev) => ({ ...prev, file }));
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !form.tags.includes(tagInput.trim())) {
      setForm((prev) => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }));
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag) => {
    setForm((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));
  };

  const handleSubmit = async () => {
  if (!form.title || !form.event_id) {
    alert("Please fill in title and select an event");
    return;
  }
  if (!form.publishNow) {
   if (!form.publishDate || !form.publishTime) {
     alert("Please pick a publish date and time or turn on 'Publish immediately'.");
     return;
   }
   const scheduled = new Date(`${form.publishDate}T${form.publishTime}:00`);
   if (isNaN(scheduled.getTime())) {
     alert("Invalid schedule date/time.");
     return;
   }
 }

  if (form.type === "file" && !form.file && !initial) {
    alert("Please select a file to upload");
    return;
  }

  if (form.type === "link" && !form.link_url) {
    alert("Please provide a link URL");
    return;
  }

  if (form.type === "video" && !form.video_url) {
    alert("Please provide a video URL");
    return;
  }

  setUploading(true);
  try {
    const token = localStorage.getItem("access_token");
    
    // Get the selected event's community_id
    const selectedEvent = events.find(e => String(e.id) === String(form.event_id));


    // This extracts from the API response shape guaranteed by your serializer
    const orgId = selectedEvent?.community;
    const formData = new FormData();
    if (orgId !== null && Number.isInteger(orgId)) {
      formData.append('communityid', String(orgId));
    } else {
      console.log('Selected Event:', selectedEvent);
      alert("No valid community id found for the selected event. Please check your event data.");
      return;
    }
    
    
    
    formData.append("title", form.title);
    formData.append("description", form.description);
    formData.append("type", form.type);
    formData.append("event", form.event_id);
    
    // CRITICAL FIX: Add community_id from the selected event
    formData.append("community_id", String(orgId));
    
    if (form.publishNow) {
     formData.append("is_published", "true");
    } else {
    const iso = new Date(`${form.publishDate}T${form.publishTime}:00`).toISOString();
    formData.append("is_published", "false");
    formData.append("publish_at", iso);
    }
    
    if (form.type === "file" && form.file) {
      formData.append("file", form.file);
    } else if (form.type === "link") {
      formData.append("link_url", form.link_url);
    } else if (form.type === "video") {
      formData.append("video_url", form.video_url);
    }

    if (form.tags.length > 0) {
      form.tags.forEach(tag => formData.append("tags", tag));
    }

    const config = {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "multipart/form-data",
      },
    };

    if (initial) {
      await axios.patch(`${API}/content/resources/${initial.id}/`, formData, config);
    } else {
      await axios.post(`${API}/content/resources/`, formData, config);
    }

    onSaved();
    onClose();
  } catch (error) {
    console.error("Error saving resource:", error);
    
    let errorMsg = "An error occurred";
    if (error.response?.data) {
      const errors = error.response.data;
      if (typeof errors === 'object') {
        errorMsg = Object.entries(errors)
          .map(([field, messages]) => {
            const msgs = Array.isArray(messages) ? messages.join(', ') : messages;
            return `${field}: ${msgs}`;
          })
          .join('\n');
      } else {
        errorMsg = errors;
      }
    } else if (error.message) {
      errorMsg = error.message;
    }
    
    alert(`Failed to ${initial ? "update" : "create"} resource:\n${errorMsg}`);
  } finally {
    setUploading(false);
  }
};

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initial ? "Edit Resource" : "Upload Resource"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <FormControl fullWidth required>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
              Resource Type
            </Typography>
            <Select
              value={form.type}
              onChange={(e) => handleChange("type", e.target.value)}
            >
              <MenuItem value="file">File (PDF/Document)</MenuItem>
              <MenuItem value="link">Link</MenuItem>
              <MenuItem value="video">Video URL</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Title"
            value={form.title}
            onChange={(e) => handleChange("title", e.target.value)}
            fullWidth
            required
          />
          
          <TextField
            label="Description"
            value={form.description}
            onChange={(e) => handleChange("description", e.target.value)}
            multiline
            rows={3}
            fullWidth
          />

          

          <FormControl fullWidth required>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
              Select Event
            </Typography>
            <Select
              value={form.event_id}
              onChange={(e) => handleChange("event_id", e.target.value)}
              displayEmpty
            >
              <MenuItem value="" disabled>
                Choose an event
              </MenuItem>
              {events.map((event) => (
                <MenuItem key={event.id} value={String(event.id)}>
                  {event.title || event.name}
                </MenuItem>
              ))}
            </Select>
            {/* Show current file info when editing */}
            {initial && initial.file && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                {/* Current file: {initial.file.split('/').pop()} */}
              </Typography>
            )}
          </FormControl>

          {form.type === "file" && (
          <Box>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
              Upload File 
            </Typography>
            
            {/* Show current file info when editing */}
            {initial && initial.file && !form.file && (
              <Box sx={{ mb: 1, p: 1, bgcolor: 'success.50', borderRadius: 1, border: '1px solid', borderColor: 'success.200' }}>
                <Typography variant="caption" color="success.main">
                  ✓ Current file: {initial.file.split('/').pop()}
                </Typography>
              </Box>
            )}
            
            <Button
              variant="outlined"
              component="label"
              startIcon={<CloudUploadRoundedIcon />}
              fullWidth
              sx={{
                justifyContent: 'flex-start',
                textTransform: 'none',
                color: form.file ? 'success.main' : 'text.secondary'
              }}
            >
              {form.file ? form.file.name : initial ? "Change File" : "Choose File"}
              <input 
                type="file" 
                hidden 
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
              />
            </Button>
            
            {form.file && (
              <Typography variant="caption" color="success.main" sx={{ mt: 0.5, display: 'block' }}>
                ✓ New file selected: {form.file.name} ({(form.file.size / 1024).toFixed(2)} KB)
              </Typography>
            )}
          </Box>
        )}
          {form.type === "link" && (
            <TextField
              label="Link URL"
              value={form.link_url}
              onChange={(e) => handleChange("link_url", e.target.value)}
              placeholder="https://example.com"
              fullWidth
              required
            />
          )}

          {form.type === "video" && (
            <TextField
              label="Video URL"
              value={form.video_url}
              onChange={(e) => handleChange("video_url", e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              fullWidth
              required
            />
          )}

          <Box>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
              Tags
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
              <TextField
                size="small"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAddTag()}
                placeholder="Add a tag"
                fullWidth
              />
              <Button onClick={handleAddTag} variant="outlined" size="small">
                Add
              </Button>
            </Stack>
            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 1 }}>
              {form.tags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  onDelete={() => handleRemoveTag(tag)}
                  size="small"
                />
              ))}
            </Stack>
          </Box>

          <FormControlLabel
            control={
              <Switch
                checked={form.publishNow}
                onChange={(e) => handleChange("publishNow", e.target.checked)}
              />
            }
            label="Publish immediately"
          />

          {!form.publishNow && (
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Publish date"
                type="date"
                value={form.publishDate}
                onChange={(e) => handleChange("publishDate", e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
                required
              />
              <TextField
                label="Publish time"
                type="time"
                value={form.publishTime}
                onChange={(e) => handleChange("publishTime", e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
                required
              />
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={uploading}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={uploading}>
          {uploading ? "Saving..." : initial ? "Update" : "Upload"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ---- Main Component ----
export default function MyResourcesAdmin() {
  const [events, setEvents] = useState([]);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [currentTab, setCurrentTab] = useState(0);
  
  // Resources state with pagination
  const [items, setItems] = useState([]);
  const [resourcesTotal, setResourcesTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [resourceQuery, setResourceQuery] = useState("");
  const [resourceFilterType, setResourceFilterType] = useState("");
  const [resourceSort, setResourceSort] = useState("newest");
  const [resourcePage, setResourcePage] = useState(1);
  const RESOURCE_ITEMS_PER_PAGE = 10;
  
  // Activity Feed State with pagination
  const [feedItems, setFeedItems] = useState([]);
  const [feedTotal, setFeedTotal] = useState(0);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedQuery, setFeedQuery] = useState("");
  const [feedFilterType, setFeedFilterType] = useState("");
  const [feedSort, setFeedSort] = useState("newest");
  const [feedPage, setFeedPage] = useState(1);
  const FEED_ITEMS_PER_PAGE = 10;

  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const config = { headers: { "Authorization": `Bearer ${token}` } };
      const response = await axios.get(`${API}/users/me/`, config);
      setCurrentUser(response.data);
      return response.data;
    } catch (error) {
      console.error("Error fetching current user:", error);
      return null;
    }
  };

  // Fetch resources with server-side pagination
  const fetchResources = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const offset = (resourcePage - 1) * RESOURCE_ITEMS_PER_PAGE;
      
      const params = new URLSearchParams({
        limit: RESOURCE_ITEMS_PER_PAGE.toString(),
        offset: offset.toString(),
      });
      
      if (resourceQuery) params.append('search', resourceQuery);
      if (resourceFilterType) params.append('type', resourceFilterType);
      if (resourceSort === 'newest') params.append('ordering', '-created_at');
      else if (resourceSort === 'oldest') params.append('ordering', 'created_at');
      
      const config = { headers: { "Authorization": `Bearer ${token}` } };
      const response = await axios.get(`${API}/content/resources/?${params.toString()}`, config);
      
      if (response.data.results) {
        const allResources = response.data.results;
        const userResources = allResources.filter((r) => {
          const isOwner = r.uploaded_by_id === currentUser.id ||
            r.created_by === currentUser.id ||
            r.user_id === currentUser.id ||
            r.uploaded_by === currentUser.id ||
            r.author === currentUser.id;
          return isOwner;
        });
        setItems(userResources);
        setResourcesTotal(response.data.count || userResources.length);
      } else {
        const allResources = Array.isArray(response.data) ? response.data : [];
        const userResources = allResources.filter((r) => {
          const isOwner = r.uploaded_by_id === currentUser.id ||
            r.created_by === currentUser.id ||
            r.user_id === currentUser.id ||
            r.uploaded_by === currentUser.id ||
            r.author === currentUser.id;
          return isOwner;
        });
        setItems(userResources);
        setResourcesTotal(userResources.length);
      }
    } catch (error) {
      console.error("Error fetching resources:", error);
      setItems([]);
      setResourcesTotal(0);
    } finally {
      setLoading(false);
    }
  };

  // Fetch feed with server-side pagination
  const fetchFeed = async () => {
    if (!currentUser) return;
    
    setFeedLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const offset = (feedPage - 1) * FEED_ITEMS_PER_PAGE;
      
      const params = new URLSearchParams({
        limit: FEED_ITEMS_PER_PAGE.toString(),
        offset: offset.toString(),
      });
      
      if (feedQuery) params.append('search', feedQuery);
      if (feedFilterType) params.append('resource_type', feedFilterType);
      if (feedSort === 'newest') params.append('ordering', '-created_at');
      else if (feedSort === 'oldest') params.append('ordering', 'created_at');
      
      const config = { headers: { "Authorization": `Bearer ${token}` } };
      const response = await axios.get(`${API}/activity/feed/?${params.toString()}`, config);
      
      if (response.data.results) {
        setFeedItems(response.data.results);
        setFeedTotal(response.data.count || response.data.results.length);
      } else {
        const data = Array.isArray(response.data) ? response.data : [];
        setFeedItems(data);
        setFeedTotal(data.length);
      }
    } catch (error) {
      console.error("Error fetching activity feed:", error);
      setFeedItems([]);
      setFeedTotal(0);
    } finally {
      setFeedLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const config = { headers: { "Authorization": `Bearer ${token}` } };
      let response;
      try {
        response = await axios.get(`${API}/events/`, config);
      } catch {
        response = await axios.get(`${API}/events/list/`, config);
      }
      const allEvents = Array.isArray(response.data) ? response.data : response.data.results || [];
      
      // Show ALL events, not just user's events
      setEvents(allEvents);
    } catch (error) {
      console.error("Error fetching events:", error);
      setEvents([]);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await fetchCurrentUser();
    };
    loadData();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchEvents();
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser && currentTab === 0) {
      fetchResources();
    }
  }, [currentUser, currentTab, resourcePage, resourceQuery, resourceFilterType, resourceSort]);

  useEffect(() => {
    if (currentUser && currentTab === 1) {
      fetchFeed();
    }
  }, [currentUser, currentTab, feedPage, feedQuery, feedFilterType, feedSort]);

  useEffect(() => { setResourcePage(1); }, [resourceQuery, resourceFilterType, resourceSort]);
  useEffect(() => { setFeedPage(1); }, [feedQuery, feedFilterType, feedSort]);

  const totalResourcePages = Math.ceil(resourcesTotal / RESOURCE_ITEMS_PER_PAGE);
  const totalFeedPages = Math.ceil(feedTotal / FEED_ITEMS_PER_PAGE);

  const onDelete = async (row) => {
    try {
      const token = localStorage.getItem("access_token");
      const config = { headers: { "Authorization": `Bearer ${token}` } };
      await axios.delete(`${API}/content/resources/${row.id}/`, config);
      fetchResources();
      fetchFeed();
    } catch (error) {
      console.error("Error deleting resource:", error);
    }
  };
  const onTogglePublish = async (row) => {
    try {
      const token = localStorage.getItem("access_token");
      const config = { headers: { "Authorization": `Bearer ${token}` } };
      await axios.patch(
        `${API}/content/resources/${row.id}/`,
        { is_published: !row.is_published },
        config
      );
      fetchResources();
      fetchFeed();
    } catch (error) {
      console.error("Error toggling publish status:", error);
    }
  };

  const handleResourceSaved = () => {
    fetchResources();
    fetchFeed();
  };

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" sx={{ mb: 1 }}>My Resources</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Manage resources and activities for your events
      </Typography>

      <Tabs value={currentTab} onChange={(e, newValue) => setCurrentTab(newValue)} sx={{ mb: 3 }}>
        <Tab label={`RESOURCES (${resourcesTotal})`} />
        <Tab label={`ACTIVITY FEED (${feedTotal})`} />
      </Tabs>

      <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: "wrap" }}>
        <TextField
          placeholder={currentTab === 0 ? "Search resources..." : "Search activities..."}
          value={currentTab === 0 ? resourceQuery : feedQuery}
          onChange={(e) => currentTab === 0 ? setResourceQuery(e.target.value) : setFeedQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon />
              </InputAdornment>
            ),
          }}
          sx={{ flexGrow: 1, minWidth: 250 }}
          size="small"
        />
        <Select
          value={currentTab === 0 ? resourceFilterType : feedFilterType}
          onChange={(e) => currentTab === 0 ? setResourceFilterType(e.target.value) : setFeedFilterType(e.target.value)}
          displayEmpty
          size="small"
          sx={{ minWidth: 120 }}
        >
          <MenuItem value="">Type</MenuItem>
          <MenuItem value="file">File</MenuItem>
          <MenuItem value="link">Link</MenuItem>
          <MenuItem value="video">Video</MenuItem>
        </Select>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="body2">Sort</Typography>
          <Select
            value={currentTab === 0 ? resourceSort : feedSort}
            onChange={(e) => currentTab === 0 ? setResourceSort(e.target.value) : setFeedSort(e.target.value)}
            size="small"
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="newest">Newest first</MenuItem>
            <MenuItem value="oldest">Oldest first</MenuItem>
          </Select>
        </Box>
        {currentTab === 0 && (
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            Upload Resource
          </Button>
        )}
      </Stack>

      {currentTab === 0 && (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Showing {items.length > 0 ? ((resourcePage - 1) * RESOURCE_ITEMS_PER_PAGE) + 1 : 0}–{Math.min(resourcePage * RESOURCE_ITEMS_PER_PAGE, resourcesTotal)} of {resourcesTotal} resources
          </Typography>
          {loading ? (
            <Box sx={{ p: 8, textAlign: "center" }}>Loading...</Box>
          ) : items.length === 0 ? (
            <Box sx={{ p: 8, textAlign: "center" }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>No resources found</Typography>
              <Typography variant="body2" color="text.secondary">Upload your first resource to get started</Typography>
            </Box>
          ) : (
            <>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Title</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          <Stack direction="row" spacing={1} alignItems="center">
                            {iconForType(row.type)}
                            <span>{row.title}</span>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Chip label={row.type} size="small" sx={{ textTransform: 'capitalize' }} />
                        </TableCell>
                        <TableCell>
                          {row.created_at ? new Date(row.created_at).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          }) : "-"}
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={row.is_published ? "Published" : "Draft"} 
                            size="small"
                            icon={row.is_published ? <PublicRoundedIcon /> : <PublicOutlinedIcon />}
                            sx={
                              row.is_published 
                                ? {
                                    bgcolor: '#d1fae5',
                                    color: '#065f46',
                                    fontWeight: 600,
                                    '& .MuiChip-icon': { color: '#059669' }
                                  }
                                : {
                                    bgcolor: '#f3f4f6',
                                    color: '#6b7280',
                                    fontWeight: 500
                                  }
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1}>
                            {(row.file || row.link_url || row.video_url) && (
                              <Tooltip title="View">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    const url = row.file || row.link_url || row.video_url;
                                    window.open(url, "_blank");
                                  }}
                                >
                                  <VisibilityRoundedIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                            
                          
                            <Tooltip title="Edit">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setEditing(row);
                                  setDialogOpen(true);
                                }}
                              >
                                <EditRoundedIcon />
                              </IconButton>
                            </Tooltip>
                            
                            {/* <Tooltip title={row.is_published ? "Unpublish" : "Publish"}>
                              <IconButton
                                size="small"
                                onClick={() => onTogglePublish(row)}
                                color={row.is_published ? "primary" : "default"}
                              >
                                {row.is_published ? <PublicRoundedIcon /> : <PublicOutlinedIcon />}
                              </IconButton>
                            </Tooltip> */}
                            
                            <Tooltip title="Delete">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => setPendingDelete(row)}
                              >
                                <DeleteRoundedIcon />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              
              {totalResourcePages > 1 && (
                <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                  <Pagination 
                    count={totalResourcePages} 
                    page={resourcePage} 
                    onChange={(e, value) => setResourcePage(value)} 
                    color="primary" 
                    shape="rounded" 
                  />
                </Box>
              )}
            </>
          )}
        </>
      )}

      {currentTab === 1 && (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Showing {feedItems.length > 0 ? ((feedPage - 1) * FEED_ITEMS_PER_PAGE) + 1 : 0}–{Math.min(feedPage * FEED_ITEMS_PER_PAGE, feedTotal)} of {feedTotal} activities
          </Typography>
          {feedLoading ? (
            <Box sx={{ p: 8, textAlign: "center" }}>Loading...</Box>
          ) : feedItems.length === 0 ? (
            <Box sx={{ p: 8, textAlign: "center" }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>No activity found</Typography>
              <Typography variant="body2" color="text.secondary">Activity will appear here when resources are uploaded</Typography>
            </Box>
          ) : (
            <>
              <Stack spacing={2}>
                {feedItems.map((item) => (
                  <Paper key={item.id} sx={{ p: 2 }}>
                    <Stack direction="row" spacing={2} alignItems="flex-start">
                      {iconForType(item.metadata?.resource_type)}
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="body1">
                          {item.metadata?.actor_name || "Someone"} uploaded resource: "{item.metadata?.title || "Untitled"}"
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(item.created_at).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          })}
                        </Typography>
                        {item.metadata?.tags && item.metadata.tags.length > 0 && (
                          <Box sx={{ mt: 1, display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                            {item.metadata.tags.map((tag, idx) => (
                              <Chip key={idx} label={tag} size="small" variant="outlined" />
                            ))}
                          </Box>
                        )}
                      </Box>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
              
              {totalFeedPages > 1 && (
                <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                  <Pagination 
                    count={totalFeedPages} 
                    page={feedPage} 
                    onChange={(e, value) => setFeedPage(value)} 
                    color="primary" 
                    shape="rounded" 
                  />
                </Box>
              )}
            </>
          )}
        </>
      )}

      <ResourceDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        initial={editing}
        events={events}
        onSaved={handleResourceSaved}
      />
    {/* Confirm Delete Dialog */}
      <Dialog
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          {pendingDelete ? <>Delete "{pendingDelete.title}"?</> : "Delete resource?"}
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this resource?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingDelete(null)} color="secondary" variant="outlined">
            Cancel
          </Button>
          <Button
            onClick={async () => {
              await onDelete(pendingDelete);
              setPendingDelete(null);
            }}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}