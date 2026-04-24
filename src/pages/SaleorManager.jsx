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

  // Dialog states
  const [openDialog, setOpenDialog] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [dialogType, setDialogType] = useState(""); // "channel", "warehouse", "shippingZone"
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (!isOwnerUser()) return;
    getSaleorDashboardUrl()
      .then((data) => setSaleorDashboardUrl(data.url))
      .catch(() => {});
    
    fetchData(0);
  }, []);

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
    if (item) {
      setFormData({ ...item });
    } else {
      setFormData({});
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditItem(null);
    setFormData({});
  };

  const handleFormChange = (e) => {
    const { name, value, checked, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSave = async () => {
    setSyncing(true);
    setError(null);
    let endpoint = "";
    const typeKey = dialogType === "shippingZone" ? "shipping-zones" : dialogType + "s";
    
    if (editItem) {
      endpoint = `/events/saleor/${typeKey}/${editItem.id}/`;
    } else {
      endpoint = `/events/saleor/${typeKey}/create/`;
    }

    try {
      if (editItem) {
        await apiClient.patch(endpoint, formData);
      } else {
        await apiClient.post(endpoint, formData);
      }
      handleCloseDialog();
      fetchData(tab);
    } catch (err) {
      const responseData = err.response?.data;
      if (responseData?.errors && Array.isArray(responseData.errors)) {
        const errorMsgs = responseData.errors.map(e => {
          const field = e.field ? `${e.field}: ` : "";
          return `${field}${e.message || e.code || "Unknown error"}`;
        }).join(" | ");
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

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this from Saleor?")) return;
    
    setSyncing(true);
    setError(null);
    const typeKey = tab === 0 ? "channels" : tab === 1 ? "warehouses" : "shipping-zones";
    
    try {
      await apiClient.delete(`/events/saleor/${typeKey}/${id}/delete/`);
      fetchData(tab);
    } catch (err) {
      setError(`Delete failed: ${err.message}`);
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
    <Grid container spacing={2} sx={{ mt: 1 }}>
      <Grid item xs={12}>
        <TextField fullWidth label="Name" name="name" value={formData.name || ""} onChange={handleFormChange} />
      </Grid>
      <Grid item xs={12}>
        <TextField fullWidth label="Slug" name="slug" value={formData.slug || ""} onChange={handleFormChange} />
      </Grid>
      {!editItem && (
        <Grid item xs={12}>
          <TextField fullWidth label="Currency Code" name="currency" value={formData.currency || ""} onChange={handleFormChange} />
        </Grid>
      )}
      <Grid item xs={12}>
        <TextField fullWidth label="Default Country Code" name="default_country" value={formData.default_country || ""} onChange={handleFormChange} placeholder="e.g. US" />
      </Grid>
      <Grid item xs={12}>
        <FormControlLabel
          control={<Switch checked={!!formData.is_active} onChange={handleFormChange} name="is_active" />}
          label="Active"
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
        <TextField fullWidth multiline rows={3} label="Description" name="description" value={formData.description || ""} onChange={handleFormChange} />
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
            gap: 2
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
                justifyContent: "center" 
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
                "&:hover": { bgcolor: "#1a253a" }
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
                fontWeight: 600
              }}
            >
              Saleor Dashboard
            </Button>
          </Box>
        </Paper>

        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 3, borderRadius: "12px" }} 
            onClose={() => setError(null)}
          >
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
                pb: 2
              },
              "& .Mui-selected": {
                color: ORANGE
              },
              "& .MuiTabs-indicator": {
                backgroundColor: ORANGE,
                height: 3,
                borderRadius: "3px 3px 0 0"
              }
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
              {tab === 2 && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenDialog("shippingZone")}
                  sx={{ 
                    bgcolor: ORANGE, 
                    borderRadius: "10px",
                    textTransform: "none",
                    "&:hover": { bgcolor: "#d44a2a" }
                  }}
                >
                  Create New
                </Button>
              )}
            </Box>

            {loading ? (
              <Box sx={{ py: 2 }}>
                {[1, 2, 3, 4].map((i) => (
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
                    <TableCell align="right" sx={{ fontWeight: 700, color: "#4b5563" }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(tab === 0 ? channels : tab === 1 ? warehouses : shippingZones).map((item) => (
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
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.currency}</Typography>
                          </Box>
                        ) : tab === 1 ? (
                          <Typography variant="body2">{item.city}, {item.country_code}</Typography>
                        ) : (
                          <Typography variant="body2" sx={{ maxWidth: 200, noWrap: true, textOverflow: "ellipsis", overflow: "hidden" }}>
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
                            color: item.is_active ? "#059669" : "#4b5563"
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
                        {tab === 2 && (
                          <>
                            <IconButton size="small" onClick={() => handleOpenDialog("shippingZone", item)} sx={{ color: TEXT }}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" onClick={() => handleDelete(item.id)} sx={{ color: "#ef4444" }}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </>
                        )}
                        {tab !== 2 && (
                          <Typography variant="caption" sx={{ color: "#9ca3af" }}>Managed in Saleor</Typography>
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
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editItem ? "Edit" : "Create"} {dialogType.charAt(0).toUpperCase() + dialogType.slice(1)}
        </DialogTitle>
        <DialogContent dividers>
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
          <Button onClick={handleCloseDialog} sx={{ color: "#6b7280" }}>Cancel</Button>
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
    </Box>
  );
}
