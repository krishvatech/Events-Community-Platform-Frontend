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
} from "@mui/material";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";

import { API_BASE, getToken } from "../utils/api.js";
import { isOwnerUser, isStaffUser } from "../utils/adminRole.js";

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
  title = "Payment successful",
  subtitle = "Your order has been placed.",
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
          <Typography variant="h6" color="error" sx={{ fontWeight: 700 }}>
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
      }
    })();
  }, []);

  useEffect(() => {
    loadOrders();
  }, []);

  const viewItems = useMemo(() => {
    return (cart || []).map((it) => ({
      id: it.id,
      eventId: it.event?.id || null,   // ✅ needed for register-bulk
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

    // unique event ids from cart
    const eventIds = [...new Set(viewItems.map((i) => i.eventId).filter(Boolean))];
    if (!eventIds.length) return;

    try {
      // 1) create EventRegistration rows
      const res = await fetch(`${API_BASE}/events/register-bulk/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ event_ids: eventIds }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await res.json();

      // 2) finalize current cart as a "paid" order (keeps items attached)
      const checkoutRes = await fetch(`${API_BASE}/orders/checkout/`, {
        method: "POST",
        headers: authHeaders(),
      });
      if (!checkoutRes.ok) throw new Error(`Checkout HTTP ${checkoutRes.status}`);
      await checkoutRes.json();

      // 3) toast + refresh cart + reload previous orders
      setShowPaid(true);
      setTimeout(() => {
        setShowPaid(false);
      }, 2000);

      await refreshCart();
      await loadOrders();
    } catch (err) {
      console.error("Bulk register failed:", err);
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
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box
        sx={{
          mb: 3,
          display: "flex",
          alignItems: "center",
          gap: 2,
        }}
      >
        <Avatar
          sx={{
            bgcolor: "#14b8a6",      // teal circle like your screenshot
            width: 40,
            height: 40,
            fontWeight: 700,
          }}
        >
          C
        </Avatar>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
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
                borderRadius: 3,
                border: "1px solid #e5e7eb",
                overflow: "hidden",
              }}
            >
              {viewItems.length === 0 ? (
                <Box sx={{ p: 6, textAlign: "center" }}>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 600, color: "text.primary" }}
                  >
                    Your cart is empty
                  </Typography>
                  <Typography sx={{ mt: 1, color: "text.secondary" }}>
                    Add items from the events section to see them here.
                  </Typography>
                </Box>
              ) : (
                <>
                  <Box sx={{ width: "100%", overflowX: "auto" }}>
                    <Table sx={{ minWidth: 600 }} size="small">
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
                                aria-label="remove"
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
                                inputProps={{ min: 1 }}
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
                      sx={{ maxWidth: 260 }}
                    />
                    <Button
                      onClick={applyCoupon}
                      variant="outlined"
                      sx={{ textTransform: "none" }}
                    >
                      Apply
                    </Button>
                    <Box sx={{ flex: 1 }} />
                    <Button
                      onClick={refreshCart}
                      variant="outlined"
                      sx={{ textTransform: "none" }}
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
                  borderRadius: 3,
                  border: "1px solid #e5e7eb",
                  p: 3,
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
                    borderRadius: 2,
                    border: "1px solid #e5e7eb",
                    overflow: "hidden",
                  }}
                >
                  <Box
                    sx={{
                      px: 2.5,
                      py: 1.5,
                      display: "flex",
                      justifyContent: "space-between",
                      borderBottom: "1px solid #e5e7eb",
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
                        borderBottom: "1px solid #e5e7eb",
                      }}
                    >
                      <span className="flex items-center gap-2">
                        <span>Discount</span>{" "}
                        <Chip label={couponCode.toUpperCase()} size="small" />
                      </span>
                      <span
                        style={{
                          fontWeight: 600,
                          color: "#0f766e",
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
              borderRadius: 3,
              border: "1px solid #e5e7eb",
              p: 3,
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 2,
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                Previous orders
              </Typography>
              <Chip label="Paid only" size="small" variant="outlined" />
            </Box>

            {ordersLoading && (
              <Box sx={{ width: "100%", overflowX: "auto" }}>
                <Table size="small" sx={{ minWidth: 600 }}>
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
              <Typography variant="body2" color="error">
                {ordersError}
              </Typography>
            )}

            {!ordersLoading && !ordersError && viewOrders.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                No paid orders yet.
              </Typography>
            )}

            {!ordersLoading && !ordersError && viewOrders.length > 0 && (
              <Box sx={{ width: "100%", overflowX: "auto" }}>
                <Table size="small" sx={{ minWidth: 600 }}>
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
                        sx={{ cursor: "pointer" }}
                        onClick={() => handleOrderClick(o)}
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
                          <Chip
                            label={String(o.status || "paid").toUpperCase()}
                            size="small"
                            variant="outlined"
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
      >
        <DialogTitle>
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
