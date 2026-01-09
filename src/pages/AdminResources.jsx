// src/pages/MyResourcesAdmin.jsx

import React, { useEffect, useState } from "react";
import { isOwnerUser } from "../utils/adminRole";
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, InputAdornment, MenuItem, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Tooltip, Typography, FormControlLabel, Paper,
  Select, Pagination, Switch, FormControl, useMediaQuery,
  Menu, ListItemIcon, ListItemText, Avatar, Container,
  Skeleton, Snackbar, Alert, Slide
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import { Autocomplete, CircularProgress } from "@mui/material";
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
  const [eventOptions, setEventOptions] = useState([]);
  const [eventSearch, setEventSearch] = useState("");
  const [eventOffset, setEventOffset] = useState(0);
  const [eventHasMore, setEventHasMore] = useState(true);

  const [eventLoading, setEventLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "error", // "error" | "warning" | "info" | "success"
  });

  const handleCloseSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const showSnackbar = (message, severity = "error") => {
    setSnackbar({ open: true, message, severity });
  };

  const loadEventsPage = async ({ reset = false } = {}) => {
    if (eventLoading) return;

    setEventLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const limit = 20;
      const offset = reset ? 0 : eventOffset;

      const params = new URLSearchParams();
      params.set("limit", String(limit));
      params.set("offset", String(offset));
      if (eventSearch.trim()) params.set("search", eventSearch.trim());

      const resp = await axios.get(`${API}/events/?${params.toString()}`, config);

      // If backend returns array (no pagination)
      const results = Array.isArray(resp.data) ? resp.data : (resp.data.results || []);
      const count = Array.isArray(resp.data) ? results.length : (resp.data.count ?? null);

      setEventOptions((prev) => (reset ? results : [...prev, ...results]));

      const nextOffset = offset + results.length;
      setEventOffset(nextOffset);

      if (count != null) setEventHasMore(nextOffset < count);
      else setEventHasMore(results.length === limit);
    } catch (e) {
      console.error("Error loading events:", e);
      if (reset) setEventOptions([]);
      setEventHasMore(false);
    } finally {
      setEventLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;

    // reset and load first page when dialog opens
    setEventOptions([]);
    setEventOffset(0);
    setEventHasMore(true);
    loadEventsPage({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const t = setTimeout(() => {
      setEventOffset(0);
      setEventHasMore(true);
      loadEventsPage({ reset: true });
    }, 350);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventSearch, open]);

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
      const allowedExtensions = ["pdf", "doc", "docx", "jpg", "jpeg", "png", "ppt", "pptx"];
      const fileExtension = file.name.split(".").pop().toLowerCase();

      if (!allowedExtensions.includes(fileExtension)) {
        showSnackbar(`Invalid file type. Allowed types: ${allowedExtensions.join(", ")}`, "error");
        e.target.value = ""; // Clear the input
        return;
      }

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
      showSnackbar("Please fill in title and select an event", "warning");
      return;
    }
    if (!form.publishNow) {
      if (!form.publishDate || !form.publishTime) {
        showSnackbar("Please pick a publish date and time or turn on 'Publish immediately'.", "warning");
        return;
      }
      const scheduled = new Date(`${form.publishDate}T${form.publishTime}:00`);
      if (isNaN(scheduled.getTime())) {
        showSnackbar("Invalid schedule date/time.", "error");
        return;
      }
    }

    if (form.type === "file" && !form.file && !initial) {
      showSnackbar("Please select a file to upload", "warning");
      return;
    }

    if (form.type === "link" && !form.link_url) {
      showSnackbar("Please provide a link URL", "warning");
      return;
    }

    if (form.type === "video" && !form.video_url) {
      showSnackbar("Please provide a video URL", "warning");
      return;
    }

    setUploading(true);
    try {
      const token = localStorage.getItem("access_token");

      // 1) Find the selected event
      const selectedEvent =
        eventOptions.find((e) => String(e.id) === String(form.event_id)) ||
        events.find((e) => String(e.id) === String(form.event_id));

      // 2) Resolve community id from various possible shapes
      const rawCommunityId =
        selectedEvent?.community_id ??
        selectedEvent?.communityId ??
        selectedEvent?.community?.id ??
        selectedEvent?.community; // if backend returns a plain id as "community"

      if (!selectedEvent || !rawCommunityId) {
        showSnackbar("No valid community_id found for the selected event. Please check your /events response.", "error");
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

      showSnackbar(`Failed to ${initial ? "update" : "create"} resource:\n${errorMsg}`, "error");
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
            <Autocomplete
              options={eventOptions}
              loading={eventLoading}
              getOptionLabel={(opt) => opt?.title || opt?.name || ""}
              value={
                eventOptions.find((e) => String(e.id) === String(form.event_id)) ||
                events.find((e) => String(e.id) === String(form.event_id)) ||
                null
              }
              onChange={(e, newValue) => {
                handleChange("event_id", newValue ? String(newValue.id) : "");
              }}
              inputValue={eventSearch}
              onInputChange={(e, newInput) => setEventSearch(newInput)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Event"
                  required
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {eventLoading ? <CircularProgress size={18} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              ListboxProps={{
                onScroll: (event) => {
                  const list = event.currentTarget;
                  const nearBottom =
                    list.scrollTop + list.clientHeight >= list.scrollHeight - 20;

                  if (nearBottom && eventHasMore && !eventLoading) {
                    loadEventsPage({ reset: false });
                  }
                },
              }}
            />
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
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.ppt,.pptx"
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

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        TransitionComponent={Slide}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Dialog>
  );
}

// ---- Main Component ----
export default function MyResourcesAdmin() {
  const isDesktop = useMediaQuery("(min-width:900px)");
  const [events, setEvents] = useState([]);
  const [registeredEventIds, setRegisteredEventIds] = useState([]);
  const [registeredEventsLoading, setRegisteredEventsLoading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [actionMenuAnchor, setActionMenuAnchor] = useState(null);
  const [actionMenuRow, setActionMenuRow] = useState(null);
  const [viewResource, setViewResource] = useState(null);
  const [registrationsLoadedOnce, setRegistrationsLoadedOnce] = useState(false);
  const [resourcesBootstrapped, setResourcesBootstrapped] = useState(false);

  const isOwner = currentUser ? isOwnerUser(currentUser) : false;

  // Resources state with pagination
  const [items, setItems] = useState([]);
  const [resourcesTotal, setResourcesTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [resourceQuery, setResourceQuery] = useState("");
  const [resourceFilterType, setResourceFilterType] = useState("");
  const [resourceSort, setResourceSort] = useState("newest");
  const [resourcePage, setResourcePage] = useState(1);
  const RESOURCE_ITEMS_PER_PAGE = 7;

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

  const fetchRegisteredEvents = async () => {
    setRegistrationsLoadedOnce(false);
    setRegisteredEventsLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.get(`${API}/event-registrations/mine/`, config);

      const data = response.data;
      const registrations = Array.isArray(data) ? data : data.results || [];

      const ids = registrations
        .map((reg) => {
          if (reg.event && typeof reg.event === "object") return reg.event.id;
          return reg.event_id || reg.event;
        })
        .filter(Boolean)
        .map((id) => String(id));

      setRegisteredEventIds(ids);
    } catch (error) {
      console.error("Error fetching registered events:", error);
      setRegisteredEventIds([]);
    } finally {
      setRegisteredEventsLoading(false);
      setRegistrationsLoadedOnce(true);
    }
  };


  const filterResourcesForUser = (allResources) => {
    if (!currentUser) return [];

    const ownerUser = isOwnerUser(currentUser);

    // ✅ Owner: show only resources uploaded/owned by this user
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

    // ✅ Staff: ONLY events they purchased / registered for
    if (!registeredEventIds || registeredEventIds.length === 0) {
      return [];
    }

    const allowedEventIds = new Set(registeredEventIds.map((id) => String(id)));

    return allResources.filter((r) => {
      const rawEventId =
        r.event_id ??
        (r.event && (r.event.id ?? r.event)) ??
        null;

      if (!rawEventId) return false;
      return allowedEventIds.has(String(rawEventId));
    });
  };

  // Fetch resources with server-side pagination
  const fetchResources = async () => {
    if (!currentUser) return;

    const ownerUser = isOwnerUser(currentUser);

    // ✅ Staff: if no purchased events -> no resources, skip API call
    if (
      !ownerUser &&
      (!registeredEventIds || registeredEventIds.length === 0)
    ) {
      setItems([]);
      setResourcesTotal(0);
      setLoading(false);
      setResourcesBootstrapped(true);
      return;
    }

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

        // 🔍 Check if backend is *actually* paginating
        const hasServerPagination =
          typeof response.data.count === "number" &&
          response.data.count > allResources.length;

        if (hasServerPagination) {
          // Backend respected limit/offset => use server page as-is
          setItems(visibleResources);
          setResourcesTotal(response.data.count);
        } else {
          // Backend returned full list => do client-side pagination
          const totalVisible = visibleResources.length;
          const start = (resourcePage - 1) * RESOURCE_ITEMS_PER_PAGE;
          const end = start + RESOURCE_ITEMS_PER_PAGE;

          setResourcesTotal(totalVisible);
          setItems(visibleResources.slice(start, end));
        }
      } else {
        // Plain array response, no count/results wrapper
        const allResources = Array.isArray(response.data) ? response.data : [];
        const visibleResources = filterResourcesForUser(allResources);

        const totalVisible = visibleResources.length;
        const start = (resourcePage - 1) * RESOURCE_ITEMS_PER_PAGE;
        const end = start + RESOURCE_ITEMS_PER_PAGE;

        setResourcesTotal(totalVisible);
        setItems(visibleResources.slice(start, end));
      }
    } catch (error) {
      console.error("Error fetching resources:", error);
      setItems([]);
      setResourcesTotal(0);
    } finally {
      setLoading(false);
      setResourcesBootstrapped(true);
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
      fetchRegisteredEvents();
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    // ✅ Staff must wait until registrations are fetched at least once
    if (!isOwner && !registrationsLoadedOnce) return;

    // ✅ Staff: still keep this guard
    if (!isOwner && registeredEventsLoading) return;

    fetchResources();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentUser?.id,
    resourcePage,
    resourceQuery,
    resourceFilterType,
    resourceSort,

    // keep your smart deps
    isOwner ? "ignore-loading" : registeredEventsLoading,
    isOwner ? "ignore-ids" : registeredEventIds.join(","),

    // ✅ NEW
    registrationsLoadedOnce,
  ]);


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

  const showSkeleton =
    !resourcesBootstrapped || loading || !currentUser || (!isOwner && registeredEventsLoading);

  const ResourceTableSkeleton = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Title</TableCell>
            <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>Type</TableCell>
            <TableCell>Event</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {Array.from({ length: RESOURCE_ITEMS_PER_PAGE }).map((_, idx) => (
            <TableRow key={`skeleton-${idx}`}>
              <TableCell>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Skeleton variant="circular" width={28} height={28} />
                  <Skeleton variant="text" width="65%" />
                </Stack>
              </TableCell>

              <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                <Skeleton variant="rounded" width={70} height={24} />
              </TableCell>

              <TableCell>
                <Skeleton variant="text" width="55%" />
              </TableCell>

              <TableCell align="right">
                {isDesktop ? (
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Skeleton variant="circular" width={32} height={32} />
                    <Skeleton variant="circular" width={32} height={32} />
                    <Skeleton variant="circular" width={32} height={32} />
                  </Stack>
                ) : (
                  <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                    <Skeleton variant="circular" width={32} height={32} />
                  </Box>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Container
      maxWidth="lg"
      disableGutters
      sx={{ py: 4 }}
    >
      {/* Header */}
      <Box
        className="mb-4"
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: { xs: "flex-start", sm: "center" },
          gap: 2,
        }}
      >
        <Avatar sx={{ bgcolor: "#0ea5a4" }}>
          {(currentUser?.first_name || "R")[0].toUpperCase()}
        </Avatar>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h5" className="font-extrabold">
            Resources
          </Typography>
          <Typography className="text-slate-500">
            Manage resources for your events. Upload files, links, and videos.
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
              className="rounded-xl"
              sx={{
                textTransform: "none",
                backgroundColor: "#10b8a6",
                "&:hover": { backgroundColor: "#0ea5a4" },
              }}
            >
              Upload Resource
            </Button>
          </Box>
        )}
      </Box>

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
          onChange={(e) => {
            setResourcePage(1);
            setResourceQuery(e.target.value);
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
            onChange={(e) => {
              setResourcePage(1);
              setResourceFilterType(e.target.value);
            }}
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
              onChange={(e) => {
                setResourcePage(1);
                setResourceSort(e.target.value);
              }}
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

      {showSkeleton ? (
        <>
          <Skeleton variant="text" width={280} sx={{ mb: 2 }} />
          <ResourceTableSkeleton />
        </>
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
    </Container>
  );
}
