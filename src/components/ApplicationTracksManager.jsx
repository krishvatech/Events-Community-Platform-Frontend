import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  FormControlLabel,
  Checkbox,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CheckIcon from "@mui/icons-material/Check";
import { apiClient } from "../utils/api";

/**
 * ApplicationTracksManager
 * UI for managing application tracks for an event.
 * Allows event organizers to:
 * - View list of tracks
 * - Create new tracks
 * - Edit existing tracks
 * - Disable/delete tracks
 */
export default function ApplicationTracksManager({ eventId, token }) {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTrack, setEditingTrack] = useState(null);
  const [pricingTiers, setPricingTiers] = useState([]);
  const [eventRoles, setEventRoles] = useState([]);
  const [newTierName, setNewTierName] = useState("");
  const [newTierPrice, setNewTierPrice] = useState("");
  const [editingTier, setEditingTier] = useState(null);
  const [showTierEditor, setShowTierEditor] = useState(false);
  const [tierFormData, setTierFormData] = useState({
    key: "",
    label: "",
    price: "0.00",
    currency: "USD",
    visibility: "public",
    is_default: false,
    is_active: true,
    sort_order: 0,
  });
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: "",
    message: "",
    action: null,
    data: null,
  });
  const [formData, setFormData] = useState({
    key: "",
    label: "",
    short_description: "",
    status: "open",
    sort_order: 0,
    is_active: true,
    enabled_submission_modes: ["self_submission", "confirmed"],
    role_mappings_on_acceptance: [],
  });

  // Load tracks and event roles on mount
  useEffect(() => {
    loadTracks();
    loadEventRoles();
  }, [eventId]);

  const loadTracks = async () => {
    try {
      setLoading(true);
      const { data } = await apiClient.get(`/events/${eventId}/application-tracks/`);
      // Handle both array and paginated responses
      const tracksArray = Array.isArray(data) ? data : (data.results || []);

      // Load pricing tier counts for each track
      const tracksWithTiers = await Promise.all(
        tracksArray.map(async (track) => {
          try {
            const { data: tiersData } = await apiClient.get(
              `/events/${eventId}/application-tracks/${track.id}/pricing-tiers/`
            );
            const tiersArray = Array.isArray(tiersData) ? tiersData : (tiersData?.results || []);
            return { ...track, pricing_tiers: tiersArray };
          } catch (err) {
            console.error(`Failed to load tiers for track ${track.id}:`, err);
            return { ...track, pricing_tiers: [] };
          }
        })
      );

      setTracks(tracksWithTiers);
      setError(null);
    } catch (err) {
      console.error("Failed to load tracks:", err);
      setError("Failed to load application tracks");
      setTracks([]); // Ensure tracks is always an array
    } finally {
      setLoading(false);
    }
  };

  const loadEventRoles = async () => {
    try {
      const { data } = await apiClient.get(`/events/${eventId}/roles/`);
      // Handle both paginated response and array response
      const rolesArray = Array.isArray(data) ? data : (data?.results || []);
      setEventRoles(rolesArray);
    } catch (err) {
      console.error("Failed to load event roles:", err);
      // Roles are optional, don't fail the whole component
    }
  };

  const loadPricingTiers = async (trackId) => {
    try {
      const { data } = await apiClient.get(
        `/events/${eventId}/application-tracks/${trackId}/pricing-tiers/`
      );
      // Handle both paginated and array responses
      const tiersArray = Array.isArray(data) ? data : (data?.results || []);
      setPricingTiers(tiersArray);
      return tiersArray;
    } catch (err) {
      console.error("Failed to load pricing tiers:", err);
      setPricingTiers([]);
      return [];
    }
  };

  const handleOpenDialog = async (track = null) => {
    if (track) {
      setEditingTrack(track);
      setFormData({ ...track });
      await loadPricingTiers(track.id);
    } else {
      setEditingTrack(null);
      setFormData({
        key: "",
        label: "",
        short_description: "",
        status: "open",
        sort_order: 0,
        is_active: true,
        enabled_submission_modes: ["self_submission", "confirmed"],
        role_mappings_on_acceptance: [],
      });
      setPricingTiers([]);
    }
    setNewTierName("");
    setNewTierPrice("");
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingTrack(null);
    setPricingTiers([]);
  };

  const handleAddPricingTier = async () => {
    if (!editingTrack || !newTierName.trim()) {
      setError("Tier name is required");
      return;
    }

    try {
      // FIX 1: Send complete pricing tier payload with all required fields
      await apiClient.post(
        `/events/${eventId}/application-tracks/${editingTrack.id}/pricing-tiers/`,
        {
          key: newTierName.toLowerCase().replace(/\s+/g, "_"),
          label: newTierName,
          price: newTierPrice || "0.00",
          currency: "USD",
          visibility: "public",
          is_active: true,
        }
      );
      setNewTierName("");
      setNewTierPrice("");
      await loadPricingTiers(editingTrack.id);
      setError(null);
    } catch (err) {
      console.error("Failed to add pricing tier:", err);
      // Extract error message from various response formats
      const errorData = err.response?.data;
      let errorMessage = "Failed to add pricing tier";

      if (errorData) {
        // Try detail field first
        if (errorData.detail) {
          errorMessage = errorData.detail;
        }
        // Try key field (from ValidationError on 'key')
        else if (errorData.key) {
          errorMessage = Array.isArray(errorData.key) ? errorData.key[0] : errorData.key;
        }
        // Try non_field_errors
        else if (errorData.non_field_errors) {
          errorMessage = Array.isArray(errorData.non_field_errors) ? errorData.non_field_errors[0] : errorData.non_field_errors;
        }
      }

      setError(errorMessage);
    }
  };

  const handleDeletePricingTier = (tierId) => {
    const tier = pricingTiers.find(t => t.id === tierId);
    setConfirmDialog({
      open: true,
      title: "Delete Pricing Tier",
      message: `Are you sure you want to delete "${tier?.label}"? This action cannot be undone.`,
      action: "delete_tier",
      data: tierId,
    });
  };

  const handleDeleteTrack = (trackId) => {
    const track = tracks.find(t => t.id === trackId);
    setConfirmDialog({
      open: true,
      title: "Delete Application Track",
      message: `Are you sure you want to delete the track "${track?.label}"? All associated applications will also be deleted.`,
      action: "delete_track",
      data: trackId,
    });
  };

  const handleConfirmAction = async () => {
    const { action, data } = confirmDialog;

    try {
      if (action === "delete_tier") {
        await apiClient.delete(
          `/events/${eventId}/application-tracks/${editingTrack.id}/pricing-tiers/${data}/`
        );
        await loadPricingTiers(editingTrack.id);
      } else if (action === "delete_track") {
        await apiClient.delete(`/events/${eventId}/application-tracks/${data}/`);
        await loadTracks();
      }

      setError(null);
      setConfirmDialog({ ...confirmDialog, open: false });
    } catch (err) {
      console.error("Failed to execute action:", err);
      setError(err.response?.data?.detail || "Operation failed");
    }
  };

  const handleOpenTierEditor = (tier = null) => {
    if (tier) {
      // Edit existing tier
      setEditingTier(tier);
      setTierFormData({
        key: tier.key || "",
        label: tier.label || "",
        price: tier.price || "0.00",
        currency: tier.currency || "USD",
        visibility: tier.visibility || "public",
        is_default: tier.is_default || false,
        is_active: tier.is_active !== false,
        sort_order: tier.sort_order || 0,
      });
    } else {
      // New tier
      setEditingTier(null);
      setTierFormData({
        key: "",
        label: "",
        price: "0.00",
        currency: "USD",
        visibility: "public",
        is_default: false,
        is_active: true,
        sort_order: 0,
      });
    }
    setShowTierEditor(true);
  };

  const handleSaveTierEdit = async () => {
    if (!tierFormData.label.trim() || !tierFormData.key.trim()) {
      setError("Tier label and key are required");
      return;
    }

    try {
      if (editingTier) {
        // Update existing tier
        await apiClient.patch(
          `/events/${eventId}/application-tracks/${editingTrack.id}/pricing-tiers/${editingTier.id}/`,
          tierFormData
        );
      } else {
        // Create new tier
        await apiClient.post(
          `/events/${eventId}/application-tracks/${editingTrack.id}/pricing-tiers/`,
          tierFormData
        );
      }

      // Refetch tiers and update table
      await loadPricingTiers(editingTrack.id);
      await loadTracks();
      setShowTierEditor(false);
      setEditingTier(null);
      setError(null);
    } catch (err) {
      console.error("Failed to save tier:", err);
      const errorData = err.response?.data;
      let errorMessage = "Failed to save tier";

      if (errorData?.detail) {
        errorMessage = errorData.detail;
      } else if (errorData?.key) {
        errorMessage = Array.isArray(errorData.key) ? errorData.key[0] : errorData.key;
      }

      setError(errorMessage);
    }
  };

  const handleSetDefaultTier = async (tierId) => {
    try {
      // Set this tier as default
      await apiClient.patch(
        `/events/${eventId}/application-tracks/${editingTrack.id}/pricing-tiers/${tierId}/`,
        { is_default: true }
      );

      // Refetch to see updated state
      await loadPricingTiers(editingTrack.id);
      setError(null);
    } catch (err) {
      console.error("Failed to set default tier:", err);
      setError("Failed to set default tier");
    }
  };

  const handleRoleMappingChange = (roleKey) => {
    setFormData((prev) => {
      const mappings = prev.role_mappings_on_acceptance || [];
      if (mappings.includes(roleKey)) {
        return {
          ...prev,
          role_mappings_on_acceptance: mappings.filter((r) => r !== roleKey),
        };
      } else {
        return {
          ...prev,
          role_mappings_on_acceptance: [...mappings, roleKey],
        };
      }
    });
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSaveTrack = async () => {
    try {
      if (!formData.key || !formData.label) {
        setError("Key and Label are required");
        return;
      }

      if (editingTrack) {
        // Update existing track
        await apiClient.put(
          `/events/${eventId}/application-tracks/${editingTrack.id}/`,
          formData
        );
      } else {
        // Create new track
        await apiClient.post(`/events/${eventId}/application-tracks/`, {
          ...formData,
          event_id: eventId,
        });
      }

      handleCloseDialog();
      await loadTracks();
      setError(null);
    } catch (err) {
      console.error("Failed to save track:", err);
      setError(err.response?.data?.detail || "Failed to save track");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "open":
        return "success";
      case "closed":
        return "error";
      case "invite_only":
        return "warning";
      default:
        return "default";
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "open":
        return "Open";
      case "closed":
        return "Closed";
      case "invite_only":
        return "Invite Only";
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h6">Application Tracks</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Track
        </Button>
      </Box>

      {tracks.length === 0 ? (
        <Alert severity="info">No application tracks configured yet.</Alert>
      ) : (
        <TableContainer component={Card}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                <TableCell>Label</TableCell>
                <TableCell>Key</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Submission Modes</TableCell>
                <TableCell>Roles</TableCell>
                <TableCell>Pricing Tiers</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tracks.map((track) => (
                <TableRow key={track.id}>
                  <TableCell>
                    <Stack>
                      <strong>{track.label}</strong>
                      {track.short_description && (
                        <small style={{ color: "#666" }}>
                          {track.short_description}
                        </small>
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <code>{track.key}</code>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusLabel(track.status)}
                      color={getStatusColor(track.status)}
                      size="small"
                      variant={track.is_active ? "filled" : "outlined"}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                      {track.enabled_submission_modes?.map((mode) => (
                        <Chip
                          key={mode}
                          label={mode.replace(/_/g, " ")}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                      {track.role_mappings_on_acceptance?.map((role) => (
                        <Chip
                          key={role}
                          label={role}
                          size="small"
                          variant="filled"
                          sx={{ fontSize: "0.75rem" }}
                        />
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={`${track.pricing_tiers?.length || 0} tier${track.pricing_tiers?.length !== 1 ? "s" : ""}`}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(track)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteTrack(track.id)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Edit/Create Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontSize: "1.25rem", fontWeight: 600, pb: 1 }}>
          {editingTrack ? "Edit Application Track" : "Create Application Track"}
        </DialogTitle>
        <DialogContent sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          <TextField
            label="Track Key"
            name="key"
            value={formData.key}
            onChange={handleInputChange}
            placeholder="e.g., speaker, startup"
            helperText="Unique identifier for this track"
            disabled={!!editingTrack}
            fullWidth
          />

          <TextField
            label="Track Label"
            name="label"
            value={formData.label}
            onChange={handleInputChange}
            placeholder="e.g., Speaker Application"
            fullWidth
          />

          <TextField
            label="Description"
            name="short_description"
            value={formData.short_description}
            onChange={handleInputChange}
            placeholder="Brief description of this track"
            multiline
            rows={2}
            fullWidth
          />

          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
              name="status"
              value={formData.status}
              label="Status"
              onChange={handleInputChange}
            >
              <MenuItem value="open">Open</MenuItem>
              <MenuItem value="closed">Closed</MenuItem>
              <MenuItem value="invite_only">Invite Only</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Sort Order"
            name="sort_order"
            type="number"
            value={formData.sort_order}
            onChange={handleInputChange}
            fullWidth
          />

          <Stack spacing={2} sx={{ mt: 2 }}>
            <h4>Enabled Submission Modes:</h4>
            <Box>
              {["self_submission", "confirmed", "self_nomination", "third_party_nomination"].map((mode) => {
                const modeLabels = {
                  self_submission: "Self Submission",
                  confirmed: "Confirmed",
                  self_nomination: "Self Nomination",
                  third_party_nomination: "Third Party Nomination",
                };
                return (
                  <label key={mode} style={{ display: "block", marginBottom: "0.5rem" }}>
                    <input
                      type="checkbox"
                      checked={formData.enabled_submission_modes?.includes(mode) || false}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData((prev) => ({
                            ...prev,
                            enabled_submission_modes: [
                              ...prev.enabled_submission_modes,
                              mode,
                            ],
                          }));
                        } else {
                          setFormData((prev) => ({
                            ...prev,
                            enabled_submission_modes: prev.enabled_submission_modes.filter(
                              (m) => m !== mode
                            ),
                          }));
                        }
                      }}
                    />{" "}
                    {modeLabels[mode]}
                  </label>
                );
              })}
            </Box>
          </Stack>

          {/* FIX 5: Role Mapping UI */}
          <Stack spacing={2} sx={{ mt: 2 }}>
            <h4>Assigned Roles on Acceptance:</h4>
            <Box>
              {eventRoles.length > 0 ? (
                eventRoles.map((role) => (
                  <FormControlLabel
                    key={role.key}
                    control={
                      <Checkbox
                        checked={formData.role_mappings_on_acceptance?.includes(role.key) || false}
                        onChange={() => handleRoleMappingChange(role.key)}
                      />
                    }
                    label={role.label}
                  />
                ))
              ) : (
                <small style={{ color: "#999" }}>No roles available for this event</small>
              )}
            </Box>
          </Stack>

          {/* FIX 4: Pricing Tiers UI */}
          {editingTrack ? (
            <Accordion sx={{ mt: 2 }} defaultExpanded={pricingTiers.length > 0}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>
                  Pricing Tiers {pricingTiers.length > 0 ? `(${pricingTiers.length})` : "(No tiers yet)"}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={2} sx={{ width: "100%" }}>
                  {pricingTiers.length > 0 && (
                    <Box>
                      {pricingTiers.map((tier) => (
                        <Box
                          key={tier.id}
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            p: 2,
                            border: "1px solid #ddd",
                            borderRadius: 1,
                            mb: 1,
                            backgroundColor: tier.is_active ? "#fff" : "#f9f9f9",
                            opacity: tier.is_active ? 1 : 0.7,
                          }}
                        >
                          <Box sx={{ flex: 1 }}>
                            <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 0.5 }}>
                              <strong>{tier.label}</strong>
                              {tier.is_default && (
                                <Chip label="DEFAULT" size="small" color="primary" variant="outlined" />
                              )}
                              {!tier.is_active && (
                                <Chip label="INACTIVE" size="small" variant="outlined" />
                              )}
                            </Box>
                            <Box sx={{ fontSize: "0.875rem", color: "#666" }}>
                              <span>{tier.key}</span>
                              {tier.price && (
                                <span> • ${parseFloat(tier.price).toFixed(2)} {tier.currency || "USD"}</span>
                              )}
                              {tier.visibility && (
                                <span> • {tier.visibility}</span>
                              )}
                            </Box>
                          </Box>
                          <Stack direction="row" spacing={0.5}>
                            <IconButton
                              size="small"
                              onClick={() => handleOpenTierEditor(tier)}
                              color="primary"
                              title="Edit tier"
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            {!tier.is_default && (
                              <IconButton
                                size="small"
                                onClick={() => handleSetDefaultTier(tier.id)}
                                title="Set as default"
                              >
                                <CheckIcon fontSize="small" />
                              </IconButton>
                            )}
                            <IconButton
                              size="small"
                              onClick={() => handleDeletePricingTier(tier.id)}
                              color="error"
                              title="Delete tier"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Stack>
                        </Box>
                      ))}
                    </Box>
                  )}

                  <Box sx={{ display: "flex", gap: 1 }}>
                    <TextField
                      label="Tier Name"
                      size="small"
                      value={newTierName}
                      onChange={(e) => setNewTierName(e.target.value)}
                      placeholder="e.g., Silver, Gold"
                      fullWidth
                    />
                    <TextField
                      label="Price"
                      size="small"
                      type="number"
                      inputProps={{ step: "0.01", min: "0" }}
                      value={newTierPrice}
                      onChange={(e) => setNewTierPrice(e.target.value)}
                      placeholder="0.00"
                      sx={{ width: "150px" }}
                    />
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={handleAddPricingTier}
                      sx={{ whiteSpace: "nowrap" }}
                    >
                      Add
                    </Button>
                  </Box>
                </Stack>
              </AccordionDetails>
            </Accordion>
          ) : (
            <Alert severity="info" sx={{ mt: 2 }}>
              Pricing tiers can be added after creating the track. Click "Create Track" first, then edit to add tiers.
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ gap: 1, p: 2 }}>
          <Button onClick={handleCloseDialog} sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveTrack}
            sx={{ textTransform: "none" }}
          >
            {editingTrack ? "Update" : "Create"} Track
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontSize: "1.25rem", fontWeight: 600, pb: 1 }}>
          {confirmDialog.title}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mt: 2, mb: 1, color: "#666" }}>
            {confirmDialog.message}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ gap: 1, p: 2 }}>
          <Button
            onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}
            sx={{ textTransform: "none" }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmAction}
            variant="contained"
            color="error"
            sx={{ textTransform: "none" }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Tier Editor Dialog */}
      <Dialog open={showTierEditor} onClose={() => setShowTierEditor(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: "1.25rem", fontWeight: 600, pb: 1 }}>
          {editingTier ? "Edit Pricing Tier" : "Add New Pricing Tier"}
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <TextField
            label="Tier Key"
            value={tierFormData.key}
            onChange={(e) =>
              setTierFormData({
                ...tierFormData,
                key: e.target.value.toLowerCase().replace(/\s+/g, "_"),
              })
            }
            placeholder="e.g., standard, premium"
            disabled={!!editingTier}
            helperText="Unique identifier for this tier (cannot change after creation)"
            fullWidth
          />

          <TextField
            label="Tier Label"
            value={tierFormData.label}
            onChange={(e) =>
              setTierFormData({ ...tierFormData, label: e.target.value })
            }
            placeholder="e.g., Standard, Premium"
            fullWidth
          />

          <TextField
            label="Price"
            type="number"
            inputProps={{ step: "0.01", min: "0" }}
            value={tierFormData.price}
            onChange={(e) =>
              setTierFormData({ ...tierFormData, price: e.target.value })
            }
            fullWidth
          />

          <FormControl fullWidth>
            <InputLabel>Currency</InputLabel>
            <Select
              value={tierFormData.currency}
              label="Currency"
              onChange={(e) =>
                setTierFormData({ ...tierFormData, currency: e.target.value })
              }
            >
              <MenuItem value="USD">USD</MenuItem>
              <MenuItem value="EUR">EUR</MenuItem>
              <MenuItem value="GBP">GBP</MenuItem>
              <MenuItem value="INR">INR</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Visibility</InputLabel>
            <Select
              value={tierFormData.visibility}
              label="Visibility"
              onChange={(e) =>
                setTierFormData({ ...tierFormData, visibility: e.target.value })
              }
            >
              <MenuItem value="public">Public</MenuItem>
              <MenuItem value="private">Private</MenuItem>
            </Select>
          </FormControl>

          <Stack direction="row" spacing={2}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={tierFormData.is_active}
                  onChange={(e) =>
                    setTierFormData({ ...tierFormData, is_active: e.target.checked })
                  }
                />
              }
              label="Active"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={tierFormData.is_default}
                  onChange={(e) =>
                    setTierFormData({ ...tierFormData, is_default: e.target.checked })
                  }
                />
              }
              label="Set as Default"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ gap: 1, p: 2 }}>
          <Button onClick={() => setShowTierEditor(false)} sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveTierEdit}
            sx={{ textTransform: "none" }}
          >
            {editingTier ? "Update" : "Add"} Tier
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
