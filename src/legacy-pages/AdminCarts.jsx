// src/pages/AdminCarts.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Grid,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Backdrop,
  Grow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Tabs,
  Tab,
  Skeleton,
  Avatar,
  ListItemAvatar,
  Alert,
} from "@mui/material";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";

import { API_BASE, getToken } from "../utils/api.js";
import { isOwnerUser, isStaffUser } from "../utils/adminRole.js";
import AdminStatusChip from "../components/admin/AdminStatusChip.jsx";
import AdminEmptyState from "../components/admin/AdminEmptyState.jsx";

// --- shared helpers (copied from MyCartPage) ---
const authHeaders = () => {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
};

const fmt = (n) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n || 0);

// --- Success toast (simplified copy from MyCartPage) ---
function SuccessToast({
  open,
  onClose,
  title = "Invoice generated",
  subtitle = "Your registration is pending until manual payment is received.",
}) {
  return (
    <Backdrop
      open={open}
      onClick={onClose}
      sx={{
        color: "#fff",
        zIndex: (t) => t.zIndex.modal + 2,
        backdropFilter: "blur(2px)",
        backgroundColor: "rgba(15,23,42,0.35)",
        p: 2,
      }}
    >
      <Grow in={open} timeout={280}>
        <Paper
          elevation={8}
          sx={{
            width: "100%",
            maxWidth: 420,
            borderRadius: 3,
            textAlign: "center",
            p: 3,
          }}
        >
          <Box
            sx={{
              position: "relative",
              width: 104,
              height: 104,
              mx: "auto",
              mb: 1.5,
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              backgroundColor: "rgba(16,185,129,0.12)",
              "&::after": {
                content: '""',
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                boxShadow: "0 0 0 0 rgba(16,185,129,0.55)",
                animation: "toastPulse 1100ms ease-out 2",
              },
              "@keyframes toastPulse": {
                "0%": { boxShadow: "0 0 0 0 rgba(16,185,129,0.55)" },
                "70%": {
                  boxShadow: "0 0 0 18px rgba(16,185,129,0)",
                },
                "100%": {
                  boxShadow: "0 0 0 0 rgba(16,185,129,0)",
                },
              },
            }}
          >
            <CheckCircleRoundedIcon
              sx={{
                fontSize: 68,
                color: "success.main",
                transform: "scale(0.8)",
                animation: "toastPop 260ms ease-out forwards",
                "@keyframes toastPop": {
                  "0%": { transform: "scale(0.8)", opacity: 0 },
                  "60%": { transform: "scale(1.08)", opacity: 1 },
                  "100%": { transform: "scale(1)", opacity: 1 },
                },
              }}
            />
          </Box>
          <Typography
            variant="h6"
            sx={{ fontWeight: 800, color: "success.main" }}
          >
            {title}
          </Typography>
          <Typography sx={{ color: "text.secondary", mt: 0.5 }}>
            {subtitle}
          </Typography>
        </Paper>
      </Grow>
    </Backdrop>
  );
}

export default function AdminCarts() {
  const owner = isOwnerUser();
  const staff = isStaffUser();

  // 🔒 Staff-only: block owners + non-staff
  if (!staff || owner) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            border: "1px solid #e5e7eb",
            p: 3,
          }}
        >
          <Typography component="h1" variant="h6" color="error" sx={{ fontFamily: "var(--imaa-font-serif)", fontWeight: 700 }}>
            You don&apos;t have permission to view this page.
          </Typography>
          <Typography sx={{ mt: 1, color: "text.secondary" }}>
            This cart view is available only to staff accounts.
          </Typography>
        </Paper>
      </Container>
    );
  }

  const [cart, setCart] = useState([]);
  const [subtotal, setSubtotal] = useState(0);
  const [total, setTotal] = useState(0);
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [showPaid, setShowPaid] = useState(false);
  const [cartLoading, setCartLoading] = useState(true);
  const [cartError, setCartError] = useState("");

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);

  const [tab, setTab] = useState(0);

  // load cart for the current staff user (same API as MyCartPage)
  useEffect(() => {
    (async () => {
      try {
        setCartError("");
        const res = await fetch(`${API_BASE}/cart/`, {
          headers: authHeaders(),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setCart(Array.isArray(data?.items) ? data.items : []);
        setSubtotal(Number(data?.subtotal ?? 0));
        setTotal(Number(data?.total ?? 0));

        // update global cart badge if you use it
        const count = (data?.items || []).reduce(
          (s, it) => s + (it.quantity || 0),
          0
        );
        localStorage.setItem("cart_count", String(count));
        window.dispatchEvent(new Event("cart:update"));
      } catch (e) {
        setCart([]);
        setSubtotal(0);
        setTotal(0);
        setCartError("Failed to load cart.");
      } finally {
        setCartLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    loadOrders();
  }, []);

  const viewItems = useMemo(() => {
    return (cart || []).map((it) => ({
      id: it.id,
      eventId: it.event?.id || null,
      title: it.event?.title || "Event",
      price: Number(it.unit_price ?? it.event?.price ?? 0),
      qty: Number(it.quantity ?? 1),
    }));
  }, [cart]);

  const viewOrders = useMemo(() => {
    return (orders || []).map((o) => ({
      id: o.id,
      number: String(o.id).padStart(4, "0"),
      total: Number(o.total ?? o.subtotal ?? 0),
      status: o.status,
      created: o.created_at || o.createdAt || null,
      items: (o.items || []).map((it) => ({
        id: it.id,
        title: it.event?.title || "Event",
        price: Number(it.unit_price ?? it.event?.price ?? 0),
        qty: Number(it.quantity ?? 1),
        image:
          it.event?.poster ||
          it.event?.thumbnail ||
          it.event?.banner ||
          it.event?.image ||
          null,
      })),
    }));
  }, [orders]);

  const applyCoupon = () => {
    let d = 0;
    if (couponCode.trim().toUpperCase() === "IMAA10") d = subtotal * 0.1;
    if (couponCode.trim().toUpperCase() === "SAVE200") d = 200;
    setDiscount(d);
    localStorage.setItem("cart_discount", String(d));
    localStorage.setItem("cart_coupon_code", couponCode.trim());
  };

  async function refreshCart() {
    const res = await fetch(`${API_BASE}/cart/`, { headers: authHeaders() });
    const data = await res.json();
    setCart(Array.isArray(data?.items) ? data.items : []);
    setSubtotal(Number(data?.subtotal ?? 0));
    setTotal(Number(data?.total ?? 0));
    const count = (data?.items || []).reduce(
      (s, it) => s + (it.quantity || 0),
      0
    );
    localStorage.setItem("cart_count", String(count));
    window.dispatchEvent(new Event("cart:update"));
  }

  async function loadOrders() {
    setOrdersLoading(true);
    setOrdersError("");
    try {
      const res = await fetch(`${API_BASE}/orders/`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to load orders:", e);
      setOrders([]);
      setOrdersError("Failed to load orders.");
    } finally {
      setOrdersLoading(false);
    }
  }

  const updateQty = async (orderItemId, qty) => {
    const q = Math.max(1, Number(qty) || 1);
    await fetch(`${API_BASE}/cart/items/${orderItemId}/`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify({ quantity: q }),
    });
    await refreshCart();
  };

  const removeItem = async (orderItemId) => {
    await fetch(`${API_BASE}/cart/items/${orderItemId}/`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    await refreshCart();
  };

  const proceedCheckout = async () => {
    if (!viewItems.length) return;

    try {
      const checkoutRes = await fetch(`${API_BASE}/orders/offline-checkout/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ payment_method: "bank_transfer" }),
      });

      if (!checkoutRes.ok) {
        const errBody = await checkoutRes.json().catch(() => ({}));
        throw new Error(errBody.detail || `Checkout HTTP ${checkoutRes.status}`);
      }
      await checkoutRes.json();

      setShowPaid(true);
      setTimeout(() => {
        setShowPaid(false);
      }, 2500);

      await refreshCart();
      await loadOrders();
      setTab(1);
    } catch (err) {
      console.error("Offline checkout failed:", err);
      alert(err.message || "Checkout failed. Please try again.");
    }
  };

  const handleOrderClick = (order) => {
    setSelectedOrder(order);
    setOrderDialogOpen(true);
  };

  const closeOrderDialog = () => {
    setOrderDialogOpen(false);
    setSelectedOrder(null);
  };


  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2.5, md: 4 }, px: { xs: 2, sm: 3 }, minWidth: 0 }}>
      <Box
        sx={{
          mb: 3,
          display: "flex",
          alignItems: { xs: "flex-start", sm: "center" },
          gap: 2,
          minWidth: 0,
        }}
      >
        <Avatar
          sx={{
            bgcolor: "var(--imaa-teal)",
            width: 40,
            height: 40,
            fontWeight: 700,
          }}
        >
          C
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography component="h1" variant="h5" sx={{ fontFamily: "var(--imaa-font-serif)", fontWeight: 800, color: "var(--imaa-ink)" }}>
            Staff Cart
          </Typography>
          <Typography sx={{ color: "text.secondary", mt: 0.25 }}>
            View and manage your cart from the admin area (staff-only).
          </Typography>
        </Box>
      </Box>


      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          aria-label="Staff cart sections"
          sx={{
            ".MuiTab-root": { textTransform: "none", fontWeight: 600 },
          }}
        >
          <Tab label="Cart" />
          <Tab label="Orders" />
        </Tabs>
      </Box>

      {tab === 0 && (
        <Grid container spacing={3}>
          {/* LEFT: table */}
          <Grid item xs={12} md={viewItems.length === 0 ? 12 : 8}>
            <Paper
              elevation={0}
              sx={{
                borderRadius: "var(--imaa-radius-card)",
                border: "1px solid var(--imaa-border)",
                overflow: "hidden",
                minWidth: 0,
                boxShadow: "var(--imaa-shadow-sm)",
              }}
            >
              {cartLoading ? (
                <Box role="status" aria-label="Loading cart" sx={{ p: 2.5 }}>
                  {[1, 2, 3].map((row) => <Skeleton key={row} variant="rounded" height={44} sx={{ mb: row === 3 ? 0 : 1 }} />)}
                </Box>
              ) : cartError ? (
                <Alert severity="error" role="alert" sx={{ m: 2 }}>{cartError}</Alert>
              ) : viewItems.length === 0 ? (
                <AdminEmptyState
                  compact
                  title="Your cart is empty"
                  description="Add items from the events section to see them here."
                  sx={{ border: 0, borderRadius: 0 }}
                />
              ) : (
                <>
                  <Box sx={{ width: "100%", maxWidth: "100%", overflowX: "auto" }}>
                    <Table sx={{ minWidth: 600 }} size="small" aria-label="Cart items">
                      <TableHead>
                        <TableRow>
                          <TableCell />
                          <TableCell sx={{ fontWeight: 600 }}>
                            Product
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>
                            Price
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>
                            Quantity
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>
                            Subtotal
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {viewItems.map((it) => (
                          <TableRow key={it.id}>
                            <TableCell width={44}>
                              <IconButton
                                size="small"
                                onClick={() => removeItem(it.id)}
                                aria-label={`Remove ${it.title} from cart`}
                                sx={{ minWidth: 40, minHeight: 40 }}
                              >
                                <CloseOutlinedIcon />
                              </IconButton>
                            </TableCell>
                            <TableCell>{it.title}</TableCell>
                            <TableCell>{fmt(it.price)}</TableCell>
                            <TableCell width={120}>
                              <TextField
                                type="number"
                                size="small"
                                value={it.qty}
                                onChange={(e) =>
                                  updateQty(it.id, e.target.value)
                                }
                                inputProps={{ min: 1, "aria-label": `Quantity for ${it.title}` }}
                              />
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>
                              {fmt((Number(it.price) || 0) * (it.qty || 1))}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                  <Divider />
                  <Box
                    sx={{
                      p: 2.5,
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 1.5,
                      alignItems: "center",
                    }}
                  >
                    <TextField
                      label="Coupon code"
                      size="small"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      sx={{ width: { xs: "100%", sm: "auto" }, maxWidth: { sm: 260 } }}
                    />
                    <Button
                      onClick={applyCoupon}
                      variant="outlined"
                      sx={{ textTransform: "none", minHeight: 40 }}
                    >
                      Apply
                    </Button>
                    <Box sx={{ flex: 1 }} />
                    <Button
                      onClick={refreshCart}
                      variant="outlined"
                      sx={{ textTransform: "none", minHeight: 40 }}
                    >
                      Refresh cart
                    </Button>
                  </Box>
                </>
              )}
            </Paper>
          </Grid>

          {/* RIGHT: totals */}
          {viewItems.length > 0 && (
            <Grid item xs={12} md={4}>
              <Paper
                elevation={0}
                sx={{
                  borderRadius: "var(--imaa-radius-card)",
                  border: "1px solid var(--imaa-border)",
                  p: { xs: 2, sm: 3 },
                  boxShadow: "var(--imaa-shadow-sm)",
                }}
              >
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 800, mb: 2, color: "text.primary" }}
                >
                  Cart totals
                </Typography>
                <Box
                  sx={{
                    borderRadius: "var(--imaa-radius-card)",
                    border: "1px solid var(--imaa-border)",
                    overflow: "hidden",
                  }}
                >
                  <Box
                    sx={{
                      px: 2.5,
                      py: 1.5,
                      display: "flex",
                      justifyContent: "space-between",
                      borderBottom: "1px solid var(--imaa-border)",
                    }}
                  >
                    <span>Subtotal</span>
                    <span style={{ fontWeight: 600 }}>{fmt(subtotal)}</span>
                  </Box>

                  {discount > 0 && (
                    <Box
                      sx={{
                        px: 2.5,
                        py: 1.5,
                        display: "flex",
                        justifyContent: "space-between",
                        borderBottom: "1px solid var(--imaa-border)",
                      }}
                    >
                      <span className="flex items-center gap-2">
                        <span>Discount</span>{" "}
                        <Chip label={couponCode.toUpperCase()} size="small" />
                      </span>
                      <span
                        style={{
                          fontWeight: 600,
                          color: "var(--imaa-teal-hover)",
                        }}
                      >
                        −{fmt(discount)}
                      </span>
                    </Box>
                  )}

                  <Box
                    sx={{
                      px: 2.5,
                      py: 1.5,
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>Total</span>
                    <span style={{ fontWeight: 800 }}>{fmt(total)}</span>
                  </Box>
                </Box>

                <Button
                  onClick={proceedCheckout}
                  disabled={cart.length === 0}
                  fullWidth
                  sx={{
                    mt: 2.5,
                    textTransform: "none",
                    py: 1.1,
                    minHeight: 44,
                  }}
                  variant="contained"
                >
                  Proceed to checkout
                </Button>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}

      {tab === 1 && (
        <Box sx={{ mt: 1 }}>
          <Paper
            elevation={0}
            sx={{
              borderRadius: "var(--imaa-radius-card)",
              border: "1px solid var(--imaa-border)",
              p: { xs: 2, sm: 3 },
              minWidth: 0,
              boxShadow: "var(--imaa-shadow-sm)",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: { xs: "flex-start", sm: "center" },
                justifyContent: "space-between",
                mb: 2,
                gap: 1,
                flexDirection: { xs: "column", sm: "row" },
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                Previous orders
              </Typography>
              <Chip label="Pending + paid" size="small" variant="outlined" />
            </Box>

            {ordersLoading && (
              <Box role="status" aria-label="Loading previous orders" sx={{ width: "100%", maxWidth: "100%", overflowX: "auto" }}>
                <Table size="small" sx={{ minWidth: 600 }} aria-label="Loading previous orders">
                  <TableHead>
                    <TableRow>
                      <TableCell>Order</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell align="right">Items</TableCell>
                      <TableCell align="right">Total</TableCell>
                      <TableCell align="right">Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[1, 2, 3].map((i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Skeleton width={80} />
                        </TableCell>
                        <TableCell>
                          <Skeleton width={140} />
                        </TableCell>
                        <TableCell align="right">
                          <Skeleton width={40} />
                        </TableCell>
                        <TableCell align="right">
                          <Skeleton width={70} />
                        </TableCell>
                        <TableCell align="right">
                          <Skeleton width={90} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}

            {!ordersLoading && ordersError && (
              <Alert severity="error" role="alert">{ordersError}</Alert>
            )}

            {!ordersLoading && !ordersError && viewOrders.length === 0 && (
              <AdminEmptyState compact title="No paid orders yet." sx={{ border: 0, p: 0 }} />
            )}

            {!ordersLoading && !ordersError && viewOrders.length > 0 && (
              <Box sx={{ width: "100%", maxWidth: "100%", overflowX: "auto" }}>
                <Table size="small" sx={{ minWidth: 600 }} aria-label="Previous orders">
                  <TableHead>
                    <TableRow>
                      <TableCell>Order</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell align="right">Items</TableCell>
                      <TableCell align="right">Total</TableCell>
                      <TableCell align="right">Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {viewOrders.map((o) => (
                      <TableRow
                        key={o.id}
                        hover
                        tabIndex={0}
                        aria-label={`Open order ${o.number}`}
                        sx={{ cursor: "pointer", "&:focus-visible": { outline: "2px solid var(--imaa-teal)", outlineOffset: -2 } }}
                        onClick={() => handleOrderClick(o)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            handleOrderClick(o);
                          }
                        }}
                      >
                        <TableCell>#{o.number}</TableCell>
                        <TableCell>
                          {o.created
                            ? new Date(o.created).toLocaleString()
                            : "-"}
                        </TableCell>
                        <TableCell align="right">
                          {o.items?.length || 0}
                        </TableCell>
                        <TableCell align="right">
                          {fmt(o.total)}
                        </TableCell>
                        <TableCell align="right">
                          <AdminStatusChip
                            status={o.status || "paid"}
                            label={String(o.status || "paid").toUpperCase()}
                            color={
                              o.status === "cancelled"
                                ? "default"
                                : o.status === "pending"
                                  ? "warning"
                                  : "success"
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
          </Paper>
        </Box>
      )}
      <Dialog
        open={orderDialogOpen && !!selectedOrder}
        onClose={closeOrderDialog}
        fullWidth
        maxWidth="sm"
        aria-labelledby="admin-order-details-title"
      >
        <DialogTitle id="admin-order-details-title">
          {selectedOrder ? `Order #${selectedOrder.number}` : "Order details"}
        </DialogTitle>
        <DialogContent dividers>
          {selectedOrder?.created && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 2 }}
            >
              {new Date(selectedOrder.created).toLocaleString()}
            </Typography>
          )}

          <List dense>
            {selectedOrder?.items?.map((it) => (
              <ListItem
                key={it.id}
                disableGutters
                secondaryAction={
                  <Typography sx={{ fontWeight: 600 }}>
                    {fmt((it.price || 0) * (it.qty || 1))}
                  </Typography>
                }
              >
                <ListItemAvatar>
                  <Avatar
                    variant="rounded"
                    src={it.image || undefined}
                    alt={it.title}
                    sx={{ width: 40, height: 40, mr: 1 }}
                  >
                    {it.title?.charAt(0)?.toUpperCase() || "E"}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={it.title}
                  secondary={`Qty: ${it.qty} • ${fmt(it.price)}`}
                />
              </ListItem>
            ))}
          </List>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography sx={{ fontWeight: 600 }}>Total</Typography>
            <Typography sx={{ fontWeight: 800 }}>
              {fmt(selectedOrder?.total)}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeOrderDialog}>Close</Button>
        </DialogActions>
      </Dialog>

      <SuccessToast
        open={showPaid}
        onClose={() => setShowPaid(false)}
      />
    </Container>
  );
}
