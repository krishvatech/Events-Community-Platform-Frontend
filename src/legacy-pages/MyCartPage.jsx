// src/pages/MyCartPage.jsx
import React, { useMemo, useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
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
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Skeleton,
  Pagination,
} from "@mui/material";
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
import { LeadGenModal } from "../components/LeadGenModal.jsx";

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
  if (/^https?:\/\//i.test(u)) return u;
  const p = u.startsWith("/") ? u : `/${u}`;
  return `${API_ORIGIN}${p}`;
};

// ---------------- Success Toast (centered, animated) ----------------
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
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n || 0);

const getInvoiceDownloadUrl = (invoice) => {
  if (!invoice?.id) return "";
  if (invoice.download_url) {
    return invoice.download_url.startsWith("http")
      ? invoice.download_url
      : `${API_ORIGIN}${invoice.download_url}`;
  }
  return `${API_BASE}/invoices/${invoice.id}/download_pdf/`;
};

const downloadInvoicePdf = async (invoice) => {
  if (!invoice?.id) return;
  const res = await fetch(getInvoiceDownloadUrl(invoice), {
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new Error("Invoice PDF is not ready yet. Please try again in a moment.");
  }
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${invoice.number || `invoice-${invoice.id}`}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

const generateInvoicePdf = async (invoice) => {
  if (!invoice?.id) return null;
  const res = await fetch(`${API_BASE}/invoices/${invoice.id}/generate_pdf/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || body.detail || "Could not generate invoice PDF.");
  }
  return body;
};


const BILLING_COUNTRIES = [
  { code: "CH", label: "Switzerland" },
  { code: "IN", label: "India" },
  { code: "SG", label: "Singapore" },
  { code: "US", label: "United States" },
  { code: "GB", label: "United Kingdom" },
  { code: "DE", label: "Germany" },
  { code: "FR", label: "France" },
  { code: "AE", label: "United Arab Emirates" },
];

const EMPTY_BILLING_ADDRESS = {
  first_name: "",
  last_name: "",
  company_name: "",
  street_address_1: "",
  street_address_2: "",
  city: "",
  postal_code: "",
  country: "CH",
  country_area: "",
  phone: "",
};

const billingAddressIsComplete = (addr) => {
  const required = ["first_name", "last_name", "street_address_1", "city", "postal_code", "country"];
  return required.every((key) => String(addr?.[key] || "").trim());
};

const normalizeMissingLeadGenFields = (raw) => {
  if (!raw) return {};
  if (Array.isArray(raw)) {
    return raw.reduce((acc, field) => {
      const key = String(field || "").trim();
      if (key) acc[key] = key;
      return acc;
    }, {});
  }
  return typeof raw === "object" ? raw : {};
};

export default function MyCartPage() {
  const navigate = useNavigate();
  const location = useLocation();
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

  const [cart, setCart] = useState([]);
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [subtotal, setSubtotal] = useState(0);
  const [total, setTotal] = useState(0);
  const [showPaid, setShowPaid] = useState(false);

  // NEW: state for previous orders + popup
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [orderStatus, setOrderStatus] = useState("");
  const [orderSort, setOrderSort] = useState("newest");
  const ORDERS_PER_PAGE = 10;

  // Billing address used for Saleor order/invoice checkout.
  const [billingAddress, setBillingAddress] = useState(EMPTY_BILLING_ADDRESS);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingSaving, setBillingSaving] = useState(false);
  const [billingMessage, setBillingMessage] = useState("");
  const [billingError, setBillingError] = useState("");
  const [leadGenModalOpen, setLeadGenModalOpen] = useState(false);
  const [leadGenMissingFields, setLeadGenMissingFields] = useState({});
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [checkoutWarningOpen, setCheckoutWarningOpen] = useState(false);

  const requestedOrderId = useMemo(() => {
    const params = new URLSearchParams(location.search || "");
    return params.get("order") || params.get("order_id") || params.get("openOrder") || "";
  }, [location.search]);

  useEffect(() => {
    const params = new URLSearchParams(location.search || "");
    const requestedTab = String(params.get("tab") || "").toLowerCase();
    const tabMap = { cart: 0, orders: 1, addresses: 2, account: 3, account_details: 3 };
    if (requestedTab && Object.prototype.hasOwnProperty.call(tabMap, requestedTab)) {
      setTab((current) => (current === tabMap[requestedTab] ? current : tabMap[requestedTab]));
    }
  }, [location.search]);

  // CART: load current cart items
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/cart/`, { headers: authHeaders() });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setCart(Array.isArray(data?.items) ? data.items : []);
        setSubtotal(Number(data?.subtotal ?? 0));
        setTotal(Number(data?.total ?? 0));
        // Cart badge shows number of distinct items/events, not total ticket quantity.
        // Example: one event with quantity 10 should still show badge 1.
        const count = Array.isArray(data?.items) ? data.items.length : 0;
        localStorage.setItem("cart_count", String(count));
        window.dispatchEvent(new Event("cart:update"));
      } catch (e) {
        setCart([]);
        setSubtotal(0);
        setTotal(0);
      }
    })();
  }, []);

  // Normalize cart items for view
  const viewItems = useMemo(() => {
    return (cart || []).map((it) => ({
      id: it.id,
      eventId: it.event?.id || null,
      title: it.event?.title || "Event",
      slug: it.event?.slug,
      price: Number(it.unit_price ?? it.event?.price ?? 0),
      qty: Number(it.quantity ?? 1),
      image:
        it.event?.preview_image ||
        it.event?.image_preview ||
        it.event?.thumbnail ||
        it.event?.image ||
        null,
    }));
  }, [cart]);

  // Prefer item-level totals for display. This avoids stale cart totals if an
  // item quantity changed but the backend cart aggregate has not refreshed yet.
  const computedSubtotal = useMemo(
    () =>
      (viewItems || []).reduce(
        (sum, it) => sum + (Number(it.price) || 0) * (Number(it.qty) || 1),
        0
      ),
    [viewItems]
  );
  const displaySubtotal = computedSubtotal || subtotal;
  const displayTotal = Math.max(0, displaySubtotal - (Number(discount) || 0));

  // NEW: load previous orders when Orders tab is opened
  const loadOrders = async (page = 1) => {
    try {
      setOrdersLoading(true);
      setOrdersError("");
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('page_size', ORDERS_PER_PAGE);
      if (orderStatus) params.append('status', orderStatus);
      if (orderSort) params.append('sort', orderSort);

      const res = await fetch(`${API_BASE}/orders/?${params.toString()}`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // Handle both paginated {results: [], count: N} and plain array responses
      let allOrders = [];
      let total = 0;

      if (Array.isArray(data)) {
        // Plain array response - apply client-side filtering and pagination
        allOrders = data;

        // Client-side filtering by status
        let filtered = allOrders;
        if (orderStatus) {
          filtered = filtered.filter(o => {
            const status = (o.status || o.payment_status || "paid").toLowerCase();
            return status === orderStatus.toLowerCase();
          });
        }

        // Client-side sorting
        if (orderSort === "oldest") {
          filtered.sort((a, b) => new Date(a.created || a.created_at) - new Date(b.created || b.created_at));
        } else {
          filtered.sort((a, b) => new Date(b.created || b.created_at) - new Date(a.created || a.created_at));
        }

        total = filtered.length;
        const start = (page - 1) * ORDERS_PER_PAGE;
        const end = start + ORDERS_PER_PAGE;
        setOrders(filtered.slice(start, end));
      } else if (data?.results && Array.isArray(data.results)) {
        // Paginated response from backend
        setOrders(data.results);
        total = data.count || data.results.length;
      } else {
        // Fallback
        setOrders([]);
        total = 0;
      }

      setOrdersTotal(total);
      console.log("Orders loaded:", { page, total, pageSize: ORDERS_PER_PAGE, status: orderStatus, sort: orderSort });
    } catch (err) {
      console.error("Failed to load orders", err);
      setOrdersError("Could not load your orders. Please try again.");
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  const loadBillingAddress = async () => {
    try {
      setBillingLoading(true);
      setBillingError("");
      const res = await fetch(`${API_BASE}/orders/billing-address/`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setBillingAddress({ ...EMPTY_BILLING_ADDRESS, ...(data || {}) });
    } catch (err) {
      console.error("Failed to load billing address", err);
      setBillingError("Could not load billing address.");
    } finally {
      setBillingLoading(false);
    }
  };

  const saveBillingAddress = async () => {
    setBillingSaving(true);
    setBillingMessage("");
    setBillingError("");
    try {
      if (!billingAddressIsComplete(billingAddress)) {
        throw new Error("Please fill first name, last name, street, city, postal code, and country.");
      }
      const res = await fetch(`${API_BASE}/orders/billing-address/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(billingAddress),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.detail || JSON.stringify(body) || `HTTP ${res.status}`);
      }
      setBillingAddress({ ...EMPTY_BILLING_ADDRESS, ...(body || {}) });

      // Set message based on Saleor sync status
      if (body?.saleor_synced) {
        setBillingMessage("Billing address saved and synced to Saleor.");
      } else if (body?.saleor_sync_error) {
        setBillingMessage(`Billing address saved locally. Saleor sync failed: ${body.saleor_sync_error}`);
      } else {
        setBillingMessage("Billing address saved.");
      }
      return body;
    } catch (err) {
      const msg = err.message || "Could not save billing address.";
      setBillingError(msg);
      throw err;
    } finally {
      setBillingSaving(false);
    }
  };

  const deleteBillingAddress = async () => {
    setDeleteConfirmOpen(false);
    setBillingSaving(true);
    setBillingMessage("");
    setBillingError("");
    try {
      const res = await fetch(`${API_BASE}/orders/billing-address/`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.detail || JSON.stringify(body) || `HTTP ${res.status}`);
      }
      setBillingAddress(EMPTY_BILLING_ADDRESS);
      setBillingMessage("Billing address deleted successfully.");
      return body;
    } catch (err) {
      const msg = err.message || "Could not delete billing address.";
      setBillingError(msg);
      throw err;
    } finally {
      setBillingSaving(false);
    }
  };

  useEffect(() => {
    if (tab === 1) {
      loadOrders(ordersPage);
    }
    if (tab === 2) {
      loadBillingAddress();
    }
  }, [tab, ordersPage, orderStatus, orderSort]);

  useEffect(() => {
    loadBillingAddress();
  }, []);

  // Reset to page 1 when filters/sort change
  useEffect(() => {
    setOrdersPage(1);
  }, [orderStatus, orderSort]);

  // NEW: normalized view for orders
  const viewOrders = useMemo(() => {
    return (orders || []).map((o) => {
      const rawItems = o.items || o.order_items || [];
      return {
        id: o.id,
        number: o.order_number || o.reference || o.code || o.id,
        created: o.created || o.created_at || o.ordered_at,
        status: o.status || o.payment_status || "paid",
        total: Number(o.total || o.total_amount || o.amount || 0),
        subtotal: Number(o.subtotal || o.total || 0),
        discount_amount: Number(o.discount_amount || 0),
        invoice: o.invoice || null,
        items: rawItems.map((oi) => ({
          id: oi.id,
          title: oi.event?.title || oi.product_name || oi.name || "Item",
          qty: Number(oi.quantity || 1),
          price: Number(oi.unit_price || oi.price || 0),
          image:
            oi.event?.preview_image ||
            oi.event?.image_preview ||
            oi.event?.thumbnail ||
            oi.event?.image ||
            oi.image ||
            null,
        })),
      };
    });
  }, [orders]);

  useEffect(() => {
    if (!requestedOrderId || tab !== 1 || ordersLoading) return;
    const normalize = (value) => String(value ?? "").trim();
    const requested = normalize(requestedOrderId);
    const match = viewOrders.find((order) => (
      normalize(order.id) === requested || normalize(order.number) === requested
    ));
    if (!match) return;

    const alreadyOpen = orderDialogOpen && normalize(selectedOrder?.id) === normalize(match.id);
    if (!alreadyOpen) {
      setSelectedOrder(match);
      setOrderDialogOpen(true);
    }
  }, [requestedOrderId, tab, ordersLoading, viewOrders, orderDialogOpen, selectedOrder?.id]);

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
    // Cart badge shows number of distinct items/events, not total ticket quantity.
    const count = Array.isArray(data?.items) ? data.items.length : 0;
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

  const updateBillingField = (field) => (event) => {
    setBillingAddress((prev) => ({ ...prev, [field]: event.target.value }));
    setBillingMessage("");
    setBillingError("");
  };

  const proceedCheckout = async () => {
    if (!viewItems.length || checkoutLoading) return;

    setCheckoutLoading(true);
    try {
      if (!billingAddressIsComplete(billingAddress)) {
        setCheckoutWarningOpen(true);
        setCheckoutLoading(false);
        return;
      }

      // Save the address first so future normal-user/superuser checkouts work.
      await saveBillingAddress();

      // Create unpaid Saleor order + local payment_pending registrations.
      // No Stripe/card payment is used in this flow.
      const checkoutRes = await fetch(`${API_BASE}/orders/offline-checkout/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          payment_method: "bank_transfer",
          billing_address: billingAddress,
          save_billing_address: true,
        }),
      });

      if (!checkoutRes.ok) {
        const errBody = await checkoutRes.json().catch(() => ({}));
        if (errBody?.status === "missing_lead_gen_fields") {
          setLeadGenMissingFields(normalizeMissingLeadGenFields(errBody.missing_fields));
          setLeadGenModalOpen(true);
          setCheckoutLoading(false);
          return;
        }
        throw new Error(errBody.detail || `Checkout HTTP ${checkoutRes.status}`);
      }

      await checkoutRes.json();
      setOrdersPage(1);
      await loadOrders(1);

      setShowPaid(true);
      setTimeout(() => {
        setShowPaid(false);
      }, 2500);

      await refreshCart();
      setTab(1);
    } catch (err) {
      console.error(err);
      alert(err.message || "Checkout failed. Please try again.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  // NEW: handlers for order popup
  const handleOrderClick = (order) => {
    setSelectedOrder(order);
    setOrderDialogOpen(true);
  };

  const handleCloseOrderDialog = () => {
    setOrderDialogOpen(false);
    setSelectedOrder(null);

    // If the modal was opened from a notification deep link, remove the
    // order query parameter. Otherwise the deep-link effect immediately
    // reopens the modal after Close, Esc, or backdrop click.
    const params = new URLSearchParams(location.search || "");
    let changed = false;
    ["order", "order_id", "openOrder"].forEach((key) => {
      if (params.has(key)) {
        params.delete(key);
        changed = true;
      }
    });

    if (changed) {
      const search = params.toString();
      navigate(
        {
          pathname: location.pathname,
          search: search ? `?${search}` : "",
          hash: location.hash || "",
        },
        { replace: true }
      );
    }
  };


  const handleDownloadInvoice = async (invoice, event) => {
    event?.stopPropagation?.();
    try {
      await downloadInvoicePdf(invoice);
    } catch (err) {
      alert(err.message || "Could not download invoice.");
    }
  };

  const handleGenerateInvoicePdf = async (invoice, event) => {
    event?.stopPropagation?.();
    try {
      const updatedInvoice = await generateInvoicePdf(invoice);
      setOrders((prev) => prev.map((order) => (
        order.invoice?.id === invoice.id
          ? { ...order, invoice: { ...order.invoice, ...updatedInvoice } }
          : order
      )));
      setSelectedOrder((prev) => (
        prev?.invoice?.id === invoice.id
          ? { ...prev, invoice: { ...prev.invoice, ...updatedInvoice } }
          : prev
      ));
      if (updatedInvoice?.pdf_ready) {
        await downloadInvoicePdf({ ...invoice, ...updatedInvoice });
      }
    } catch (err) {
      alert(err.message || "Could not generate invoice PDF.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Container maxWidth="xl" className="py-6 sm:py-8">
        <div className="grid grid-cols-12 gap-3 md:gap-4 items-start">
          {/* MAIN */}
          <main className="col-span-12">
            {/* Page Header */}
            <div className="mb-6">
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">
                My Cart
              </h1>
              <p className="text-slate-600">
                Manage your shopping cart and view your orders.
              </p>
            </div>

            {/* Tabs row (Cart | Orders | Addresses | Account details) */}
            <Paper
              elevation={0}
              className="rounded-2xl border border-slate-200 mb-4"
            >
              <Tabs
                value={tab}
                onChange={(_, v) => setTab(v)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  px: 1,
                  "& .MuiTab-root": { textTransform: "none", minHeight: 46 },
                  "& .Mui-selected": {
                    color: "#0ea5a4 !important",
                    fontWeight: 700,
                  },
                  "& .MuiTabs-indicator": { backgroundColor: "#0ea5a4" },
                }}
              >
                <Tab label="Cart" />
                <Tab label="Orders" />
                <Tab label="Addresses" />
                <Tab label="Account details" />
              </Tabs>
            </Paper>

            {/* TAB 0: CART CONTENT */}
            {tab === 0 && (
              <div className="grid grid-cols-12 gap-6">
                {/* Table + coupon */}
                <div className="col-span-12 lg:col-span-8">
                  <Paper
                    elevation={0}
                    className="rounded-2xl border border-slate-200 overflow-hidden"
                  >
                    {viewItems.length === 0 ? (
                      <Box className="p-8 text-center">
                        <h3 className="text-xl font-semibold text-slate-700">
                          Your cart is empty
                        </h3>
                        <p className="text-slate-500 mt-2">
                          Browse events and add tickets to your cart.
                        </p>
                        <Button
                          component={Link}
                          to="/events"
                          className="mt-4 rounded-xl"
                          sx={{
                            textTransform: "none",
                            backgroundColor: "#10b8a6",
                            "&:hover": { backgroundColor: "#0ea5a4" },
                          }}
                          variant="contained"
                        >
                          Explore events
                        </Button>
                      </Box>
                    ) : (
                      <>
                        <Box sx={{ width: "100%", overflowX: "auto" }}>
                          <Table sx={{ minWidth: 700 }} size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell />
                                <TableCell className="font-semibold text-slate-600">
                                  Product
                                </TableCell>
                                <TableCell className="font-semibold text-slate-600">
                                  Price
                                </TableCell>
                                <TableCell className="font-semibold text-slate-600">
                                  Quantity
                                </TableCell>
                                <TableCell className="font-semibold text-slate-600">
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
                                          to={
                                            it.slug
                                              ? `/events/${it.slug}`
                                              : "#"
                                          }
                                          className="text-slate-800 font-medium hover:text-teal-700 line-clamp-2"
                                        >
                                          {it.title}
                                        </Link>
                                      </div>
                                    </Box>
                                  </TableCell>
                                  <TableCell>
                                    {fmt(Number(it.price) || 0)}
                                  </TableCell>
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
                                  <TableCell className="font-semibold">
                                    {fmt(
                                      (Number(it.price) || 0) *
                                      (it.qty || 1)
                                    )}
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
                            onClick={() => setCart([...cart])}
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
                  <Paper
                    elevation={0}
                    className="rounded-2xl border border-slate-200"
                  >
                    <Box className="p-5">
                      <h3 className="text-2xl font-extrabold text-slate-800 mb-3">
                        Cart totals
                      </h3>
                      <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                          <span className="text-slate-600">Subtotal</span>
                          <span className="font-semibold">
                            {fmt(displaySubtotal)}
                          </span>
                        </div>
                        {discount > 0 && (
                          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                            <span className="text-slate-600 flex items-center gap-2">
                              Discount{" "}
                              <Chip
                                label={couponCode.toUpperCase()}
                                size="small"
                              />
                            </span>
                            <span className="font-semibold text-teal-700">
                              −{fmt(discount)}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between px-4 py-3">
                          <span className="text-slate-800 font-semibold">
                            Total
                          </span>
                          <span className="text-slate-900 font-extrabold">
                            {fmt(displayTotal)}
                          </span>
                        </div>
                      </div>
                      <Button
                        onClick={proceedCheckout}
                        disabled={cart.length === 0 || checkoutLoading}
                        fullWidth
                        className="mt-4 rounded-xl"
                        sx={{
                          textTransform: "none",
                          py: 1.25,
                          backgroundColor: "teal-500",
                          "&:hover": { backgroundColor: "teal-400" },
                        }}
                        variant="contained"
                      >
                        {checkoutLoading ? "Processing..." : "Proceed to checkout"}
                      </Button>
                    </Box>
                  </Paper>
                </div>
              </div>
            )}

            {/* TAB 1: PREVIOUS ORDERS */}
            {tab === 1 && (
              <Box className="mt-4 p-6 rounded-2xl border border-slate-200 bg-white text-slate-700">
                {/* Header with filters on the right */}
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, gap: 2, flexWrap: "wrap" }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Your orders
                  </Typography>

                  {/* Filter and Sort Controls */}
                  <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
                    {/* Status Filter */}
                    <TextField
                      select
                      size="small"
                      label="Payment Status"
                      value={orderStatus}
                      onChange={(e) => setOrderStatus(e.target.value)}
                      sx={{ minWidth: 180 }}
                    >
                      <MenuItem value="">All Status</MenuItem>
                      <MenuItem value="paid">Paid</MenuItem>
                      <MenuItem value="pending">Pending</MenuItem>
                      <MenuItem value="cancelled">Cancelled</MenuItem>
                    </TextField>

                    {/* Sort Option */}
                    <TextField
                      select
                      size="small"
                      label="Sort By"
                      value={orderSort}
                      onChange={(e) => setOrderSort(e.target.value)}
                      sx={{ minWidth: 180 }}
                    >
                      <MenuItem value="newest">Newest First</MenuItem>
                      <MenuItem value="oldest">Oldest First</MenuItem>
                    </TextField>

                    {/* Clear Filters Button */}
                    {(orderStatus || orderSort !== "newest") && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          setOrderStatus("");
                          setOrderSort("newest");
                        }}
                        sx={{ textTransform: "none" }}
                      >
                        Clear Filters
                      </Button>
                    )}
                  </Box>
                </Box>

                {ordersLoading && (
                  <Box sx={{ width: "100%", overflowX: "auto", mt: 1 }}>
                    <Table size="small" sx={{ minWidth: 600 }}>
                      <TableHead>
                        <TableRow>
                          <TableCell>Order</TableCell>
                          <TableCell>Events</TableCell>
                          <TableCell>Date</TableCell>
                          <TableCell align="right">Total</TableCell>
                          <TableCell align="right">Status</TableCell>
                          <TableCell align="right">Invoice</TableCell>
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
                            <TableCell>
                              <Skeleton width={120} />
                            </TableCell>
                            <TableCell align="right">
                              <Skeleton width={70} />
                            </TableCell>
                            <TableCell align="right">
                              <Skeleton width={90} />
                            </TableCell>
                            <TableCell align="right">
                              <Skeleton width={110} />
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
                    You don’t have any orders yet.
                  </Typography>
                )}

                {!ordersLoading && !ordersError && viewOrders.length > 0 && (
                  <Box sx={{ width: "100%", overflowX: "auto", mt: 1 }}>
                    <Table size="small" sx={{ minWidth: 600 }}>
                      <TableHead>
                        <TableRow>
                          <TableCell>Order</TableCell>
                          <TableCell>Events</TableCell>
                          <TableCell>Date</TableCell>
                          <TableCell align="right">Total</TableCell>
                          <TableCell align="right">Status</TableCell>
                          <TableCell align="right">Invoice</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {viewOrders.map((o) => (
                          <TableRow
                            key={o.id}
                            hover
                            sx={{ cursor: "pointer" }}
                            onClick={() => handleOrderClick(o)} // ⬅️ open popup
                          >
                            <TableCell>#{o.number}</TableCell>
                            <TableCell>
                              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                                {(o.items || []).map((item, idx) => (
                                  <Typography key={idx} sx={{ fontSize: "0.875rem", color: "text.primary" }}>
                                    {item.title} {item.qty > 1 ? `(×${item.qty})` : ""}
                                  </Typography>
                                ))}
                              </Box>
                            </TableCell>
                            <TableCell>
                              {o.created
                                ? new Date(o.created).toLocaleString()
                                : "-"}
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
                            <TableCell align="right">
                              {o.invoice?.pdf_ready ? (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={(e) => handleDownloadInvoice(o.invoice, e)}
                                  sx={{ textTransform: "none" }}
                                >
                                  Download
                                </Button>
                              ) : o.invoice ? (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={(e) => handleGenerateInvoicePdf(o.invoice, e)}
                                  sx={{ textTransform: "none" }}
                                >
                                  Generate PDF
                                </Button>
                              ) : o.status === "paid" ? (
                                <Chip size="small" label="Generating" variant="outlined" />
                              ) : (
                                <Chip size="small" label="After payment" variant="outlined" />
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                )}
                {!ordersLoading && !ordersError && viewOrders.length > 0 && (
                  <Box sx={{ display: "flex", justifyContent: "center", pt: 2 }}>
                    <Pagination
                      count={Math.ceil(ordersTotal / ORDERS_PER_PAGE)}
                      page={ordersPage}
                      onChange={(_, newPage) => setOrdersPage(newPage)}
                      color="primary"
                    />
                  </Box>
                )}
              </Box>
            )}

            {/* TAB 2 & 3: simple placeholders for now */}
            {tab === 2 && (
              <Box className="mt-4 p-6 rounded-2xl border border-slate-200 bg-white text-slate-700">
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                  Billing address
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  This address is required for Saleor order creation and invoice generation.
                </Typography>

                {billingLoading ? (
                  <Box>
                    <Skeleton height={48} sx={{ mb: 1 }} />
                    <Skeleton height={48} sx={{ mb: 1 }} />
                    <Skeleton height={48} />
                  </Box>
                ) : (
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth required label="First name" value={billingAddress.first_name || ""} onChange={updateBillingField("first_name")} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth required label="Last name" value={billingAddress.last_name || ""} onChange={updateBillingField("last_name")} />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField fullWidth label="Company name" value={billingAddress.company_name || ""} onChange={updateBillingField("company_name")} />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField fullWidth required label="Street address" value={billingAddress.street_address_1 || ""} onChange={updateBillingField("street_address_1")} />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField fullWidth label="Apartment, suite, unit" value={billingAddress.street_address_2 || ""} onChange={updateBillingField("street_address_2")} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth required label="City" value={billingAddress.city || ""} onChange={updateBillingField("city")} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth label="State / region" value={billingAddress.country_area || ""} onChange={updateBillingField("country_area")} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth required label="Postal code" value={billingAddress.postal_code || ""} onChange={updateBillingField("postal_code")} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField select fullWidth required label="Country" value={billingAddress.country || "CH"} onChange={updateBillingField("country")}>
                        {BILLING_COUNTRIES.map((country) => (
                          <MenuItem key={country.code} value={country.code}>{country.label}</MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid item xs={12}>
                      <TextField fullWidth label="Phone" value={billingAddress.phone || ""} onChange={updateBillingField("phone")} />
                    </Grid>

                    {billingError && (
                      <Grid item xs={12}>
                        <Typography variant="body2" color="error">{billingError}</Typography>
                      </Grid>
                    )}
                    {billingMessage && (
                      <Grid item xs={12}>
                        <Typography variant="body2" color="success.main">{billingMessage}</Typography>
                      </Grid>
                    )}

                    <Grid item xs={12} sx={{ display: "flex", gap: 2 }}>
                      <Button variant="contained" disabled={billingSaving} onClick={saveBillingAddress} sx={{ textTransform: "none", backgroundColor: "#10b8a6", "&:hover": { backgroundColor: "#0ea5a4" } }}>
                        {billingSaving ? "Saving..." : "Save billing address"}
                      </Button>
                      {billingAddress.first_name && (
                        <Button variant="outlined" disabled={billingSaving} onClick={() => setDeleteConfirmOpen(true)} color="error" sx={{ textTransform: "none" }}>
                          {billingSaving ? "Deleting..." : "Delete address"}
                        </Button>
                      )}
                    </Grid>
                  </Grid>
                )}
              </Box>
            )}

            {tab === 3 && (
              <Box className="mt-4 p-6 rounded-2xl border border-slate-200 bg-white text-slate-600">
                Account details section coming soon.
              </Box>
            )}
          </main>
        </div>
      </Container>

      {/* Centered animated toast */}
      <SuccessToast open={showPaid} onClose={() => setShowPaid(false)} />

      {/* LEAD GEN MODAL */}
      <LeadGenModal
        open={leadGenModalOpen}
        onClose={() => {
          setLeadGenModalOpen(false);
          setLeadGenMissingFields({});
        }}
        user={storedUser}
        missingFields={leadGenMissingFields}
      />

      {/* DELETE ADDRESS CONFIRMATION DIALOG */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: "12px",
            boxShadow: "0 10px 40px rgba(0,0,0,0.12)",
          },
        }}
      >
        <DialogTitle sx={{ fontSize: "1.1rem", fontWeight: 700, pb: 1 }}>
          Delete billing address?
        </DialogTitle>
        <DialogContent sx={{ py: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to delete your billing address?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button
            onClick={() => setDeleteConfirmOpen(false)}
            variant="outlined"
            sx={{ textTransform: "none", borderRadius: "8px" }}
          >
            Cancel
          </Button>
          <Button
            onClick={deleteBillingAddress}
            variant="contained"
            color="error"
            disabled={billingSaving}
            sx={{ textTransform: "none" }}
          >
            {billingSaving ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* CHECKOUT WARNING - MISSING BILLING ADDRESS */}
      <Dialog
        open={checkoutWarningOpen}
        onClose={() => setCheckoutWarningOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: "12px",
            boxShadow: "0 10px 40px rgba(0,0,0,0.12)",
          },
        }}
      >
        <DialogTitle sx={{ fontSize: "1.1rem", fontWeight: 700, pb: 1, display: "flex", alignItems: "center", gap: 1 }}>
          ⚠️ Billing address required
        </DialogTitle>
        <DialogContent sx={{ py: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Please add your billing address before checkout.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button
            onClick={() => setCheckoutWarningOpen(false)}
            variant="outlined"
            sx={{ textTransform: "none", borderRadius: "8px" }}
          >
            Close
          </Button>
          <Button
            onClick={() => {
              setCheckoutWarningOpen(false);
              setTab(2);
            }}
            variant="contained"
            sx={{ textTransform: "none", backgroundColor: "#10b8a6", "&:hover": { backgroundColor: "#0ea5a4" } }}
          >
            Go to Addresses
          </Button>
        </DialogActions>
      </Dialog>

      {/* ORDER ITEMS POPUP */}
      <Dialog
        open={orderDialogOpen && !!selectedOrder}
        onClose={handleCloseOrderDialog}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: "12px",
            boxShadow: "0 10px 40px rgba(0,0,0,0.12)",
          },
        }}
      >
        <DialogTitle
          sx={{
            fontSize: "1.1rem",
            fontWeight: 700,
            color: "text.primary",
            paddingY: 2.5,
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box>Order #{selectedOrder?.number ?? selectedOrder?.id}</Box>
          <Chip
            label={String(selectedOrder?.status || "paid").toUpperCase()}
            size="small"
            color={
              selectedOrder?.status === "cancelled"
                ? "default"
                : selectedOrder?.status === "pending"
                  ? "warning"
                  : "success"
            }
            variant="outlined"
            sx={{ ml: 2 }}
          />
        </DialogTitle>
        <DialogContent sx={{ paddingY: 3, paddingX: 3 }}>
          {selectedOrder && (
            <Box className="space-y-4">
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  pb: 2,
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Placed on{" "}
                  <strong>
                    {selectedOrder.created
                      ? new Date(selectedOrder.created).toLocaleDateString()
                      : "-"}
                  </strong>
                </Typography>
              </Box>

              <Box>
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 700, mb: 1.5, color: "text.primary" }}
                >
                  Order Items
                </Typography>
                <Box sx={{ width: "100%", overflowX: "auto" }}>
                  <Table size="small" sx={{ minWidth: 300 }}>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: "#f9fafb" }}>
                        <TableCell sx={{ fontWeight: 600, color: "text.secondary" }}>
                          Item
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, color: "text.secondary" }}>
                          Qty
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, color: "text.secondary" }}>
                          Price
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, color: "text.secondary" }}>
                          Total
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(selectedOrder.items || []).map((item) => (
                        <TableRow key={item.id} sx={{ "&:hover": { backgroundColor: "#fafafa" } }}>
                          <TableCell>
                            <Box className="flex items-center gap-2">
                              {item.image ? (
                                <img
                                  src={toAbs(item.image)}
                                  alt={item.title}
                                  className="w-10 h-10 rounded-md object-cover border border-slate-200"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-md bg-slate-200" />
                              )}
                              <Typography sx={{ fontSize: "0.875rem", fontWeight: 500 }}>
                                {item.title}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="right" sx={{ fontSize: "0.875rem" }}>
                            {item.qty}
                          </TableCell>
                          <TableCell align="right" sx={{ fontSize: "0.875rem" }}>
                            {fmt(item.price)}
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{ fontSize: "0.875rem", fontWeight: 600 }}
                          >
                            {fmt(item.price * item.qty)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              </Box>

              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  border: "1px solid #e5e7eb",
                  borderRadius: 2,
                  backgroundColor: "#f9fafb",
                }}
              >
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  <Box>
                    <Typography sx={{ fontSize: "0.75rem", fontWeight: 600, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Invoice
                    </Typography>
                    {selectedOrder.invoice ? (
                      <Typography sx={{ fontSize: "0.95rem", fontWeight: 600, color: "text.primary", mt: 0.5 }}>
                        {selectedOrder.invoice.number}
                      </Typography>
                    ) : selectedOrder.status === "paid" ? (
                      <Typography sx={{ fontSize: "0.875rem", color: "text.secondary", mt: 0.5 }}>
                        Invoice is being generated...
                      </Typography>
                    ) : (
                      <Typography sx={{ fontSize: "0.875rem", color: "text.secondary", mt: 0.5 }}>
                        Available after payment is confirmed.
                      </Typography>
                    )}
                  </Box>
                  {selectedOrder.invoice?.pdf_ready ? (
                    <Button
                      variant="contained"
                      size="small"
                      onClick={(e) => handleDownloadInvoice(selectedOrder.invoice, e)}
                      sx={{
                        textTransform: "none",
                        backgroundColor: "#1bbbb3",
                        "&:hover": { backgroundColor: "#0ea5a4" },
                        alignSelf: "flex-start",
                      }}
                    >
                      Download Invoice
                    </Button>
                  ) : selectedOrder.invoice ? (
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={(e) => handleGenerateInvoicePdf(selectedOrder.invoice, e)}
                      sx={{
                        textTransform: "none",
                        borderColor: "#1bbbb3",
                        color: "#1bbbb3",
                        alignSelf: "flex-start",
                      }}
                    >
                      Generate PDF
                    </Button>
                  ) : null}
                </Box>
              </Paper>

              <Box
                sx={{
                  pt: 2,
                  borderTop: "1px solid #e5e7eb",
                }}
              >
                {parseFloat(selectedOrder.discount_amount || 0) > 0 && (
                  <Box sx={{ mb: 1.5, display: "flex", flexDirection: "column", gap: 0.5 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography variant="body2" sx={{ color: "text.secondary" }}>Subtotal:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{fmt(selectedOrder.subtotal)}</Typography>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography variant="body2" sx={{ color: "text.secondary" }}>Discount:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: "#ef4444" }}>-{fmt(selectedOrder.discount_amount)}</Typography>
                    </Box>
                  </Box>
                )}
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "text.secondary" }}>
                  Order Total:
                </Typography>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 800, color: "#1bbbb3" }}
                >
                  {fmt(selectedOrder.total)}
                </Typography>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ paddingX: 3, paddingBottom: 2, gap: 1 }}>
          <Button
            onClick={handleCloseOrderDialog}
            variant="outlined"
            sx={{
              textTransform: "none",
              borderRadius: "8px",
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
