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

  const viewItems = useMemo(() => {
    return (cart || []).map((it) => ({
      id: it.id,
      eventId: it.event?.id || null,   // ✅ needed for register-bulk
      title: it.event?.title || "Event",
      price: Number(it.unit_price ?? it.event?.price ?? 0),
      qty: Number(it.quantity ?? 1),
    }));
  }, [cart]);

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

    // ✅ unique event ids from cart
    const eventIds = [...new Set(viewItems.map((i) => i.eventId).filter(Boolean))];
    if (!eventIds.length) return;

    try {
      // 1) create EventRegistration rows (same as MyCartPage)
      const res = await fetch(`${API_BASE}/events/register-bulk/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ event_ids: eventIds }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await res.json();

      // 2) clear cart on server (if this endpoint exists)
      try {
        await fetch(`${API_BASE}/cart/clear/`, {
          method: "POST",
          headers: authHeaders(),
        });
      } catch (e) {
        console.warn("Failed to clear cart:", e);
      }

      // 3) show success toast + refresh cart
      setShowPaid(true);
      setTimeout(() => {
        setShowPaid(false);
      }, 2000);

      await refreshCart();
    } catch (err) {
      console.error("Bulk register failed:", err);
      // TODO: you can add a snackbar/toast here if you want
    }
  };


  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>
          Staff Cart
        </Typography>
        <Typography sx={{ color: "text.secondary", mt: 0.5 }}>
          View and manage your cart from the admin area (staff-only).
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* LEFT: table */}
        <Grid item xs={12} md={8}>
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
      </Grid>

      <SuccessToast
        open={showPaid}
        onClose={() => setShowPaid(false)}
      />
    </Container>
  );
}
