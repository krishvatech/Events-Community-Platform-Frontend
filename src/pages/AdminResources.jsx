// src/pages/MyResourcesAdmin.jsx

import React, { useEffect, useState } from "react";
import { isOwnerUser } from "../utils/adminRole";
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, InputAdornment, MenuItem, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Tooltip, Typography, FormControlLabel, Paper,
  Select, Pagination, Switch, FormControl, useMediaQuery,
  Menu, ListItemIcon, ListItemText,
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
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import axios from "axios";

const RAW_API = (import.meta.env?.VITE_API_BASE_URL || "http://localhost:8000")
  .toString()
  .replace(/\/+$/, "");
const API = RAW_API.endsWith("/api") ? RAW_API : `${RAW_API}/api`;

const iconForType = (t) => {
  switch (t) {
    case "file":
      return <PictureAsPdfRoundedIcon />;
    case "video":
      return <VideoLibraryRoundedIcon />;
    case "link":
      return <LinkRoundedIcon />;
    default:
      return <CloudUploadRoundedIcon />;
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
      // Always keep event_id as a string for the <Select>
      const eventIdRaw = initial?.event_id ?? initial?.event?.id ?? initial?.event ?? "";
      const eventId = eventIdRaw ? String(eventIdRaw) : "";

      const dt = initial.publish_at ? new Date(initial.publish_at) : null;
      const publishNow = initial.is_published || !dt;
      const dStr = dt ? dt.toISOString().slice(0, 10) : "";
      const tStr = dt ? dt.toISOString().slice(11, 16) : "";

      setForm({
        title: initial.title || "",
        description: initial.description || "",
        type: initial.type || "file",
        event_id: eventId, // string
        file: null,
        link_url: initial.link_url || "",
        video_url: initial.video_url || "",
        tags: initial.tags || [],
        publishNow,
        publishDate: dStr,
        publishTime: tStr,
        is_published: !!initial.is_published,
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

      // 1) Find the selected event
      const selectedEvent = events.find((e) => String(e.id) === String(form.event_id));

      // 2) Resolve community id from various possible shapes
      const rawCommunityId =
        selectedEvent?.community_id ??
        selectedEvent?.communityId ??
        selectedEvent?.community?.id ??
        selectedEvent?.community; // if backend returns a plain id as "community"

      if (!selectedEvent || !rawCommunityId) {
        alert("No valid community_id found for the selected event. Please check your /events response.");
        setUploading(false);
        return;
      }

      // 3) Build FormData with the CORRECT keys expected by DRF
      const formData = new FormData();
      formData.append("community_id", String(rawCommunityId)); // correct key
      formData.append("event_id", String(form.event_id)); // correct key

      formData.append("title", form.title);
      formData.append("description", form.description);
      formData.append("type", form.type);

      if (form.publishNow) {
        formData.append("is_published", "true");
      } else {
        const iso = new Date(`${form.publishDate}T${form.publishTime}:00`).toISOString();
        formData.append("is_published", "false");
        formData.append("publish_at", iso);
      }

      if (form.type === "file" && form.file) {
        formData.append("file", form.file);
      }
      if (form.type === "link") {
        formData.append("link_url", form.link_url);
      }
      if (form.type === "video") {
        formData.append("video_url", form.video_url);
      }

      form.tags.forEach((tag) => formData.append("tags", tag));

      const config = { headers: { Authorization: `Bearer ${token}` } };

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
        if (typeof errors === "object") {
          errorMsg = Object.entries(errors)
            .map(([field, messages]) => {
              const msgs = Array.isArray(messages) ? messages.join(", ") : messages;
              return `${field}: ${msgs}`;
            })
            .join("\n");
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
              value={String(form.event_id)}
              onChange={(e) => handleChange("event_id", String(e.target.value))}
              displayEmpty
            >
              <MenuItem value="" disabled>
                Choose an event
              </MenuItem>
              {events.map((ev) => (
                <MenuItem key={ev.id} value={String(ev.id)}>
                  {ev.title || ev.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {form.type === "file" && (
            <Box>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                Upload File
              </Typography>

              {initial && initial.file && !form.file && (
                <Box
                  sx={{
                    mb: 1,
                    p: 1,
                    bgcolor: "success.50",
                    borderRadius: 1,
                    border: "1px solid",
                    borderColor: "success.200",
                  }}
                >
                  <Typography variant="caption" color="success.main">
                    ✓ Current file: {initial.file.split("/").pop()}
                  </Typography>
                </Box>
              )}

              <Button
                variant="outlined"
                component="label"
                startIcon={<CloudUploadRoundedIcon />}
                fullWidth
                sx={{
                  justifyContent: "flex-start",
                  textTransform: "none",
                  color: form.file ? "success.main" : "text.secondary",
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
                <Typography
                  variant="caption"
                  color="success.main"
                  sx={{ mt: 0.5, display: "block" }}
                >
                  ✓ New file selected: {form.file.name} (
                  {(form.file.size / 1024).toFixed(2)} KB)
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
  const isDesktop = useMediaQuery("(min-width:900px)");
  const [events, setEvents] = useState([]);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [actionMenuAnchor, setActionMenuAnchor] = useState(null);
  const [actionMenuRow, setActionMenuRow] = useState(null);
  const [viewResource, setViewResource] = useState(null);

  const isOwner = currentUser ? isOwnerUser(currentUser) : false;

  // Resources state with pagination
  const [items, setItems] = useState([]);
  const [resourcesTotal, setResourcesTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [resourceQuery, setResourceQuery] = useState("");
  const [resourceFilterType, setResourceFilterType] = useState("");
  const [resourceSort, setResourceSort] = useState("newest");
  const [resourcePage, setResourcePage] = useState(1);
  const RESOURCE_ITEMS_PER_PAGE = 10;

  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.get(`${API}/users/me/`, config);
      setCurrentUser(response.data);
      return response.data;
    } catch (error) {
      console.error("Error fetching current user:", error);
      return null;
    }
  };

  const filterResourcesForUser = (allResources) => {
    if (!currentUser) return [];

    const ownerUser = isOwnerUser(currentUser);

    // ✅ Owner: show only resources uploaded/owned by this user (same logic as before)
    if (ownerUser) {
      return allResources.filter((r) => {
        const isOwner =
          r.uploaded_by_id === currentUser.id ||
          r.created_by === currentUser.id ||
          r.user_id === currentUser.id ||
          r.uploaded_by === currentUser.id ||
          r.author === currentUser.id;
        return isOwner;
      });
    }

    // ✅ Staff: show resources only for events that this user has access to / joined
    const joinedEventIds = new Set(events.map((e) => String(e.id)));

    return allResources.filter((r) => {
      const rawEventId =
        r.event_id ??
        (r.event && (r.event.id ?? r.event)) ??
        null;

      if (!rawEventId) return false;
      return joinedEventIds.has(String(rawEventId));
    });
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

      if (resourceQuery) params.append("search", resourceQuery);
      if (resourceFilterType) params.append("type", resourceFilterType);
      if (resourceSort === "newest") params.append("ordering", "-created_at");
      else if (resourceSort === "oldest") params.append("ordering", "created_at");

      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.get(
        `${API}/content/resources/?${params.toString()}`,
        config
      );

      if (response.data.results) {
        const allResources = response.data.results;
        const visibleResources = filterResourcesForUser(allResources);
        setItems(visibleResources);
        setResourcesTotal(response.data.count || visibleResources.length);
      } else {
        const allResources = Array.isArray(response.data) ? response.data : [];
        const visibleResources = filterResourcesForUser(allResources);
        setItems(visibleResources);
        setResourcesTotal(visibleResources.length);
      }
    } catch (error) {
      console.error("Error fetching resources:", error);
      setItems([]);
      setResourcesTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const handleResourceSaved = () => {
    fetchResources();
  };

  const isActionMenuOpen = Boolean(actionMenuAnchor);

  const handleOpenActionsMenu = (event, row) => {
    setActionMenuAnchor(event.currentTarget);
    setActionMenuRow(row);
  };

  const handleCloseActionsMenu = () => {
    setActionMenuAnchor(null);
    setActionMenuRow(null);
  };


  const fetchEvents = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      let response;
      try {
        response = await axios.get(`${API}/events/`, config);
      } catch {
        response = await axios.get(`${API}/events/list/`, config);
      }
      const allEvents = Array.isArray(response.data)
        ? response.data
        : response.data.results || [];
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
    if (currentUser) {
      fetchResources();
    }
  }, [currentUser, events, resourcePage, resourceQuery, resourceFilterType, resourceSort]);

  useEffect(() => {
    setResourcePage(1);
  }, [resourceQuery, resourceFilterType, resourceSort]);

  const totalResourcePages = Math.ceil(
    resourcesTotal / RESOURCE_ITEMS_PER_PAGE
  );

  const onDelete = async (row) => {
    try {
      const token = localStorage.getItem("access_token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.delete(`${API}/content/resources/${row.id}/`, config);
      fetchResources();
    } catch (error) {
      console.error("Error deleting resource:", error);
    }
  };

  function getEventLabel(row) {
    const ev =
      row.event ||
      events.find((e) => String(e.id) === String(row.event_id));

    return (
      ev?.title ||
      ev?.name ||
      row.event_title ||
      row.event_name ||
      row.event_id ||
      "-"
    );
  }

  return (
    <Box sx={{ p: 4 }}>
      {/* Header: title + Upload button aligned */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "flex-start", sm: "center" }}
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h4" sx={{ mb: 0.5 }}>
            My Resources
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage resources for your events
          </Typography>
        </Box>

        {isOwner && (
          <Box sx={{ width: { xs: "100%", sm: "auto" } }}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<AddRoundedIcon />}
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
              sx={{ whiteSpace: "nowrap" }}
            >
              Upload Resource
            </Button>
          </Box>
        )}

      </Stack>

      {/* Filter bar – only for Resources now */}
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        sx={{ mb: 3 }}
        alignItems={{ xs: "stretch", md: "center" }}
      >
        <TextField
          placeholder="Search resources..."
          value={resourceQuery}
          onChange={(e) => setResourceQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon />
              </InputAdornment>
            ),
          }}
          sx={{
            flexGrow: 1,
            minWidth: { xs: "100%", sm: 220 },
          }}
          size="small"
        />

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{ width: { xs: "100%", md: "auto" } }}
        >
          <Select
            value={resourceFilterType}
            onChange={(e) => setResourceFilterType(e.target.value)}
            displayEmpty
            size="small"
            sx={{ minWidth: { xs: "100%", sm: 120 } }}
          >
            <MenuItem value="">Type</MenuItem>
            <MenuItem value="file">File</MenuItem>
            <MenuItem value="link">Link</MenuItem>
            <MenuItem value="video">Video</MenuItem>
          </Select>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              width: { xs: "100%", sm: "auto" },
            }}
          >
            <Typography
              variant="body2"
              sx={{ whiteSpace: "nowrap", mr: { xs: 0, sm: 0.5 } }}
            >
              Sort
            </Typography>
            <Select
              value={resourceSort}
              onChange={(e) => setResourceSort(e.target.value)}
              size="small"
              sx={{ minWidth: { xs: "100%", sm: 140 }, flex: 1 }}
            >
              <MenuItem value="newest">Newest first</MenuItem>
              <MenuItem value="oldest">Oldest first</MenuItem>
            </Select>
          </Box>
        </Stack>
      </Stack>

      {/* Resources table */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Showing{" "}
        {items.length > 0
          ? (resourcePage - 1) * RESOURCE_ITEMS_PER_PAGE + 1
          : 0}
        –
        {Math.min(resourcePage * RESOURCE_ITEMS_PER_PAGE, resourcesTotal)} of{" "}
        {resourcesTotal} resources
      </Typography>

      {loading ? (
        <Box sx={{ p: 8, textAlign: "center" }}>Loading...</Box>
      ) : items.length === 0 ? (
        <Box sx={{ p: 8, textAlign: "center" }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No resources found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Upload your first resource to get started
          </Typography>
        </Box>
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                    Type
                  </TableCell>
                  <TableCell>Event</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((row) => {
                  const eventLabel = getEventLabel(row);

                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        {(row.file || row.link_url || row.video_url) && (
                          <Tooltip>
                            <IconButton
                              size="small"
                              onClick={() => {
                                const url =
                                  row.file || row.link_url || row.video_url;
                                window.open(url, "_blank");
                              }}
                            >
                              <Stack direction="row" spacing={1} alignItems="center">
                                {iconForType(row.type)}
                                <span>{row.title}</span>
                              </Stack>
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>

                      <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                        <Chip
                          label={row.type}
                          size="small"
                          sx={{ textTransform: "capitalize" }}
                        />
                      </TableCell>

                      {/* 🆕 Event column */}
                      <TableCell>{eventLabel}</TableCell>

                      <TableCell align="right">
                        {isDesktop ? (
                          <Stack
                            direction="row"
                            spacing={1}
                            justifyContent="flex-end"
                          >
                            {(row.file || row.link_url || row.video_url) && (
                              <Tooltip title="View details">
                                <IconButton
                                  size="small"
                                  onClick={() => setViewResource(row)}
                                >
                                  <VisibilityRoundedIcon />
                                </IconButton>
                              </Tooltip>
                            )}

                            {isOwner && (
                              <>
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

                                <Tooltip title="Delete">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => setPendingDelete(row)}
                                  >
                                    <DeleteRoundedIcon />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}
                          </Stack>
                        ) : (
                          <IconButton
                            size="small"
                            onClick={(e) => handleOpenActionsMenu(e, row)}
                          >
                            <MoreVertRoundedIcon />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
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

      {/* Mobile Actions menu */}
      <Menu
        anchorEl={actionMenuAnchor}
        open={isActionMenuOpen}
        onClose={handleCloseActionsMenu}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        {actionMenuRow &&
          (actionMenuRow.file ||
            actionMenuRow.link_url ||
            actionMenuRow.video_url) && (
            <MenuItem
              onClick={() => {
                setViewResource(actionMenuRow);
                handleCloseActionsMenu();
              }}
            >
              <ListItemIcon>
                <VisibilityRoundedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="View details" />
            </MenuItem>
          )}


        {isOwner && actionMenuRow && (
          <MenuItem
            onClick={() => {
              setEditing(actionMenuRow);
              setDialogOpen(true);
              handleCloseActionsMenu();
            }}
          >
            <ListItemIcon>
              <EditRoundedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Edit" />
          </MenuItem>
        )}

        {isOwner && actionMenuRow && (
          <MenuItem
            onClick={() => {
              setPendingDelete(actionMenuRow);
              handleCloseActionsMenu();
            }}
          >
            <ListItemIcon>
              <DeleteRoundedIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText primary="Delete" />
          </MenuItem>
        )}
      </Menu>

      {/* View Details dialog */}
      <Dialog
        open={!!viewResource}
        onClose={() => setViewResource(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {viewResource ? viewResource.title : "Resource details"}
        </DialogTitle>

        <DialogContent dividers>
          {viewResource && (
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} alignItems="center">
                {iconForType(viewResource.type)}
                <Chip
                  label={viewResource.type}
                  size="small"
                  sx={{ textTransform: "capitalize" }}
                />
              </Stack>

              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Event
                </Typography>
                <Typography variant="body2">
                  {getEventLabel(viewResource)}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Description
                </Typography>
                <Typography variant="body2">
                  {viewResource.description || "—"}
                </Typography>
              </Box>

              {Array.isArray(viewResource.tags) &&
                viewResource.tags.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Tags
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {viewResource.tags.map((tag) => (
                        <Chip key={tag} label={tag} size="small" />
                      ))}
                    </Stack>
                  </Box>
                )}

              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Publish status
                </Typography>
                <Typography variant="body2">
                  {viewResource.is_published ? "Published" : "Not published"}
                </Typography>
                {viewResource.publish_at && (
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    Scheduled / published at:{" "}
                    {new Date(viewResource.publish_at).toLocaleString()}
                  </Typography>
                )}
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Timestamps
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  Created:{" "}
                  {viewResource.created_at
                    ? new Date(viewResource.created_at).toLocaleString()
                    : "—"}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  Updated:{" "}
                  {viewResource.updated_at
                    ? new Date(viewResource.updated_at).toLocaleString()
                    : "—"}
                </Typography>
              </Box>
            </Stack>
          )}
        </DialogContent>

        <DialogActions>
          {viewResource &&
            (viewResource.file ||
              viewResource.link_url ||
              viewResource.video_url) && (
              <Button
                startIcon={<VisibilityRoundedIcon />}
                onClick={() => {
                  const url =
                    viewResource.file ||
                    viewResource.link_url ||
                    viewResource.video_url;
                  window.open(url, "_blank");
                }}
              >
                Open resource
              </Button>
            )}
          <Button onClick={() => setViewResource(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Upload/Edit dialog */}
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
          <Typography>Are you sure you want to delete this resource?</Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setPendingDelete(null)}
            color="secondary"
            variant="outlined"
          >
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