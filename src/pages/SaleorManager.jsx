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
} from "@mui/material";
import PublicIcon from "@mui/icons-material/Public";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { apiClient, getSaleorDashboardUrl } from "../utils/api";
import { isOwnerUser } from "../utils/adminRole";

const ORANGE = "#E8532F";
const TEXT = "#2C3E5A";

export default function SaleorManager() {
  const [tab, setTab] = useState(0);
  const [channels, setChannels] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [shippingZones, setShippingZones] = useState([]);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);
  const [loadingShippingZones, setLoadingShippingZones] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [saleorDashboardUrl, setSaleorDashboardUrl] = useState(null);

  useEffect(() => {
    if (!isOwnerUser()) {
      return;
    }
    getSaleorDashboardUrl()
      .then((data) => setSaleorDashboardUrl(data.url))
      .catch(() => {});
  }, []);

  // Auto-sync when Channels tab is opened
  useEffect(() => {
    if (tab === 0) {
      handleSyncChannels();
    }
  }, [tab]);

  // Auto-sync when Warehouses tab is opened
  useEffect(() => {
    if (tab === 1) {
      handleSyncWarehouses();
    }
  }, [tab]);

  // Auto-sync when Shipping Zones tab is opened
  useEffect(() => {
    if (tab === 2) {
      handleSyncShippingZones();
    }
  }, [tab]);

  const fetchChannels = async () => {
    setLoadingChannels(true);
    setError(null);
    try {
      const response = await apiClient.get("/events/saleor/channels/");
      setChannels(Array.isArray(response.data) ? response.data : response.data.results || []);
    } catch (err) {
      setError(`Failed to fetch channels: ${err.message}`);
    } finally {
      setLoadingChannels(false);
    }
  };

  const fetchWarehouses = async () => {
    setLoadingWarehouses(true);
    setError(null);
    try {
      const response = await apiClient.get("/events/saleor/warehouses/");
      setWarehouses(Array.isArray(response.data) ? response.data : response.data.results || []);
    } catch (err) {
      setError(`Failed to fetch warehouses: ${err.message}`);
    } finally {
      setLoadingWarehouses(false);
    }
  };

  const handleSyncChannels = async () => {
    setSyncing(true);
    setError(null);
    try {
      const response = await apiClient.post("/events/saleor/channels/sync/");
      setChannels(response.data.channels || []);
    } catch (err) {
      setError(`Failed to sync channels: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncWarehouses = async () => {
    setSyncing(true);
    setError(null);
    try {
      const response = await apiClient.post("/events/saleor/warehouses/sync/");
      setWarehouses(response.data.warehouses || []);
    } catch (err) {
      setError(`Failed to sync warehouses: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncShippingZones = async () => {
    setSyncing(true);
    setError(null);
    try {
      const response = await apiClient.post("/events/saleor/shipping-zones/sync/");
      setShippingZones(response.data.shipping_zones || []);
    } catch (err) {
      setError(`Failed to sync shipping zones: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleOpenSaleorDashboard = () => {
    if (saleorDashboardUrl) {
      window.open(saleorDashboardUrl, "_blank");
    }
  };

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
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 4 }}>
        <PublicIcon sx={{ fontSize: 32, color: ORANGE }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: TEXT, mb: 0.5 }}>
            Saleor Manager
          </Typography>
          <Typography variant="body2" sx={{ color: "#6b7280" }}>
            Manage Saleor channels and warehouses
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<OpenInNewIcon />}
          onClick={handleOpenSaleorDashboard}
          disabled={!saleorDashboardUrl}
          sx={{ textTransform: "none" }}
        >
          Open Saleor Dashboard
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tab}
          onChange={(e, newTab) => setTab(newTab)}
          sx={{ borderBottom: `1px solid #e0e0e0` }}
        >
          <Tab label="Channels" />
          <Tab label="Warehouses" />
          <Tab label="Shipping Zones" />
        </Tabs>

        {/* Channels Tab */}
        {tab === 0 && (
          <Box sx={{ p: 3 }}>

            {loadingChannels ? (
              <Box>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} variant="rectangular" height={60} sx={{ mb: 1 }} />
                ))}
              </Box>
            ) : channels.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <Typography variant="body2" sx={{ color: "#6b7280" }}>
                  No channels found. Click "Sync from Saleor" to fetch channels.
                </Typography>
              </Box>
            ) : (
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: "#f9fafb" }}>
                    <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Slug</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Currency</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Synced At</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {channels.map((ch) => (
                    <TableRow key={ch.id}>
                      <TableCell>{ch.name}</TableCell>
                      <TableCell>{ch.slug}</TableCell>
                      <TableCell>{ch.currency}</TableCell>
                      <TableCell>
                        <Chip
                          label={ch.is_active ? "Active" : "Inactive"}
                          color={ch.is_active ? "success" : "default"}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{new Date(ch.synced_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Box>
        )}

        {/* Warehouses Tab */}
        {tab === 1 && (
          <Box sx={{ p: 3 }}>

            {loadingWarehouses ? (
              <Box>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} variant="rectangular" height={60} sx={{ mb: 1 }} />
                ))}
              </Box>
            ) : warehouses.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <Typography variant="body2" sx={{ color: "#6b7280" }}>
                  No warehouses found. Click "Sync from Saleor" to fetch warehouses.
                </Typography>
              </Box>
            ) : (
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: "#f9fafb" }}>
                    <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>City</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Country</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Synced At</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {warehouses.map((wh) => (
                    <TableRow key={wh.id}>
                      <TableCell>{wh.name}</TableCell>
                      <TableCell>{wh.city || "—"}</TableCell>
                      <TableCell>{wh.country || "—"}</TableCell>
                      <TableCell>
                        <Chip
                          label={wh.is_active ? "Active" : "Inactive"}
                          color={wh.is_active ? "success" : "default"}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{new Date(wh.synced_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Box>
        )}

        {/* Shipping Zones Tab */}
        {tab === 2 && (
          <Box sx={{ p: 3 }}>
            {loadingShippingZones ? (
              <Box>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} variant="rectangular" height={60} sx={{ mb: 1 }} />
                ))}
              </Box>
            ) : shippingZones.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <Typography variant="body2" sx={{ color: "#6b7280" }}>
                  No shipping zones found.
                </Typography>
              </Box>
            ) : (
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: "#f9fafb" }}>
                    <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Synced At</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {shippingZones.map((zone) => (
                    <TableRow key={zone.id}>
                      <TableCell>{zone.name}</TableCell>
                      <TableCell>{zone.description || "—"}</TableCell>
                      <TableCell>
                        <Chip
                          label={zone.is_active ? "Active" : "Inactive"}
                          color={zone.is_active ? "success" : "default"}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{new Date(zone.synced_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Box>
        )}
      </Paper>
    </Container>
  );
}
