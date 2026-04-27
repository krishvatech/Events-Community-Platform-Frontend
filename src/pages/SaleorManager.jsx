import React, { useState, useEffect } from "react";
import {
  Container,
  Paper,
  Box,
  Typography,
  Tabs,
  Tab,
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Skeleton,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  Grid,
  Tooltip,
  Divider,
  CircularProgress,
  MenuItem,
  Autocomplete,
  Snackbar,
} from "@mui/material";
import PublicIcon from "@mui/icons-material/Public";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import RefreshIcon from "@mui/icons-material/Refresh";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import InfoIcon from "@mui/icons-material/Info";
import { apiClient, getSaleorDashboardUrl } from "../utils/api";
import { isOwnerUser } from "../utils/adminRole";

const ORANGE = "#E8532F";
const TEXT = "#2C3E5A";
const BG_GRADIENT = "linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)";

export default function SaleorManager() {
  const [tab, setTab] = useState(0);
  const [channels, setChannels] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [shippingZones, setShippingZones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [saleorDashboardUrl, setSaleorDashboardUrl] = useState(null);

  // Channel options
  const [channelOptions, setChannelOptions] = useState({
    countries: [],
    currencies: [],
    warehouses: [],
    shipping_zones: [],
  });

  // Snackbar for success messages
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  // Dialog states
  const [openDialog, setOpenDialog] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [dialogType, setDialogType] = useState("");
  const [formData, setFormData] = useState({});
  const [dialogError, setDialogError] = useState("");

  // Track original warehouse/shipping zone IDs for channel edit
  const [originalWarehouseIds, setOriginalWarehouseIds] = useState([]);
  const [originalShippingZoneIds, setOriginalShippingZoneIds] = useState([]);

  // Destination channel dialog for delete
  const [deleteDestDialog, setDeleteDestDialog] = useState({ open: false, channelId: null });
  const [destChannelId, setDestChannelId] = useState("");

  // Delete confirmation dialog
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState({ open: false, itemId: null, itemName: "" });
  const [pendingDelete, setPendingDelete] = useState(null);

  useEffect(() => {
    if (!isOwnerUser()) return;
    getSaleorDashboardUrl()
      .then((data) => setSaleorDashboardUrl(data.url))
      .catch(() => {});

    fetchChannelOptions();
    fetchData(0);
  }, []);

  const fetchChannelOptions = async () => {
    try {
      const res = await apiClient.get("/events/saleor/channel-options/");
      setChannelOptions(res.data);
    } catch (err) {
      console.error("Failed to fetch channel options:", err);
    }
  };

  const fetchData = async (tabIndex) => {
    setLoading(true);
    setError(null);
    let endpoint = "";
    if (tabIndex === 0) endpoint = "/events/saleor/channels/";
    else if (tabIndex === 1) endpoint = "/events/saleor/warehouses/";
    else if (tabIndex === 2) endpoint = "/events/saleor/shipping-zones/";

    try {
      const response = await apiClient.get(endpoint);
      const data = Array.isArray(response.data) ? response.data : response.data.results || [];
      if (tabIndex === 0) setChannels(data);
      else if (tabIndex === 1) setWarehouses(data);
      else if (tabIndex === 2) setShippingZones(data);
    } catch (err) {
      setError(`Failed to fetch data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTab(newValue);
    fetchData(newValue);
  };

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    let endpoint = "";
    if (tab === 0) endpoint = "/events/saleor/channels/sync/";
    else if (tab === 1) endpoint = "/events/saleor/warehouses/sync/";
    else if (tab === 2) endpoint = "/events/saleor/shipping-zones/sync/";

    try {
      const response = await apiClient.post(endpoint);
      if (tab === 0) setChannels(response.data.channels || []);
      else if (tab === 1) setWarehouses(response.data.warehouses || []);
      else if (tab === 2) setShippingZones(response.data.shipping_zones || []);
    } catch (err) {
      setError(`Sync failed: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleOpenDialog = (type, item = null) => {
    setDialogType(type);
    setEditItem(item);

    if (type === "channel") {
      if (item) {
        const wIds = item.warehouse_ids || [];
        setOriginalWarehouseIds([...wIds]);
        // Find shipping zones that reference this channel
        const szIds = shippingZones
          .filter(sz => (sz.channel_ids || []).includes(item.saleor_id))
          .map(sz => sz.saleor_id);
        setOriginalShippingZoneIds([...szIds]);
        setFormData({
          ...item,
          warehouse_ids: [...wIds],
          shipping_zone_ids: [...szIds],
        });
      } else {
        setOriginalWarehouseIds([]);
        setOriginalShippingZoneIds([]);
        setFormData({
          currency: "USD",
          default_country: "US",
          is_active: true,
          allocation_strategy: "PRIORITIZE_SORTING_ORDER",
          warehouse_ids: [],
          shipping_zone_ids: [],
        });
      }
    } else {
      if (item) {
        setFormData({ ...item });
      } else {
        setFormData({});
      }
    }

    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditItem(null);
    setFormData({});
    setOriginalWarehouseIds([]);
    setOriginalShippingZoneIds([]);
    setDialogError("");
  };

  const handleFormChange = (e) => {
    const { name, value, checked, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const validateChannelForm = () => {
    if (!formData.name?.trim()) {
      setDialogError("Channel name is required");
      return false;
    }
    if (!formData.slug?.trim()) {
      setDialogError("Slug is required");
      return false;
    }
    if (!editItem && !formData.currency?.trim()) {
      setDialogError("Currency is required for new channels");
      return false;
    }
    if (!formData.default_country?.trim()) {
      setDialogError("Default country is required");
      return false;
    }
    if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      setDialogError("Slug must contain only lowercase letters, numbers, and hyphens");
      return false;
    }
    setDialogError("");
    return true;
  };

  const handleSave = async () => {
    // Validation for channels
    if (dialogType === "channel" && !validateChannelForm()) {
      return;
    }

    setSyncing(true);
    setError(null);

    let endpoint = "";
    let payload = {};

    if (dialogType === "channel") {
      if (editItem) {
        endpoint = `/events/saleor/channels/${editItem.id}/`;
        const currentWarehouseIds = formData.warehouse_ids || [];
        const currentShippingZoneIds = formData.shipping_zone_ids || [];

        payload = {
          name: formData.name,
          slug: formData.slug,
          default_country: formData.default_country,
          is_active: formData.is_active,
          add_warehouse_ids: currentWarehouseIds.filter(id => !originalWarehouseIds.includes(id)),
          remove_warehouse_ids: originalWarehouseIds.filter(id => !currentWarehouseIds.includes(id)),
          add_shipping_zone_ids: currentShippingZoneIds.filter(id => !originalShippingZoneIds.includes(id)),
          remove_shipping_zone_ids: originalShippingZoneIds.filter(id => !currentShippingZoneIds.includes(id)),
          allocation_strategy: formData.allocation_strategy,
        };
      } else {
        endpoint = `/events/saleor/channels/create/`;
        payload = {
          name: formData.name,
          slug: formData.slug,
          currency: formData.currency,
          default_country: formData.default_country,
          is_active: formData.is_active,
          warehouse_ids: formData.warehouse_ids || [],
          shipping_zone_ids: formData.shipping_zone_ids || [],
          allocation_strategy: formData.allocation_strategy || "PRIORITIZE_SORTING_ORDER",
        };
      }
    } else {
      const typeKey = dialogType === "shippingZone" ? "shipping-zones" : dialogType + "s";
      if (editItem) {
        endpoint = `/events/saleor/${typeKey}/${editItem.id}/`;
      } else {
        endpoint = `/events/saleor/${typeKey}/create/`;
      }
      payload = formData;
    }

    try {
      if (editItem) {
        await apiClient.patch(endpoint, payload);
      } else {
        await apiClient.post(endpoint, payload);
      }
      handleCloseDialog();
      fetchData(tab);
      setSnackbar({
        open: true,
        message: `${dialogType === "channel" ? "Channel" : dialogType === "shippingZone" ? "Shipping Zone" : "Warehouse"} ${editItem ? "updated" : "created"} successfully!`,
        severity: "success",
      });

      // Try sync after successful create/edit
      if (dialogType === "channel") {
        try {
          await apiClient.post("/events/saleor/channels/sync/");
          fetchData(0);
        } catch (syncErr) {
          // Sync failure is non-blocking
        }
      }
    } catch (err) {
      const responseData = err.response?.data;
      if (responseData?.errors && Array.isArray(responseData.errors)) {
        const errorMsgs = responseData.errors
          .map(e => {
            const field = e.field ? `${e.field}: ` : "";
            return `${field}${e.message || e.code || "Unknown error"}`;
          })
          .join(" | ");
        setError(`Validation Error: ${errorMsgs}`);
      } else if (responseData?.error) {
        setError(`Error: ${responseData.error}`);
      } else {
        setError(`Request failed: ${err.message}`);
      }
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteClick = (id, itemName) => {
    setDeleteConfirmDialog({ open: true, itemId: id, itemName });
  };

  const handleConfirmDelete = async (destinationChannelId = null) => {
    const { itemId } = deleteConfirmDialog;
    setDeleteConfirmDialog({ open: false, itemId: null, itemName: "" });

    setSyncing(true);
    setError(null);
    const typeKey = tab === 0 ? "channels" : tab === 1 ? "warehouses" : "shipping-zones";

    try {
      const payload = {};
      if (tab === 0 && destinationChannelId) {
        payload.destination_channel_id = destinationChannelId;
      }

      await apiClient.delete(`/events/saleor/${typeKey}/${itemId}/delete/`, { data: payload });
      fetchData(tab);
      setSnackbar({
        open: true,
        message: "Deleted successfully!",
        severity: "success",
      });
      if (deleteDestDialog.open) {
        setDeleteDestDialog({ open: false, channelId: null });
        setDestChannelId("");
      }
    } catch (err) {
      const responseData = err.response?.data;
      const errors = responseData?.errors || [];

      // Check if Saleor says destination channel is required
      const needsDestination = errors.some(
        e =>
          e.code === "CHANNEL_TARGET_ID_REQUIRED" ||
          e.field === "channelId" ||
          (e.message && e.message.toLowerCase().includes("destination"))
      );

      if (tab === 0 && needsDestination) {
        setDeleteDestDialog({ open: true, channelId: itemId });
      } else if (responseData?.errors && Array.isArray(responseData.errors)) {
        const errorMsgs = errors
          .map(e => {
            const field = e.field ? `${e.field}: ` : "";
            return `${field}${e.message || e.code || "Unknown error"}`;
          })
          .join(" | ");
        setError(`Validation Error: ${errorMsgs}`);
      } else if (responseData?.error) {
        setError(`Error: ${responseData.error}`);
      } else {
        setError(`Delete failed: ${err.message}`);
      }
    } finally {
      setSyncing(false);
    }
  };

  const handleOpenSaleorDashboard = () => {
    if (saleorDashboardUrl) {
      window.open(saleorDashboardUrl, "_blank");
    }
  };

  const renderChannelForm = () => (
    <Grid container spacing={3} sx={{ mt: 0.5 }}>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Channel Name *"
          name="name"
          value={formData.name || ""}
          onChange={handleFormChange}
          required
          size="medium"
          variant="outlined"
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Slug *"
          name="slug"
          value={formData.slug || ""}
          onChange={handleFormChange}
          helperText="Lowercase letters, numbers, and hyphens only"
          required
          size="medium"
          variant="outlined"
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          select
          fullWidth
          label={`Currency${editItem ? " (read-only)" : " *"}`}
          name="currency"
          value={formData.currency || ""}
          onChange={handleFormChange}
          disabled={!!editItem}
          required={!editItem}
          size="medium"
          variant="outlined"
          sx={{ minWidth: "100%" }}
        >
          {channelOptions.currencies.map(c => (
            <MenuItem key={c.code} value={c.code}>
              {c.label}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid item xs={12}>
        <TextField
          select
          fullWidth
          label="Default Country *"
          name="default_country"
          value={formData.default_country || ""}
          onChange={handleFormChange}
          required
          size="medium"
          variant="outlined"
          sx={{ minWidth: "100%" }}
        >
          {channelOptions.countries.map(c => (
            <MenuItem key={c.code} value={c.code}>
              {c.country} ({c.code})
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid item xs={12}>
        <TextField
          select
          fullWidth
          label="Allocation Strategy"
          name="allocation_strategy"
          value={formData.allocation_strategy || "PRIORITIZE_SORTING_ORDER"}
          onChange={handleFormChange}
          size="medium"
        >
          <MenuItem value="PRIORITIZE_SORTING_ORDER">Prioritize Sorting Order</MenuItem>
          <MenuItem value="PRIORITIZE_HIGH_STOCK">Prioritize High Stock</MenuItem>
        </TextField>
      </Grid>
      <Grid item xs={12}>
        <Autocomplete
          multiple
          fullWidth
          options={channelOptions.warehouses}
          getOptionLabel={option => option.name || ""}
          value={channelOptions.warehouses.filter(w => (formData.warehouse_ids || []).includes(w.saleor_id)) || []}
          onChange={(_, newValue) => {
            setFormData(prev => ({
              ...prev,
              warehouse_ids: newValue.map(w => w.saleor_id),
            }));
          }}
          filterSelectedOptions
          disableCloseOnSelect
          renderInput={params => (
            <TextField
              {...params}
              label="Warehouses"
              placeholder="Select warehouses"
              size="medium"
              variant="outlined"
            />
          )}
          slotProps={{
            paper: {
              sx: { minWidth: "100%" }
            }
          }}
        />
      </Grid>
      <Grid item xs={12}>
        <Autocomplete
          multiple
          fullWidth
          options={channelOptions.shipping_zones}
          getOptionLabel={option => option.name || ""}
          value={channelOptions.shipping_zones.filter(sz => (formData.shipping_zone_ids || []).includes(sz.saleor_id)) || []}
          onChange={(_, newValue) => {
            setFormData(prev => ({
              ...prev,
              shipping_zone_ids: newValue.map(sz => sz.saleor_id),
            }));
          }}
          filterSelectedOptions
          disableCloseOnSelect
          renderInput={params => (
            <TextField
              {...params}
              label="Shipping Zones"
              placeholder="Select shipping zones"
              size="medium"
              variant="outlined"
            />
          )}
          slotProps={{
            paper: {
              sx: { minWidth: "100%" }
            }
          }}
        />
      </Grid>
      <Grid item xs={12}>
        <FormControlLabel
          control={<Switch checked={!!formData.is_active} onChange={handleFormChange} name="is_active" />}
          label="Active"
          sx={{ mt: 1 }}
        />
      </Grid>
    </Grid>
  );

  const renderWarehouseForm = () => (
    <Grid container spacing={2} sx={{ mt: 1 }}>
      <Grid item xs={12} sm={6}>
        <TextField fullWidth label="Name" name="name" value={formData.name || ""} onChange={handleFormChange} />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField fullWidth label="Slug" name="slug" value={formData.slug || ""} onChange={handleFormChange} />
      </Grid>
      <Grid item xs={12}>
        <TextField fullWidth label="Email" name="email" value={formData.email || ""} onChange={handleFormChange} />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField fullWidth label="City" name="city" value={formData.city || ""} onChange={handleFormChange} />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField fullWidth label="Country Code" name="country_code" value={formData.country_code || ""} onChange={handleFormChange} placeholder="e.g. US" />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField fullWidth label="Postal Code" name="postal_code" value={formData.postal_code || ""} onChange={handleFormChange} />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField fullWidth label="Country Area" name="country_area" value={formData.country_area || ""} onChange={handleFormChange} />
      </Grid>
      <Grid item xs={12}>
        <TextField fullWidth label="Street Address 1" name="street_address_1" value={formData.street_address_1 || ""} onChange={handleFormChange} />
      </Grid>
      <Grid item xs={12}>
        <TextField fullWidth label="Street Address 2" name="street_address_2" value={formData.street_address_2 || ""} onChange={handleFormChange} />
      </Grid>
      <Grid item xs={12}>
        <FormControlLabel
          control={<Switch checked={!!formData.is_private} onChange={handleFormChange} name="is_private" />}
          label="Private"
        />
      </Grid>
    </Grid>
  );

  const renderShippingZoneForm = () => (
    <Grid container spacing={2} sx={{ mt: 1 }}>
      <Grid item xs={12}>
        <TextField fullWidth label="Name" name="name" value={formData.name || ""} onChange={handleFormChange} />
      </Grid>
      <Grid item xs={12}>
        <TextField multiline rows={3} fullWidth label="Description" name="description" value={formData.description || ""} onChange={handleFormChange} />
      </Grid>
      <Grid item xs={12}>
        <FormControlLabel
          control={<Switch checked={!!formData.is_default} onChange={handleFormChange} name="is_default" />}
          label="Default Zone"
        />
      </Grid>
    </Grid>
  );

  if (!isOwnerUser()) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper sx={{ p: 3, textAlign: "center" }}>
          <Alert severity="error">Permission Denied: Only platform_admin can access this page.</Alert>
        </Paper>
      </Container>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f3f4f6", py: 4 }}>
      <Container maxWidth="lg">
        {/* Header Section */}
        <Paper
          elevation={0}
          sx={{
            p: 4,
            mb: 4,
            borderRadius: 4,
            background: "white",
            border: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: "16px",
                bgcolor: "rgba(232, 83, 47, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <PublicIcon sx={{ fontSize: 32, color: ORANGE }} />
            </Box>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: TEXT, letterSpacing: "-0.5px" }}>
                Saleor Manager
              </Typography>
              <Typography variant="body1" sx={{ color: "#6b7280" }}>
                Configuration & Synchronization Control Center
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: "flex", gap: 2 }}>
            <Button
              variant="contained"
              startIcon={syncing ? <CircularProgress size={20} color="inherit" /> : <RefreshIcon />}
              onClick={handleSync}
              disabled={syncing}
              sx={{
                bgcolor: TEXT,
                color: "white",
                borderRadius: "12px",
                px: 3,
                textTransform: "none",
                fontWeight: 600,
                "&:hover": { bgcolor: "#1a253a" },
              }}
            >
              Sync {tab === 0 ? "Channels" : tab === 1 ? "Warehouses" : "Shipping Zones"}
            </Button>
            <Button
              variant="outlined"
              startIcon={<OpenInNewIcon />}
              onClick={handleOpenSaleorDashboard}
              disabled={!saleorDashboardUrl}
              sx={{
                borderRadius: "12px",
                textTransform: "none",
                borderColor: "#e5e7eb",
                color: TEXT,
                fontWeight: 600,
              }}
            >
              Saleor Dashboard
            </Button>
          </Box>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: "12px" }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Content Area */}
        <Paper elevation={0} sx={{ borderRadius: 4, overflow: "hidden", border: "1px solid #e5e7eb", bgcolor: "white" }}>
          <Tabs
            value={tab}
            onChange={handleTabChange}
            sx={{
              px: 2,
              pt: 2,
              borderBottom: `1px solid #e5e7eb`,
              "& .MuiTab-root": {
                fontWeight: 600,
                textTransform: "none",
                fontSize: "1rem",
                pb: 2,
              },
              "& .Mui-selected": {
                color: ORANGE,
              },
              "& .MuiTabs-indicator": {
                backgroundColor: ORANGE,
                height: 3,
                borderRadius: "3px 3px 0 0",
              },
            }}
          >
            <Tab label="Channels" />
            <Tab label="Warehouses" />
            <Tab label="Shipping Zones" />
          </Tabs>

          <Box sx={{ p: 4 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: TEXT }}>
                {tab === 0 ? "Active Channels" : tab === 1 ? "Warehouse Nodes" : "Shipping Policy Zones"}
              </Typography>
              {(tab === 0 || tab === 2) && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenDialog(tab === 0 ? "channel" : "shippingZone")}
                  sx={{
                    bgcolor: ORANGE,
                    borderRadius: "10px",
                    textTransform: "none",
                    "&:hover": { bgcolor: "#d44a2a" },
                  }}
                >
                  Create New
                </Button>
              )}
            </Box>

            {loading ? (
              <Box sx={{ py: 2 }}>
                {[1, 2, 3, 4].map(i => (
                  <Skeleton key={i} variant="rectangular" height={70} sx={{ mb: 2, borderRadius: 2 }} />
                ))}
              </Box>
            ) : (
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: "#f9fafb" }}>
                    <TableCell sx={{ fontWeight: 700, color: "#4b5563" }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "#4b5563" }}>
                      {tab === 0 ? "Slug / Currency" : tab === 1 ? "Location" : "Info"}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "#4b5563" }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "#4b5563" }}>Linked Entities</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: "#4b5563" }}>
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(tab === 0 ? channels : tab === 1 ? warehouses : shippingZones).map(item => (
                    <TableRow key={item.id} hover sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                      <TableCell>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: TEXT }}>
                          {item.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#9ca3af" }}>
                          ID: {item.saleor_id.split(":").pop()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {tab === 0 ? (
                          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                            <Chip label={item.slug} size="small" variant="outlined" />
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {item.currency}
                            </Typography>
                          </Box>
                        ) : tab === 1 ? (
                          <Typography variant="body2">
                            {item.city}, {item.country_code}
                          </Typography>
                        ) : (
                          <Typography
                            variant="body2"
                            sx={{ maxWidth: 200, noWrap: true, textOverflow: "ellipsis", overflow: "hidden" }}
                          >
                            {item.description || "No description"}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={item.is_active ? "Active" : "Inactive"}
                          size="small"
                          sx={{
                            fontWeight: 600,
                            bgcolor: item.is_active ? "rgba(16, 185, 129, 0.1)" : "rgba(107, 114, 128, 0.1)",
                            color: item.is_active ? "#059669" : "#4b5563",
                          }}
                        />
                        {item.is_default && (
                          <Chip label="Default" size="small" color="primary" sx={{ ml: 1, height: 20, fontSize: "0.65rem" }} />
                        )}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                          {tab === 0 && (item.warehouse_ids || []).length > 0 && (
                            <Tooltip title="Linked Warehouses">
                              <Chip icon={<InfoIcon style={{ fontSize: 14 }} />} label={`${item.warehouse_ids.length} WH`} size="small" />
                            </Tooltip>
                          )}
                          {tab === 2 && (item.channel_ids || []).length > 0 && (
                            <Tooltip title="Linked Channels">
                              <Chip label={`${item.channel_ids.length} Channels`} size="small" color="secondary" variant="outlined" />
                            </Tooltip>
                          )}
                          {tab === 2 && (item.shipping_methods || []).length > 0 && (
                            <Tooltip title="Shipping Methods">
                              <Chip label={`${item.shipping_methods.length} Methods`} size="small" variant="outlined" />
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        {(tab === 0 || tab === 2) && (
                          <>
                            <IconButton
                              size="small"
                              onClick={() => handleOpenDialog(tab === 0 ? "channel" : "shippingZone", item)}
                              sx={{ color: TEXT }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteClick(item.id, item.name)}
                              sx={{ color: "#ef4444" }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </>
                        )}
                        {tab === 1 && (
                          <Typography variant="caption" sx={{ color: "#9ca3af" }}>
                            Managed in Saleor
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(tab === 0 ? channels : tab === 1 ? warehouses : shippingZones).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                        <Typography variant="body1" sx={{ color: "#9ca3af" }}>
                          No records found. Try syncing from Saleor.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </Box>
        </Paper>

        <Box sx={{ mt: 4, display: "flex", justifyContent: "center" }}>
          <Typography variant="caption" sx={{ color: "#9ca3af" }}>
            Last Synced: {new Date().toLocaleString()} • ECP-Saleor Bridge v2.0
          </Typography>
        </Box>
      </Container>

      {/* CRUD Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            minWidth: "550px",
            "& .MuiDialogContent-root": {
              padding: "24px",
            }
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: "1.3rem", pb: 2 }}>
          {editItem ? "Edit" : "Create"} {dialogType === "channel" ? "Channel" : dialogType === "shippingZone" ? "Shipping Zone" : "Warehouse"}
        </DialogTitle>
        <DialogContent dividers sx={{ minHeight: "450px", padding: "24px" }}>
          {dialogError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setDialogError("")}>
              {dialogError}
            </Alert>
          )}
          {dialogType === "channel" && renderChannelForm()}
          {dialogType === "warehouse" && renderWarehouseForm()}
          {dialogType === "shippingZone" && renderShippingZoneForm()}

          {editItem && (
            <Box sx={{ mt: 3, p: 2, bgcolor: "#f9fafb", borderRadius: 2 }}>
              <Typography variant="caption" sx={{ display: "block", color: "#6b7280", mb: 1 }}>
                System Information
              </Typography>
              <Typography variant="caption" sx={{ display: "block" }}>
                Saleor ID: {editItem.saleor_id}
              </Typography>
              <Typography variant="caption" sx={{ display: "block" }}>
                Last Synced: {new Date(editItem.synced_at).toLocaleString()}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleCloseDialog} sx={{ color: "#6b7280" }}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={syncing}
            sx={{ bgcolor: TEXT, px: 4, borderRadius: "10px" }}
          >
            {syncing ? <CircularProgress size={20} /> : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmDialog.open}
        onClose={() => setDeleteConfirmDialog({ open: false, itemId: null, itemName: "" })}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: "1.2rem", pb: 1 }}>
          Confirm Delete
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Typography variant="body1" sx={{ color: "#4b5563" }}>
            Are you sure you want to delete <strong>{deleteConfirmDialog.itemName}</strong> from Saleor?
          </Typography>
          <Typography variant="body2" sx={{ mt: 2, color: "#6b7280" }}>
            This action cannot be undone. The {tab === 0 ? "channel" : tab === 1 ? "warehouse" : "shipping zone"} will be permanently removed.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button
            onClick={() => setDeleteConfirmDialog({ open: false, itemId: null, itemName: "" })}
            sx={{ color: TEXT, borderRadius: "10px" }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => handleConfirmDelete()}
            variant="contained"
            disabled={syncing}
            sx={{
              bgcolor: "#ef4444",
              color: "white",
              borderRadius: "10px",
              px: 3,
              "&:hover": { bgcolor: "#dc2626" }
            }}
          >
            {syncing ? <CircularProgress size={20} color="inherit" /> : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Destination Channel Dialog for Delete */}
      <Dialog open={deleteDestDialog.open} onClose={() => setDeleteDestDialog({ open: false, channelId: null })} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Select Destination Channel</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ mb: 2, color: "#6b7280" }}>
            This channel has orders. Select a destination channel to move them to.
          </Typography>
          <TextField
            select
            fullWidth
            label="Destination Channel"
            value={destChannelId}
            onChange={(e) => setDestChannelId(e.target.value)}
          >
            {channels
              .filter(c => c.id !== deleteDestDialog.channelId && c.currency === channels.find(ch => ch.id === deleteDestDialog.channelId)?.currency)
              .map(c => (
                <MenuItem key={c.saleor_id} value={c.saleor_id}>
                  {c.name} ({c.currency})
                </MenuItem>
              ))}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setDeleteDestDialog({ open: false, channelId: null })} sx={{ color: "#6b7280" }}>
            Cancel
          </Button>
          <Button
            onClick={() => handleConfirmDelete(destChannelId)}
            variant="contained"
            disabled={!destChannelId || syncing}
            sx={{ bgcolor: "#ef4444", px: 4, borderRadius: "10px" }}
          >
            {syncing ? <CircularProgress size={20} /> : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
