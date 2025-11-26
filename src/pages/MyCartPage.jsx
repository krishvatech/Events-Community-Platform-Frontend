// src/pages/MyCartPage.jsx
import React, { useMemo, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  IconButton,
  Paper,
  Grid,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Backdrop,
  Typography,
  Grow,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import AccountSidebar from "../components/AccountSidebar.jsx";
// Icons
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import TimelineOutlinedIcon from "@mui/icons-material/TimelineOutlined";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import ForumOutlinedIcon from "@mui/icons-material/ForumOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import MailOutlineOutlinedIcon from "@mui/icons-material/MailOutlineOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import WorkspacePremiumOutlinedIcon from "@mui/icons-material/WorkspacePremiumOutlined";
import AutorenewOutlinedIcon from "@mui/icons-material/AutorenewOutlined";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import { API_BASE, getToken } from "../utils/api.js";
const navItems = [
  { key: "activity", label: "Activity", icon: <TimelineOutlinedIcon /> },
  { key: "events", label: "Courses", icon: <SchoolOutlinedIcon /> },
  { key: "profile", label: "Profile", icon: <PersonOutlineOutlinedIcon /> },
  { key: "elibrary", label: "E-Library", icon: <MenuBookOutlinedIcon /> },
  { key: "forums", label: "Forums", icon: <ForumOutlinedIcon /> },
  { key: "groups", label: "Groups", icon: <GroupsOutlinedIcon /> },
  { key: "messages", label: "Messages", icon: <MailOutlineOutlinedIcon /> },
  { key: "orders", label: "Orders", icon: <ReceiptLongOutlinedIcon /> }, // highlight this like screenshot
  { key: "memberships", label: "Memberships", icon: <WorkspacePremiumOutlinedIcon /> },
  { key: "subscriptions", label: "Subscriptions", icon: <AutorenewOutlinedIcon /> },
  { key: "notifications", label: "Notifications", icon: <NotificationsNoneOutlinedIcon /> },
  { key: "friends", label: "Friends", icon: <PeopleAltOutlinedIcon /> },
  { key: "settings", label: "Settings", icon: <SettingsOutlinedIcon /> },
];


const API_ORIGIN = API_BASE.replace(/\/api$/, "");
const toAbs = (u) => {
  if (!u) return u;
  // already absolute?
  if (/^https?:\/\//i.test(u)) return u;
  // ensure leading slash then join to origin
  const p = u.startsWith("/") ? u : `/${u}`;
  return `${API_ORIGIN}${p}`;
};


// ---------------- Success Toast (centered, animated) ----------------
function SuccessToast({ open, onClose, title = "Payment successful", subtitle = "Your order has been placed." }) {
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
          {/* Animated success badge */}
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
              backgroundColor: "rgba(16,185,129,0.12)", // emerald-500/12
              // pulse ring
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
                "70%": { boxShadow: "0 0 0 18px rgba(16,185,129,0)" },
                "100%": { boxShadow: "0 0 0 0 rgba(16,185,129,0)" },
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
          <Typography variant="h6" sx={{ fontWeight: 800, color: "success.main" }}>
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


const authHeaders = () => {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
};

const fmt = (n) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n || 0);
export default function MyCartPage() {
  const navigate = useNavigate();
  const storedUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  }, []);
  const fullName = storedUser?.name || storedUser?.full_name || "Member";
  const first = (fullName || "Member").split(" ")[0];
  const [leftActive, setLeftActive] = useState("orders"); // matches the screenshot selection
  const [tab, setTab] = useState(0); // Cart | Orders | Addresses | Account details
  const [cart, setCart] = useState([]);        // API: Order.items (OrderItem[])
  const [couponCode, setCouponCode] = useState("");   // optional: wire later to backend
  const [discount, setDiscount] = useState(0);
  const [subtotal, setSubtotal] = useState(0);
  const [total, setTotal] = useState(0);
  const [showPaid, setShowPaid] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/cart/`, { headers: authHeaders() });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setCart(Array.isArray(data?.items) ? data.items : []);
        setSubtotal(Number(data?.subtotal ?? 0));
        setTotal(Number(data?.total ?? 0));
        // update header badge
        const count = (data?.items || []).reduce((s, it) => s + (it.quantity || 0), 0);
        localStorage.setItem("cart_count", String(count));
        window.dispatchEvent(new Event("cart:update"));
      } catch (e) {
        setCart([]); setSubtotal(0); setTotal(0);
      }
    })();
  }, []);

  // normalize server items to the view you already render
  const viewItems = useMemo(() => {
    return (cart || []).map((it) => ({
      id: it.id,
      eventId: it.event?.id || null,
      title: it.event?.title || "Event",
      slug: it.event?.slug,
      price: Number(it.unit_price ?? it.event?.price ?? 0),
      qty: Number(it.quantity ?? 1),
      image: it.event?.preview_image || it.event?.image_preview || it.event?.thumbnail || it.event?.image || null,
    }));
  }, [cart]);

  const applyCoupon = () => {
    // demo rules: IMAA10 => 10% | SAVE200 => $200 off
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
    const count = (data?.items || []).reduce((s, it) => s + (it.quantity || 0), 0);
    localStorage.setItem("cart_count", String(count));
    window.dispatchEvent(new Event("cart:update"));
  }

  const updateQty = async (orderItemId, qty) => {
    const q = Math.max(1, Number(qty) || 1);
    await fetch(`${API_BASE}/cart/items/${orderItemId}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders() },
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
    const eventIds = [...new Set(viewItems.map(i => i.eventId).filter(Boolean))];
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

      // 2) (optional) clear the cart on server if you have an endpoint; ignore errors
      try {
        await fetch(`${API_BASE}/cart/clear/`, { method: "POST", headers: authHeaders() });
      } catch { }

      setShowPaid(true);
      setTimeout(() => {
        setShowPaid(false);
        // Example: clear locally (comment out if you don't want to clear)
        // setCart([]); setSubtotal(0); setTotal(0);
        // localStorage.setItem("cart_count", "0");
        // window.dispatchEvent(new Event("cart:update"));
        // navigate("/account/events"); // or stay on cart
      }, 2000);

      // 3) refresh cart UI + badge
      await refreshCart();


    } catch (err) {
      console.error(err);
      // TODO: show a toast/snackbar error for the user
    }
  };
  return (
    <div className="min-h-screen bg-slate-50">
      <Container maxWidth="xl" className="py-6 sm:py-8">
        <div className="grid grid-cols-12 gap-3 md:gap-4 items-start">
          <aside className="col-span-12 lg:col-span-3">
            <AccountSidebar />
          </aside>
          {/* MAIN */}
          <main className="col-span-12 lg:col-span-9">
            {/* Tabs row (Cart | Orders | Addresses | Account details) */}
            <Paper elevation={0} className="rounded-2xl border border-slate-200 mb-4">
              <Tabs
                value={tab}
                onChange={(_, v) => setTab(v)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  px: 1,
                  "& .MuiTab-root": { textTransform: "none", minHeight: 46 },
                  "& .Mui-selected": { color: "#0ea5a4 !important", fontWeight: 700 },
                  "& .MuiTabs-indicator": { backgroundColor: "#0ea5a4" },
                }}
              >
                <Tab label="Cart" />
                <Tab label="Orders" />
                <Tab label="Addresses" />
                <Tab label="Account details" />
              </Tabs>
            </Paper>
            {/* CART CONTENT */}
            <div className="grid grid-cols-12 gap-6">
              {/* Table + coupon */}
              <div className="col-span-12 lg:col-span-8">
                <Paper elevation={0} className="rounded-2xl border border-slate-200 overflow-hidden">
                  {viewItems.length === 0 ? (
                    <Box className="p-8 text-center">
                      <h3 className="text-xl font-semibold text-slate-700">Your cart is empty</h3>
                      <p className="text-slate-500 mt-2">Browse events and add tickets to your cart.</p>
                      <Button
                        component={Link}
                        to="/events"
                        className="mt-4 rounded-xl"
                        sx={{ textTransform: "none", backgroundColor: "#10b8a6", "&:hover": { backgroundColor: "#0ea5a4" } }}
                        variant="contained"
                      >
                        Explore events
                      </Button>
                    </Box>
                  ) : (
                    <>
                      {/* 👇 Scroll container so Subtotal is always visible on laptop/desktop & mobile */}
                      <Box sx={{ width: "100%", overflowX: "auto" }}>
                        <Table sx={{ minWidth: 700 }} size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell />
                              <TableCell className="font-semibold text-slate-600">Product</TableCell>
                              <TableCell className="font-semibold text-slate-600">Price</TableCell>
                              <TableCell className="font-semibold text-slate-600">Quantity</TableCell>
                              <TableCell className="font-semibold text-slate-600">Subtotal</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {viewItems.map((it) => (
                              <TableRow key={it.id}>
                                <TableCell width={44}>
                                  <IconButton size="small" onClick={() => removeItem(it.id)} aria-label="remove">
                                    <CloseOutlinedIcon />
                                  </IconButton>
                                </TableCell>
                                <TableCell>
                                  <Box className="flex items-center gap-3">
                                    {it.image ? (
                                      <img
                                        src={toAbs(it.image)}
                                        alt={it.title}
                                        className="w-12 h-12 rounded-md object-cover border border-slate-200"
                                        loading="lazy"
                                      />
                                    ) : (
                                      <div className="w-12 h-12 rounded-md bg-slate-200" />
                                    )}
                                    <div className="min-w-0">
                                      <Link
                                        to={it.slug ? `/events/${it.slug}` : "#"}
                                        className="text-slate-800 font-medium hover:text-teal-700 line-clamp-2"
                                      >
                                        {it.title}
                                      </Link>
                                    </div>
                                  </Box>
                                </TableCell>
                                <TableCell>{fmt(Number(it.price) || 0)}</TableCell>
                                <TableCell width={120}>
                                  <TextField
                                    type="number"
                                    size="small"
                                    value={it.qty}
                                    onChange={(e) => updateQty(it.id, e.target.value)}
                                    inputProps={{ min: 1 }}
                                  />
                                </TableCell>
                                <TableCell className="font-semibold">
                                  {fmt((Number(it.price) || 0) * (it.qty || 1))}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </Box>
                      <Divider />
                      <Box className="p-4 sm:p-5 flex flex-col sm:flex-row gap-3 sm:items-center">
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
                          className="rounded-xl"
                        >
                          APPLY COUPON
                        </Button>
                        <div className="flex-1" />
                        <Button
                          onClick={() => setCart([...cart])} // persist already handled by useEffect
                          variant="outlined"
                          sx={{ textTransform: "none" }}
                          className="rounded-xl"
                        >
                          UPDATE CART
                        </Button>
                      </Box>
                    </>
                  )}
                </Paper>
              </div>
              {/* Totals */}
              <div className="col-span-12 lg:col-span-4 lg:sticky lg:top-24">
                <Paper elevation={0} className="rounded-2xl border border-slate-200">
                  <Box className="p-5">
                    <h3 className="text-2xl font-extrabold text-slate-800 mb-3">Cart totals</h3>
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                        <span className="text-slate-600">Subtotal</span>
                        <span className="font-semibold">{fmt(subtotal)}</span>
                      </div>
                      {discount > 0 && (
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                          <span className="text-slate-600 flex items-center gap-2">
                            Discount <Chip label={couponCode.toUpperCase()} size="small" />
                          </span>
                          <span className="font-semibold text-teal-700">−{fmt(discount)}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between px-4 py-3">
                        <span className="text-slate-800 font-semibold">Total</span>
                        <span className="text-slate-900 font-extrabold">{fmt(total)}</span>
                      </div>
                    </div>
                    <Button
                      onClick={proceedCheckout}
                      disabled={cart.length === 0}
                      fullWidth
                      className="mt-4 rounded-xl"
                      sx={{ textTransform: "none", py: 1.25, backgroundColor: "teal-500", "&:hover": { backgroundColor: "teal-400" } }}
                      variant="contained"
                    >
                      Proceed to checkout
                    </Button>
                  </Box>
                </Paper>
              </div>
            </div>
          </main>
        </div>
      </Container>
      {/* Centered animated toast */}
      <SuccessToast open={showPaid} onClose={() => setShowPaid(false)} />
    </div>
  );
}