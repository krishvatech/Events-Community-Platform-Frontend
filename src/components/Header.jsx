// src/components/Header.jsx
import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { clearAuth } from "../utils/authStorage";
import {
  AppBar,
  Toolbar,
  Box,
  Button,
  IconButton,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Divider,
  Badge,
  Tooltip,
} from "@mui/material";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import { authConfig } from "../utils/api";
import LoginRoundedIcon from "@mui/icons-material/LoginRounded";
const apiBase =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

const getAccessToken = () => localStorage.getItem("access_token");

const getCookie = (name) =>
  document.cookie
    .split("; ")
    .find((x) => x.startsWith(name + "="))
    ?.split("=")[1];


// --- Admin detector (no API calls; reads what you already store) ---
const truthy = (v) => {
  if (v === true) return true;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    return ["true", "1", "yes", "y", "on"].includes(s);
  }
  return false;
};

const decodeJwtPayload = (token) => {
  try {
    const b64 = (token?.split(".")[1] || "").replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(b64));
  } catch { return null; }
};

const isGuestSession = () => {
  if (localStorage.getItem("is_guest") === "true") return true;
  const claims = decodeJwtPayload(getAccessToken());
  return claims?.token_type === "guest";
};

const isAuthed = () => !!getAccessToken() && !isGuestSession();

const readLocalUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
};

const hasRoleName = (arr, names = ["admin", "staff"]) =>
  Array.isArray(arr) && arr.some(r => {
    const n = String(r?.name ?? r ?? "").toLowerCase();
    return names.some(x => n.includes(x));
  });

const getClaims = () => decodeJwtPayload(getAccessToken());

const getRoleFlags = () => {
  const claims = getClaims() || {};
  const storedUser = readLocalUser() || {};
  const rawGroups = claims["cognito:groups"] || claims.groups || [];
  const groups = (Array.isArray(rawGroups) ? rawGroups : [rawGroups])
    .map((g) => String(g || "").toLowerCase())
    .filter(Boolean);

  const isSuperuser =
    truthy(claims?.is_superuser) ||
    truthy(storedUser?.is_superuser) ||
    groups.includes("platform_admin") ||
    hasRoleName(claims?.groups, ["platform_admin"]);

  const isStaff =
    isSuperuser ||
    truthy(claims?.is_staff) ||
    truthy(storedUser?.is_staff) ||
    groups.includes("staff") ||
    hasRoleName(claims?.groups, ["staff"]);

  return {
    isAdmin: isStaff || isSuperuser,
    isOwner: isSuperuser,
    isStaff: isStaff,
  };
};



const Header = () => {

  const location = useLocation();
  const navigate = useNavigate();
  const { pathname, search } = location;
  // const accountHref = isAdminUser() ? "/admin/events" : "/account/resources";
  const [roleFlags, setRoleFlags] = useState(getRoleFlags());
  const { isAdmin, isOwner: owner, isStaff: staff } = roleFlags;
  const accountHref = isAdmin ? "/admin/events" : "/account/profile";
  const resourcesHref = isAdmin ? "/admin/resources" : "/account/resources";
  const [mobileOpen, setMobileOpen] = useState(false);
  const openDrawer = () => setMobileOpen(true);
  const closeDrawer = () => setMobileOpen(false);

  const [authed, setAuthed] = useState(isAuthed());
  const next = encodeURIComponent((pathname + search) || "/events");


  // cart count from localStorage (fallback 0)
  const [cartCount, setCartCount] = useState(() => {
    const raw = localStorage.getItem("cart_count");
    const n = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(n) ? n : 0;
  });

  useEffect(() => {
    if (owner) return;

    if (!authed) {
      localStorage.setItem("cart_count", "0");
      setCartCount(0);
      return;
    }

    (async () => {
      try {
        const { data } = await axios.get(`${apiBase}/cart/count/`, authConfig());
        const count = Number(data?.count ?? 0);
        localStorage.setItem("cart_count", String(count));
        setCartCount(count);
      } catch {
        // ignore
      }
    })();
  }, [owner, authed]);



  useEffect(() => {
    const update = () => {
      const raw = localStorage.getItem("cart_count");
      const n = raw ? parseInt(raw, 10) : 0;
      setCartCount(Number.isFinite(n) ? n : 0);
    };
    const onStorage = (e) => { if (e.key === "cart_count") update(); };

    update(); // initial sync
    window.addEventListener("storage", onStorage);
    window.addEventListener("cart:update", update);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("cart:update", update);
    };
  }, []);



  // React to localStorage cart updates (other tabs)
  useEffect(() => {
    const onStorageCart = () => {
      const raw = localStorage.getItem("cart_count");
      const n = raw ? parseInt(raw, 10) : 0;
      setCartCount(Number.isFinite(n) ? n : 0);
    };
    window.addEventListener("storage", onStorageCart);
    return () => window.removeEventListener("storage", onStorageCart);
  }, []);

  // Sync auth state across tabs + in-app auth changes
  useEffect(() => {
    const syncAuth = () => {
      setAuthed(isAuthed());
      setRoleFlags(getRoleFlags());
    };
    const onStorage = () => syncAuth();
    const onAuthChanged = () => syncAuth();
    window.addEventListener("storage", onStorage);
    window.addEventListener("auth:changed", onAuthChanged);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("auth:changed", onAuthChanged);
    };
  }, []);

  // Close drawer on route change and re-check auth
  useEffect(() => {
    setMobileOpen(false);
    setAuthed(isAuthed());
    setRoleFlags(getRoleFlags());
  }, [location.pathname, location.hash]);

  // Guard protected routes + handle bfcache restores
  useEffect(() => {
    const PROTECTED_PREFIXES = [
      "/dashboard",
      "/community",
      "/live",
      "/resources",
      "/profile",
    ];
    const guard = () => {
      const path = location.pathname || "/";
      const onProtected = PROTECTED_PREFIXES.some((p) => path.startsWith(p));
      const isGuestOnLive = isGuestSession() && path.startsWith("/live");
      if (!isAuthed() && onProtected && !isGuestOnLive) {
        const nextPath = encodeURIComponent((location.pathname + location.search) || "/");
        navigate(`/signin?next=${nextPath}`, { replace: true });
      }
    };
    guard();
    const onShow = (e) => {
      if (e.persisted) guard();
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, [location.pathname, navigate]);

  const getRefreshToken = () =>
    localStorage.getItem("refresh_token");

  const signOut = async () => {
    const access = getAccessToken();
    const refresh = getRefreshToken();

    const AUTH_PROVIDER = import.meta.env.VITE_AUTH_PROVIDER;

    const isJwtLike = (t) => typeof t === "string" && t.split(".").length === 3;

    try {
      // ✅ Only call backend logout when using SimpleJWT refresh token
      if (AUTH_PROVIDER !== "cognito" && access && refresh && isJwtLike(refresh)) {
        await axios.post(
          `${apiBase}/auth/logout/`,
          { refresh },
          { headers: { Authorization: `Bearer ${access}` } }
        );
      }
    } catch (e) {
      // ignore
    }

    // ✅ Also kill Wagtail (Django) session
    try {
      if (access) {
        await fetch(`${apiBase}/auth/wagtail/logout/`, {
          method: "POST",
          headers: { Authorization: `Bearer ${access}` },
          credentials: "include",
        });
      }
    } catch (e) {
      // ignore
    }

    clearAuth();
    localStorage.setItem("cart_count", "0");
    window.dispatchEvent(new Event("cart:update"));

    setAuthed(false);
    navigate("/", { replace: true });
  };

  const NavLink = ({ to, children, requireAuth = false }) => (
    <Link
      to={to}
      onClick={(e) => {
        if (requireAuth && !authed) {
          e.preventDefault();
          navigate(`/signin?next=${encodeURIComponent(to)}`);
        }
      }}
      style={{
        fontSize: 15,
        fontWeight: 500,
        color: "#374151",
        textDecoration: "none",
        padding: "4px 0",
        transition: "color .15s",
      }}
      onMouseEnter={e => (e.target.style.color = "#0F2040")}
      onMouseLeave={e => (e.target.style.color = "#374151")}
    >
      {children}
    </Link>
  );

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        bgcolor: "#ffffff",
        borderBottom: "1px solid #E2E8F0",
        zIndex: (t) => t.zIndex.drawer + 2,
      }}
    >
      <Toolbar
        disableGutters
        sx={{ minHeight: { xs: 56, md: 64 }, px: { xs: 2, md: 0 } }}
      >
        <Box sx={{ mx: "auto", maxWidth: 1200, width: "100%", px: { xs: 2, md: 4 }, display: "flex", alignItems: "center", gap: 4 }}>

          {/* Left: IMAA Brand logo */}
          <Box component={Link} to="/" sx={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 1.5, flexShrink: 0 }}>
            {/* IMAA logo SVG mark */}
            <svg width="36" height="36" viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <text x="0" y="30" fontFamily="Georgia, serif" fontWeight="700" fontSize="30" fill="#0F2040">imaa</text>
            </svg>
            <Box sx={{ display: { xs: "none", sm: "flex" }, flexDirection: "column", lineHeight: 1.1 }}>
              <span style={{ fontSize: 11, color: "#64748B", letterSpacing: "0.01em", maxWidth: 180, lineHeight: 1.3 }}>
                Institute for Mergers,<br />Acquisitions &amp; Alliances
              </span>
            </Box>
          </Box>

          {/* Center spacer on mobile */}
          <Box sx={{ flex: 1 }} />

          {/* Center: Nav links (desktop) */}
          <Box
            component="nav"
            sx={{ display: { xs: "none", lg: "flex" }, alignItems: "center", gap: 4 }}
          >
            <NavLink to="/events">Events</NavLink>
            <NavLink to="/community" requireAuth>Community</NavLink>
            <NavLink to={resourcesHref} requireAuth>Resources</NavLink>
            <NavLink to="/about">About Us</NavLink>
          </Box>

          {/* Right spacer */}
          <Box sx={{ flex: 1 }} />

          {/* Right: Auth actions (desktop) */}
          <Box sx={{ display: { xs: "none", lg: "flex" }, alignItems: "center", gap: 1.5, flexShrink: 0 }}>
            {authed ? (
              <>
                {!owner && (
                  <Tooltip title="Cart">
                    <IconButton component={Link} to={staff ? "/admin/carts" : "/account/cart"} size="medium">
                      <Badge badgeContent={cartCount} color="error" invisible={!cartCount} max={99}>
                        <ShoppingCartOutlinedIcon fontSize="small" />
                      </Badge>
                    </IconButton>
                  </Tooltip>
                )}
                <Button
                  component={Link}
                  to={accountHref}
                  variant="text"
                  sx={{ textTransform: "none", fontSize: 14, fontWeight: 600, color: "#0F2040", "&:hover": { color: "#E85C2A", bgcolor: "transparent" } }}
                >
                  My Account
                </Button>
                <Button
                  onClick={signOut}
                  variant="outlined"
                  sx={{ textTransform: "none", fontSize: 14, fontWeight: 600, borderRadius: 6, borderColor: "#0F2040", color: "#0F2040", px: 2.5, "&:hover": { bgcolor: "#0F2040", color: "#fff" } }}
                >
                  Log out
                </Button>
              </>
            ) : (
              <>
                <Button
                  component={Link}
                  to="/signin"
                  variant="text"
                  sx={{ textTransform: "none", fontSize: 14, fontWeight: 500, color: "#374151", borderRadius: 6, px: 2, "&:hover": { color: "#0F2040", bgcolor: "rgba(15,32,64,.04)" } }}
                >
                  Log in
                </Button>
                <Button
                  component={Link}
                  to="/signup"
                  variant="contained"
                  sx={{ textTransform: "none", fontSize: 14, fontWeight: 600, borderRadius: 6, px: 2.5, bgcolor: "#0F2040", "&:hover": { bgcolor: "#1a3460" }, boxShadow: "none" }}
                >
                  Sign up
                </Button>
              </>
            )}
          </Box>

          {/* Mobile burger */}
          <Box sx={{ display: { xs: "flex", lg: "none" } }}>
            <IconButton onClick={openDrawer} aria-label="Open menu">
              <MenuRoundedIcon />
            </IconButton>
          </Box>
        </Box>
      </Toolbar>

      {/* Mobile Drawer */}
      <Drawer anchor="right" open={mobileOpen} onClose={closeDrawer}>
        <Box sx={{ width: 280 }} role="presentation">
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, py: 1.5 }}>
            <span style={{ fontWeight: 700, fontSize: 16, color: "#0F2040" }}>Menu</span>
            <IconButton onClick={closeDrawer} aria-label="Close">
              <CloseRoundedIcon />
            </IconButton>
          </Box>
          <Divider />
          <List onClick={closeDrawer}>
            <ListItemButton component={Link} to="/events">
              <ListItemText primary="Events" primaryTypographyProps={{ fontWeight: 500 }} />
            </ListItemButton>
            <ListItemButton component={Link} to="/community" onClick={(e) => {
              if (!authed) { e.preventDefault(); navigate(`/signin?next=${encodeURIComponent("/community")}`); }
            }}>
              <ListItemText primary="Community" primaryTypographyProps={{ fontWeight: 500 }} />
            </ListItemButton>
            <ListItemButton component={Link} to={resourcesHref} onClick={(e) => {
              if (!authed) { e.preventDefault(); navigate(`/signin?next=${encodeURIComponent(resourcesHref)}`); }
            }}>
              <ListItemText primary="Resources" primaryTypographyProps={{ fontWeight: 500 }} />
            </ListItemButton>
            <ListItemButton component={Link} to="/about">
              <ListItemText primary="About Us" primaryTypographyProps={{ fontWeight: 500 }} />
            </ListItemButton>
          </List>
          <Divider />
          {authed ? (
            <List onClick={closeDrawer}>
              {!owner && (
                <ListItemButton component={Link} to={staff ? "/admin/carts" : "/account/cart"}>
                  <ListItemIcon><ShoppingCartOutlinedIcon /></ListItemIcon>
                  <ListItemText primary="Cart" />
                </ListItemButton>
              )}
              <ListItemButton component={Link} to={accountHref}>
                <ListItemIcon><AccountCircleOutlinedIcon /></ListItemIcon>
                <ListItemText primary="My Account" />
              </ListItemButton>
              <ListItemButton onClick={signOut}>
                <ListItemIcon><LogoutRoundedIcon /></ListItemIcon>
                <ListItemText primary="Log out" />
              </ListItemButton>
            </List>
          ) : (
            <List onClick={closeDrawer}>
              <ListItemButton component={Link} to="/signin">
                <ListItemIcon><LoginRoundedIcon /></ListItemIcon>
                <ListItemText primary="Log in" />
              </ListItemButton>
              <ListItemButton component={Link} to="/signup">
                <ListItemText primary="Sign up" primaryTypographyProps={{ fontWeight: 600, color: "#0F2040" }} />
              </ListItemButton>
            </List>
          )}
        </Box>
      </Drawer>
    </AppBar>
  );
};

export default Header;
