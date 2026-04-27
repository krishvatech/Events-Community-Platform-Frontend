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
  const [productTypes, setProductTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [saleorDashboardUrl, setSaleorDashboardUrl] = useState(null);

  // Warehouse options
  const [warehouseOptions, setWarehouseOptions] = useState({
    countries: [],
    shipping_zones: [],
  });

  // Channel options
  const [channelOptions, setChannelOptions] = useState({
    countries: [],
    currencies: [],
    warehouses: [],
    shipping_zones: [],
  });

  // Shipping Zone options (countries from Saleor, channels + warehouses from local DB)
  const [shippingZoneOptions, setShippingZoneOptions] = useState({
    countries: [],
    channels: [],
    warehouses: [],
  });

  // Product Type options (tax classes and kinds)
  const [productTypeOptions, setProductTypeOptions] = useState({
    tax_classes: [],
    product_type_kinds: [
      { value: "NORMAL", label: "Regular product type" },
      { value: "GIFT_CARD", label: "Gift card product type" }
    ]
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
    fetchWarehouseOptions();
    fetchShippingZoneOptions();
    fetchProductTypeOptions();
    fetchData(0);
  }, []);

  useEffect(() => {
    handleSync(tab); // Combined fetch and sync for smoother UX
  }, [tab]);

  const fetchWarehouseOptions = async () => {
    try {
      const res = await apiClient.get("/events/saleor/warehouse-options/");
      setWarehouseOptions(res.data);
    } catch (err) {
      console.error("Failed to fetch warehouse options:", err);
    }
  };

  const fetchChannelOptions = async () => {
    try {
      const res = await apiClient.get("/events/saleor/channel-options/");
      setChannelOptions(res.data);
    } catch (err) {
      console.error("Failed to fetch channel options:", err);
    }
  };

  const fetchShippingZoneOptions = async () => {
    try {
      const res = await apiClient.get("/events/saleor/shipping-zone-options/");
      setShippingZoneOptions(res.data);
    } catch (err) {
      console.error("Failed to fetch shipping zone options:", err);
    }
  };

  const fetchProductTypeOptions = async () => {
    try {
      const res = await apiClient.get("/events/saleor/product-type-options/");
      setProductTypeOptions(res.data);
    } catch (err) {
      console.error("Failed to fetch product type options:", err);
    }
  };

  const fetchData = async (tabIndex) => {
    setLoading(true);
    setError(null);
    let endpoint = "";
    if (tabIndex === 0) endpoint = "/events/saleor/channels/";
    else if (tabIndex === 1) endpoint = "/events/saleor/warehouses/";
    else if (tabIndex === 2) endpoint = "/events/saleor/shipping-zones/";
    else if (tabIndex === 3) endpoint = "/events/saleor/product-types/";

    try {
      const response = await apiClient.get(endpoint);
      const data = Array.isArray(response.data) ? response.data : response.data.results || [];
      if (tabIndex === 0) setChannels(data);
      else if (tabIndex === 1) setWarehouses(data);
      else if (tabIndex === 2) setShippingZones(data);
      else if (tabIndex === 3) setProductTypes(data);
    } catch (err) {
      setError(`Failed to fetch data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTab(newValue);
  };

  const handleSync = async (tabIndex = null) => {
    const activeTab = tabIndex !== null ? tabIndex : tab;
    setLoading(true); // Use main loading state for initial sync
    setError(null);
    let endpoint = "";
    if (activeTab === 0) endpoint = "/events/saleor/channels/sync/";
    else if (activeTab === 1) endpoint = "/events/saleor/warehouses/sync/";
    else if (activeTab === 2) endpoint = "/events/saleor/shipping-zones/sync/";
    else if (activeTab === 3) endpoint = "/events/saleor/product-types/sync/";

    try {
      await apiClient.post(endpoint);
      await fetchData(activeTab); // Re-fetch ensures local state matches sync result
    } catch (err) {
      setError(`Sync failed: ${err.message}`);
      // Fallback: if sync fails, still try to show local data
      fetchData(activeTab);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (type, item = null) => {
    setDialogType(type);
    setEditItem(item);
    setDialogError("");

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
    } else if (type === "warehouse") {
      if (item) {
        const szIds = item.shipping_zone_ids || [];
        setOriginalShippingZoneIds([...szIds]);
        setFormData({
          name: item.name || "",
          slug: item.slug || "",
          email: item.email || "",
          company_name: item.company_name || "",
          street_address_1: item.street_address_1 || "",
          street_address_2: item.street_address_2 || "",
          city: item.city || "",
          postal_code: item.postal_code || "",
          country_area: item.country_area || "",
          country_code: item.country_code || "",
          phone: item.phone || "",
          is_private: !!item.is_private,
          click_and_collect: (item.click_and_collect || "disabled").toUpperCase(),
          shipping_zone_ids: [...szIds],
        });
      } else {
        setOriginalShippingZoneIds([]);
        setFormData({
          name: "",
          slug: "",
          email: "",
          company_name: "",
          street_address_1: "",
          street_address_2: "",
          city: "",
          postal_code: "",
          country_area: "",
          country_code: "IN",
          phone: "",
          is_private: false,
          click_and_collect: "DISABLED",
          shipping_zone_ids: [],
        });
      }
    } else if (type === "shippingZone") {
      // Fetch fresh options before opening the dialog
      fetchShippingZoneOptions();
      if (item) {
        setFormData({
          name: item.name || "",
          description: item.description || "",
          countries: item.countries || [],
          is_default: !!item.is_default,
          channel_ids: item.channel_ids || [],
          warehouse_ids: item.warehouse_ids || [],
          // Track originals for diff
          original_channel_ids: item.channel_ids || [],
          original_warehouse_ids: item.warehouse_ids || [],
        });
      } else {
        setFormData({
          name: "",
          description: "",
          countries: [],
          is_default: false,
          channel_ids: [],
          warehouse_ids: [],
          original_channel_ids: [],
          original_warehouse_ids: [],
        });
      }
    } else if (type === "productType") {
      if (item) {
        setFormData({
          name: item.name || "",
          slug: item.slug || "",
          kind: item.kind || "NORMAL",
          is_shipping_required: !!item.is_shipping_required,
          tax_class_id: item.tax_class_id || "",
        });
      } else {
        setFormData({
          name: "",
          slug: "",
          kind: "NORMAL",
          is_shipping_required: false,
          tax_class_id: "",
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
    const newValue = type === "checkbox" ? checked : value;

    setFormData((prev) => {
      const updated = {
        ...prev,
        [name]: newValue,
      };

      // Auto-generate slug from name for product types in create mode
      if (dialogType === "productType" && name === "name" && !editItem) {
        const slug = newValue
          .toLowerCase()
          .trim()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "");
        updated.slug = slug;
      }

      return updated;
    });
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

  const validateWarehouseForm = () => {
    if (!formData.name?.trim()) {
      setDialogError("Warehouse name is required");
      return false;
    }
    if (!formData.country_code?.trim()) {
      setDialogError("Country is required");
      return false;
    }
    if (!formData.city?.trim()) {
      setDialogError("City is required");
      return false;
    }
    if (!formData.street_address_1?.trim()) {
      setDialogError("Street address line 1 is required");
      return false;
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setDialogError("Please enter a valid email address");
      return false;
    }
    if (formData.slug && !/^[a-z0-9-]+$/.test(formData.slug)) {
      setDialogError("Slug must contain only lowercase letters, numbers, and hyphens");
      return false;
    }
    // Basic phone validation (at least 10 digits for most countries that require state)
    if (formData.phone && formData.phone.replace(/\D/g, '').length < 10) {
      setDialogError("Phone number must be at least 10 digits");
      return false;
    }
    setDialogError("");
    return true;
  };

  const validateShippingZoneForm = () => {
    if (!formData.name?.trim()) {
      setDialogError("Shipping zone name is required");
      return false;
    }
    if (!formData.is_default && (formData.countries || []).length === 0) {
      setDialogError("Please select at least one country, or enable Default / Rest of World.");
      return false;
    }
    const selectedWarehouseIds = formData.warehouse_ids || [];
    const selectedChannelIds = formData.channel_ids || [];
    if (selectedWarehouseIds.length > 0 && selectedChannelIds.length === 0) {
      setDialogError("Warning: Selected warehouses must share a channel with this shipping zone. Please assign at least one channel.");
      return false;
    }
    setDialogError("");
    return true;
  };

  const validateProductTypeForm = () => {
    if (!formData.name?.trim()) {
      setDialogError("Product type name is required");
      return false;
    }
    if (!formData.slug?.trim()) {
      setDialogError("Slug is required");
      return false;
    }
    if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      setDialogError("Slug must contain only lowercase letters, numbers, and hyphens");
      return false;
    }
    if (!["NORMAL", "GIFT_CARD"].includes(formData.kind)) {
      setDialogError("Kind must be either NORMAL or GIFT_CARD");
      return false;
    }
    setDialogError("");
    return true;
  };

  const handleSave = async () => {
    // Validation
    if (dialogType === "channel" && !validateChannelForm()) return;
    if (dialogType === "warehouse" && !validateWarehouseForm()) return;
    if (dialogType === "shippingZone" && !validateShippingZoneForm()) return;
    if (dialogType === "productType" && !validateProductTypeForm()) return;

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
    } else if (dialogType === "warehouse") {
      if (editItem) {
        endpoint = `/events/saleor/warehouses/${editItem.id}/`;
        const currentShippingZoneIds = formData.shipping_zone_ids || [];
        payload = {
          ...formData,
          add_shipping_zone_ids: currentShippingZoneIds.filter(id => !originalShippingZoneIds.includes(id)),
          remove_shipping_zone_ids: originalShippingZoneIds.filter(id => !currentShippingZoneIds.includes(id)),
        };
        delete payload.shipping_zone_ids;
      } else {
        endpoint = `/events/saleor/warehouses/create/`;
        payload = formData;
      }
    } else if (dialogType === "shippingZone") {
      const selectedChannelIds = formData.channel_ids || [];
      const selectedWarehouseIds = formData.warehouse_ids || [];
      const origChannelIds = formData.original_channel_ids || [];
      const origWarehouseIds = formData.original_warehouse_ids || [];

      if (editItem) {
        endpoint = `/events/saleor/shipping-zones/${editItem.id}/`;
        payload = {
          name: formData.name,
          description: formData.description,
          countries: formData.is_default ? [] : formData.countries,
          is_default: formData.is_default,
          add_channel_ids: selectedChannelIds.filter(id => !origChannelIds.includes(id)),
          remove_channel_ids: origChannelIds.filter(id => !selectedChannelIds.includes(id)),
          add_warehouse_ids: selectedWarehouseIds.filter(id => !origWarehouseIds.includes(id)),
          remove_warehouse_ids: origWarehouseIds.filter(id => !selectedWarehouseIds.includes(id)),
        };
      } else {
        endpoint = `/events/saleor/shipping-zones/create/`;
        payload = {
          name: formData.name,
          description: formData.description,
          countries: formData.is_default ? [] : formData.countries,
          is_default: formData.is_default,
          channel_ids: selectedChannelIds,
          warehouse_ids: selectedWarehouseIds,
        };
      }
    } else if (dialogType === "productType") {
      if (editItem) {
        endpoint = `/events/saleor/product-types/${editItem.id}/`;
      } else {
        endpoint = `/events/saleor/product-types/create/`;
      }
      payload = {
        name: formData.name,
        slug: formData.slug,
        kind: formData.kind,
        is_shipping_required: formData.is_shipping_required,
        tax_class_id: formData.tax_class_id || null,
      };
    } else {
      const typeKey = dialogType + "s";
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

      // Sync after successful create/edit for all types
      const syncEndpoint =
        dialogType === "channel" ? "/events/saleor/channels/sync/"
        : dialogType === "warehouse" ? "/events/saleor/warehouses/sync/"
        : dialogType === "productType" ? "/events/saleor/product-types/sync/"
        : "/events/saleor/shipping-zones/sync/";
      try {
        await apiClient.post(syncEndpoint);
      } catch (_) {
        // Sync failure is non-blocking
      }
      fetchData(tab);

      setSnackbar({
        open: true,
        message: `${dialogType === "channel" ? "Channel" : dialogType === "shippingZone" ? "Shipping Zone" : dialogType === "productType" ? "Product Type" : "Warehouse"} ${editItem ? "updated" : "created"} successfully!`,
        severity: "success",
      });
    } catch (err) {
      const responseData = err.response?.data;
      let finalError = "";
      if (responseData?.errors && Array.isArray(responseData.errors)) {
        finalError = responseData.errors
          .map(e => {
            const field = e.field ? `${e.field}: ` : "";
            return `${field}${e.message || e.code || "Unknown error"}`;
          })
          .join(" | ");
      } else if (responseData?.error) {
        finalError = responseData.error;
      } else {
        finalError = err.message || "Request failed";
      }
      setDialogError(finalError);
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
    const typeKey = tab === 0 ? "channels" : tab === 1 ? "warehouses" : tab === 2 ? "shipping-zones" : "product-types";

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
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, mt: 0.5 }}>
      {/* General Information */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 800, color: ORANGE, textTransform: "uppercase", fontSize: "0.8rem", letterSpacing: "1.5px" }}>
          General Information
        </Typography>
        <Divider sx={{ mb: 3 }} />
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Warehouse Name *" name="name" value={formData.name || ""} onChange={handleFormChange} required />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Slug" name="slug" value={formData.slug || ""} onChange={handleFormChange} placeholder="e.g. main-warehouse" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Email" name="email" type="email" value={formData.email || ""} onChange={handleFormChange} />
          </Grid>
        </Grid>
      </Box>

      {/* Address Information */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 800, color: ORANGE, textTransform: "uppercase", fontSize: "0.8rem", letterSpacing: "1.5px" }}>
          Address Information
        </Typography>
        <Divider sx={{ mb: 3 }} />
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Company" name="company_name" value={formData.company_name || ""} onChange={handleFormChange} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Phone" name="phone" value={formData.phone || ""} onChange={handleFormChange} />
          </Grid>
          <Grid item xs={12} sm={8}>
            <TextField fullWidth label="Address Line 1 *" name="street_address_1" value={formData.street_address_1 || ""} onChange={handleFormChange} required />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth label="Address Line 2" name="street_address_2" value={formData.street_address_2 || ""} onChange={handleFormChange} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="City *" name="city" value={formData.city || ""} onChange={handleFormChange} required />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="ZIP / Postal Code" name="postal_code" value={formData.postal_code || ""} onChange={handleFormChange} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Autocomplete
              options={warehouseOptions.countries}
              getOptionLabel={(option) => `${option.country} (${option.code})`}
              value={warehouseOptions.countries.find(c => c.code === formData.country_code) || null}
              onChange={(_, newValue) => {
                setFormData(prev => ({ ...prev, country_code: newValue ? newValue.code : "" }));
              }}
              renderInput={(params) => <TextField {...params} label="Country *" required />}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Country Area / State" name="country_area" value={formData.country_area || ""} onChange={handleFormChange} />
          </Grid>
        </Grid>
      </Box>

      {/* Settings */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 800, color: ORANGE, textTransform: "uppercase", fontSize: "0.8rem", letterSpacing: "1.5px" }}>
          Settings
        </Typography>
        <Divider sx={{ mb: 3 }} />
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              select
              fullWidth
              label="Click and Collect"
              name="click_and_collect"
              value={formData.click_and_collect || "DISABLED"}
              onChange={handleFormChange}
            >
              <MenuItem value="DISABLED">Disabled</MenuItem>
              <MenuItem value="LOCAL">Local stock only</MenuItem>
              <MenuItem value="ALL">All warehouses</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} sx={{ display: 'flex', alignItems: 'center' }}>
            <FormControlLabel
              control={<Switch checked={!!formData.is_private} onChange={handleFormChange} name="is_private" />}
              label="Private Warehouse"
              sx={{ ml: 1 }}
            />
          </Grid>
          <Grid item xs={12}>
            <Autocomplete
              multiple
              options={warehouseOptions.shipping_zones}
              getOptionLabel={(option) => option.name || ""}
              value={warehouseOptions.shipping_zones.filter(sz => (formData.shipping_zone_ids || []).includes(sz.saleor_id)) || []}
              onChange={(_, newValue) => {
                setFormData(prev => ({ ...prev, shipping_zone_ids: newValue.map(sz => sz.saleor_id) }));
              }}
              renderInput={(params) => <TextField {...params} label="Shipping Zones" placeholder="Select shipping zones" />}
              disableCloseOnSelect
            />
          </Grid>
        </Grid>
      </Box>
    </Box>
  );

  const renderShippingZoneForm = () => (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 4, mt: 0.5 }}>
      {/* General Information */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 800, color: ORANGE, textTransform: "uppercase", fontSize: "0.8rem", letterSpacing: "1.5px" }}>
          General Information
        </Typography>
        <Divider sx={{ mb: 3 }} />
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Shipping Zone Name *"
              name="name"
              value={formData.name || ""}
              onChange={handleFormChange}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Description"
              name="description"
              value={formData.description || ""}
              onChange={handleFormChange}
            />
          </Grid>
        </Grid>
      </Box>

      {/* Countries */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 800, color: ORANGE, textTransform: "uppercase", fontSize: "0.8rem", letterSpacing: "1.5px" }}>
          Countries
        </Typography>
        <Divider sx={{ mb: 3 }} />
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={!!formData.is_default}
                  onChange={(e) =>
                    setFormData(prev => ({ ...prev, is_default: e.target.checked, countries: [] }))
                  }
                  name="is_default"
                />
              }
              label="Default / Rest of World"
            />
            {formData.is_default && (
              <Typography variant="caption" sx={{ display: "block", color: "#6b7280", mt: 0.5 }}>
                Default / Rest of World zone covers countries not assigned to another shipping zone.
              </Typography>
            )}
          </Grid>
          {!formData.is_default && (
            <Grid item xs={12}>
              <Autocomplete
                multiple
                fullWidth
                options={shippingZoneOptions.countries}
                getOptionLabel={(option) => `${option.country} (${option.code})`}
                value={shippingZoneOptions.countries.filter(c => (formData.countries || []).includes(c.code))}
                onChange={(_, newValue) =>
                  setFormData(prev => ({ ...prev, countries: newValue.map(c => c.code) }))
                }
                filterSelectedOptions
                disableCloseOnSelect
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Assign Countries *"
                    placeholder="Search countries…"
                    helperText={`${(formData.countries || []).length} country(ies) selected`}
                  />
                )}
              />
            </Grid>
          )}
        </Grid>
      </Box>

      {/* Assignments */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 800, color: ORANGE, textTransform: "uppercase", fontSize: "0.8rem", letterSpacing: "1.5px" }}>
          Assignments
        </Typography>
        <Divider sx={{ mb: 3 }} />
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Autocomplete
              multiple
              fullWidth
              options={shippingZoneOptions.channels}
              getOptionLabel={(option) => `${option.name} (${option.slug})`}
              value={shippingZoneOptions.channels.filter(c => (formData.channel_ids || []).includes(c.saleor_id))}
              onChange={(_, newValue) =>
                setFormData(prev => ({ ...prev, channel_ids: newValue.map(c => c.saleor_id) }))
              }
              filterSelectedOptions
              disableCloseOnSelect
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Assign Channels"
                  placeholder="Select channels"
                  helperText={`${(formData.channel_ids || []).length} channel(s) selected`}
                />
              )}
            />
          </Grid>
          <Grid item xs={12}>
            <Autocomplete
              multiple
              fullWidth
              options={shippingZoneOptions.warehouses}
              getOptionLabel={(option) => `${option.name} (${option.slug || option.saleor_id})`}
              value={shippingZoneOptions.warehouses.filter(w => (formData.warehouse_ids || []).includes(w.saleor_id))}
              onChange={(_, newValue) =>
                setFormData(prev => ({ ...prev, warehouse_ids: newValue.map(w => w.saleor_id) }))
              }
              filterSelectedOptions
              disableCloseOnSelect
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Assign Warehouses"
                  placeholder="Select warehouses"
                  helperText={
                    (formData.warehouse_ids || []).length > 0 && (formData.channel_ids || []).length === 0
                      ? "⚠ Selected warehouses must share a channel with this shipping zone."
                      : `${(formData.warehouse_ids || []).length} warehouse(s) selected`
                  }
                  FormHelperTextProps={{
                    sx: {
                      color:
                        (formData.warehouse_ids || []).length > 0 && (formData.channel_ids || []).length === 0
                          ? "#d97706"
                          : undefined,
                    },
                  }}
                />
              )}
            />
          </Grid>
        </Grid>
      </Box>
    </Box>
  );

  const renderProductTypeForm = () => (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 4, mt: 0.5 }}>
      {/* General Information */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 800, color: ORANGE, textTransform: "uppercase", fontSize: "0.8rem", letterSpacing: "1.5px" }}>
          General Information
        </Typography>
        <Divider sx={{ mb: 3 }} />
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Product Type Name *"
              name="name"
              value={formData.name || ""}
              onChange={handleFormChange}
              required
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
            />
          </Grid>
        </Grid>
      </Box>

      {/* Type */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 800, color: ORANGE, textTransform: "uppercase", fontSize: "0.8rem", letterSpacing: "1.5px" }}>
          Type
        </Typography>
        <Divider sx={{ mb: 3 }} />
        <Grid container spacing={2}>
          {productTypeOptions.product_type_kinds.map((kind) => (
            <Grid item xs={12} key={kind.value}>
              <FormControlLabel
                control={
                  <input
                    type="radio"
                    name="kind"
                    value={kind.value}
                    checked={formData.kind === kind.value}
                    onChange={handleFormChange}
                  />
                }
                label={kind.label}
              />
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Shipping */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 800, color: ORANGE, textTransform: "uppercase", fontSize: "0.8rem", letterSpacing: "1.5px" }}>
          Shipping
        </Typography>
        <Divider sx={{ mb: 3 }} />
        <FormControlLabel
          control={<Switch checked={!!formData.is_shipping_required} onChange={handleFormChange} name="is_shipping_required" />}
          label="Is this product type shippable?"
        />
      </Box>

      {/* Taxes */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 800, color: ORANGE, textTransform: "uppercase", fontSize: "0.8rem", letterSpacing: "1.5px" }}>
          Taxes
        </Typography>
        <Divider sx={{ mb: 3 }} />
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              select
              fullWidth
              label="Tax Class"
              name="tax_class_id"
              value={formData.tax_class_id || ""}
              onChange={handleFormChange}
            >
              <MenuItem value="">No tax class</MenuItem>
              {productTypeOptions.tax_classes.map((taxClass) => (
                <MenuItem key={taxClass.id} value={taxClass.id}>
                  {taxClass.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
      </Box>
    </Box>
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
              Sync {tab === 0 ? "Channels" : tab === 1 ? "Warehouses" : tab === 2 ? "Shipping Zones" : "Product Types"}
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
            <Tab label="Product Types" />
          </Tabs>

          <Box sx={{ p: 4 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: TEXT }}>
                {tab === 0 ? "Active Channels" : tab === 1 ? "Warehouse Nodes" : tab === 2 ? "Shipping Policy Zones" : "Product Types"}
              </Typography>
              {(tab === 0 || tab === 1 || tab === 2 || tab === 3) && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    if (tab === 0) handleOpenDialog("channel");
                    if (tab === 1) handleOpenDialog("warehouse");
                    if (tab === 2) handleOpenDialog("shippingZone");
                    if (tab === 3) handleOpenDialog("productType");
                  }}
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
                    <TableCell sx={{ fontWeight: 700, color: "#4b5563" }}>
                      {tab === 3 ? "Type Name" : "Name"}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "#4b5563" }}>
                      {tab === 0 ? "Slug / Currency" : tab === 1 ? "Location" : tab === 2 ? "Info" : "Slug"}
                    </TableCell>
                    {tab !== 3 && (
                      <TableCell sx={{ fontWeight: 700, color: "#4b5563" }}>
                        Status
                      </TableCell>
                    )}
                    <TableCell sx={{ fontWeight: 700, color: "#4b5563" }}>
                      {tab === 3 ? "Shippable" : "Linked Entities"}
                    </TableCell>
                    {tab === 3 && <TableCell sx={{ fontWeight: 700, color: "#4b5563" }}>Tax Class</TableCell>}
                    <TableCell align="right" sx={{ fontWeight: 700, color: "#4b5563" }}>
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(tab === 0 ? channels : tab === 1 ? warehouses : tab === 2 ? shippingZones : productTypes).map(item => (
                    <TableRow key={item.id} hover sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                      <TableCell>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: TEXT }}>
                          {item.name}
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
                            {[item.city, item.country_code].filter(Boolean).join(", ")}
                          </Typography>
                        ) : tab === 2 ? (
                          <Typography
                            variant="body2"
                            sx={{ maxWidth: 200, noWrap: true, textOverflow: "ellipsis", overflow: "hidden" }}
                          >
                            {item.description || "No description"}
                          </Typography>
                        ) : (
                          <Chip label={item.slug} size="small" variant="outlined" />
                        )}
                      </TableCell>
                      {tab !== 3 && (
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
                      )}
                      <TableCell>
                        {tab === 3 ? (
                          <Chip
                            label={item.is_shipping_required ? "Shippable" : "Not shippable"}
                            size="small"
                            sx={{
                              fontWeight: 600,
                              bgcolor: item.is_shipping_required ? "rgba(34, 197, 94, 0.1)" : "rgba(107, 114, 128, 0.1)",
                              color: item.is_shipping_required ? "#22c55e" : "#4b5563",
                            }}
                          />
                        ) : (
                          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                            {tab === 0 && (item.warehouse_ids || []).length > 0 && (
                              <Tooltip title="Linked Warehouses">
                                <Chip icon={<InfoIcon style={{ fontSize: 14 }} />} label={`${item.warehouse_ids.length} WH`} size="small" />
                              </Tooltip>
                            )}
                            {tab === 2 && (
                              <>
                                {(item.countries || []).length > 0 && (
                                  <Tooltip title="Countries">
                                    <Chip label={`${item.countries.length} Countries`} size="small" variant="outlined" sx={{ bgcolor: "#eff6ff", color: "#2563eb", borderColor: "#bfdbfe" }} />
                                  </Tooltip>
                                )}
                                {(item.channel_ids || []).length > 0 && (
                                  <Tooltip title="Linked Channels">
                                    <Chip label={`${item.channel_ids.length} Channel${item.channel_ids.length > 1 ? "s" : ""}`} size="small" color="secondary" variant="outlined" />
                                  </Tooltip>
                                )}
                                {(item.warehouse_ids || []).length > 0 && (
                                  <Tooltip title="Linked Warehouses">
                                    <Chip label={`${item.warehouse_ids.length} Warehouse${item.warehouse_ids.length > 1 ? "s" : ""}`} size="small" variant="outlined" sx={{ bgcolor: "#f0fdf4", color: "#16a34a", borderColor: "#bbf7d0" }} />
                                  </Tooltip>
                                )}
                                {(item.shipping_methods || []).length > 0 && (
                                  <Tooltip title="Shipping Methods">
                                    <Chip label={`${item.shipping_methods.length} Method${item.shipping_methods.length > 1 ? "s" : ""}`} size="small" variant="outlined" />
                                  </Tooltip>
                                )}
                              </>
                            )}
                          </Box>
                        )}
                      </TableCell>
                      {tab === 3 && (
                        <TableCell>
                          <Typography variant="body2">
                            {item.tax_class_name || "—"}
                          </Typography>
                        </TableCell>
                      )}
                      <TableCell align="right">
                        {(tab === 0 || tab === 1 || tab === 2 || tab === 3) && (
                          <>
                            <IconButton
                              size="small"
                              onClick={() => {
                                if (tab === 0) handleOpenDialog("channel", item);
                                if (tab === 1) handleOpenDialog("warehouse", item);
                                if (tab === 2) handleOpenDialog("shippingZone", item);
                                if (tab === 3) handleOpenDialog("productType", item);
                              }}
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
                      </TableCell>
                    </TableRow>
                  ))}
                  {(tab === 0 ? channels : tab === 1 ? warehouses : tab === 2 ? shippingZones : productTypes).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={tab === 3 ? 5 : 5} align="center" sx={{ py: 6 }}>
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
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            "& .MuiDialogContent-root": {
              padding: "32px",
            }
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: "1.3rem", pb: 2 }}>
          {editItem ? "Edit" : "Create"} {dialogType === "channel" ? "Channel" : dialogType === "shippingZone" ? "Shipping Zone" : dialogType === "productType" ? "Product Type" : "Warehouse"}
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
          {dialogType === "productType" && renderProductTypeForm()}

          {editItem && (
            <Box sx={{ mt: 3, p: 2, bgcolor: "#f9fafb", borderRadius: 2 }}>
              <Typography variant="caption" sx={{ display: "block", color: "#6b7280", mb: 1 }}>
                System Information
              </Typography>

              <Typography variant="caption" sx={{ display: "block" }}>
                Last Synced: {new Date(editItem.synced_at).toLocaleString()}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, px: 4, borderTop: "1px solid #e5e7eb", gap: 2 }}>
          <Button 
            onClick={handleCloseDialog} 
            sx={{ 
              color: "#6b7280", 
              textTransform: "none", 
              fontWeight: 600,
              px: 3 
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={syncing}
            sx={{ 
              bgcolor: TEXT, 
              px: 4, 
              py: 1,
              borderRadius: "10px",
              textTransform: "none",
              fontWeight: 600,
              "&:hover": { bgcolor: "#1a253a" }
            }}
          >
            {syncing ? <CircularProgress size={20} color="inherit" /> : "Save Changes"}
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
            This action cannot be undone. The {tab === 0 ? "channel" : tab === 1 ? "warehouse" : tab === 2 ? "shipping zone" : "product type"} will be permanently removed.
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
