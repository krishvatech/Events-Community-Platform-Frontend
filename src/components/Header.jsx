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
import { isOwnerUser, isStaffUser } from "../utils/adminRole.js";

const apiBase =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

const isAuthed = () =>
  !!localStorage.getItem("token") ||
  !!localStorage.getItem("access_token") ||
  !!sessionStorage.getItem("token") ||
  !!sessionStorage.getItem("access");

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

const readJSON = (store, key) => {
  try { return JSON.parse((store === "local" ? localStorage : sessionStorage).getItem(key) || "null"); }
  catch { return null; }
};

const hasRoleName = (arr, names = ["admin", "staff"]) =>
  Array.isArray(arr) && arr.some(r => {
    const n = String(r?.name ?? r ?? "").toLowerCase();
    return names.some(x => n.includes(x));
  });

const isAdminUser = () => {
  const candidates = [];

  // user objects you already save sometimes
  candidates.push(readJSON("local", "user"));
  candidates.push(readJSON("session", "user"));
  const lpLocal = readJSON("local", "loginPayload");
  const lpSess = readJSON("session", "loginPayload");
  if (lpLocal?.user) candidates.push(lpLocal.user);
  if (lpSess?.user) candidates.push(lpSess.user);

  // JWT claims
  const token =
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("access") ||
    sessionStorage.getItem("token");
  const claims = decodeJwtPayload(token);
  if (claims) candidates.push(claims);

  return candidates.filter(Boolean).some((u) =>
    truthy(u?.is_staff) ||
    truthy(u?.is_superuser) ||
    truthy(u?.is_admin) ||
    truthy(u?.staff) ||
    String(u?.role || "").toLowerCase() === "admin" ||
    hasRoleName(u?.groups) ||
    hasRoleName(u?.roles) ||
    hasRoleName(u?.permissions)
  );
};



const Header = () => {

  const location = useLocation();
  const navigate = useNavigate();
  const { pathname, search } = location;
  const accountHref = isAdminUser() ? "/admin/events" : "/account/resources";
  const owner = isOwnerUser();
  const staff = isStaffUser();
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

  // Sync auth state across tabs
  useEffect(() => {
    const onStorage = () => setAuthed(isAuthed());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Close drawer on route change and re-check auth
  useEffect(() => {
    setMobileOpen(false);
    setAuthed(isAuthed());
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
      if (!isAuthed() && onProtected) navigate("/", { replace: true });
    };
    guard();
    const onShow = (e) => {
      if (e.persisted) guard();
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, [location.pathname, navigate]);

  const getAccessToken = () =>
    localStorage.getItem("token") ||
    localStorage.getItem("access_token") ||
    sessionStorage.getItem("access") ||
    sessionStorage.getItem("token");

  const getRefreshToken = () =>
    localStorage.getItem("refresh_token") || sessionStorage.getItem("refresh");

  const signOut = async () => {
    const access = getAccessToken();
    const refresh = getRefreshToken();

    try {
      if (access && refresh) {
        await axios.post(
          `${apiBase}/auth/logout/`,
          { refresh },
          { headers: { Authorization: `Bearer ${access}` } }
        );
      }
    } catch (e) {
      // ignore (still clear local auth)
    }

    clearAuth();
    localStorage.setItem("cart_count", "0");
    window.dispatchEvent(new Event("cart:update"));

    setAuthed(false);
    navigate("/", { replace: true });
  };

  const NavLink = ({ to, children }) => (
    <Link
      to={to}
      className="px-1 py-2 text-base text-gray-500 hover:text-teal-400 transition-colors whitespace-nowrap"
    >
      {children}
    </Link>
  );

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        bgcolor: "background.paper",
        borderBottom: "1px solid rgba(27,187,179,0.10)",
        zIndex: (t) => t.zIndex.drawer + 2,
        backdropFilter: "none",
      }}
    >
      <Toolbar
        disableGutters
        sx={{ minHeight: { xs: 56, md: 64 } }}
        className="h-14 md:h-16"
      >
        <Box className="mx-auto max-w-7xl w-full px-3 sm:px-4 lg:px-6 flex items-center">
          {/* Left: Brand */}
          <Box component={Link} to="/" className="flex items-center gap-2 flex-1">
            <svg
              className="text-primary"
              style={{
                color:
                  "rgb(27 187 179 / var(--tw-text-opacity, 1))",
              }}
              fill="none"
              height="32"
              viewBox="0 0 48 48"
              width="32"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M39.475 21.6262C40.358 21.4363 40.6863 21.5589 40.7581 21.5934C40.7876 21.655 40.8547 21.857 40.8082 22.3336C40.7408 23.0255 40.4502 24.0046 39.8572 25.2301C38.6799 27.6631 36.5085 30.6631 33.5858 33.5858C30.6631 36.5085 27.6632 38.6799 25.2301 39.8572C24.0046 40.4502 23.0255 40.7407 22.3336 40.8082C21.8571 40.8547 21.6551 40.7875 21.5934 40.7581C21.5589 40.6863 21.4363 40.358 21.6262 39.475C21.8562 38.4054 22.4689 36.9657 23.5038 35.2817C24.7575 33.2417 26.5497 30.9744 28.7621 28.762C30.9744 26.5497 33.2417 24.7574 35.2817 23.5037C36.9657 22.4689 38.4054 21.8562 39.475 21.6262ZM4.41189 29.2403L18.7597 43.5881C19.8813 44.7097 21.4027 44.9179 22.7217 44.7893C24.0585 44.659 25.5148 44.1631 26.9723 43.4579C29.9052 42.0387 33.2618 39.5667 36.4142 36.4142C39.5667 33.2618 42.0387 29.9052 43.4579 26.9723C44.1631 25.5148 44.659 24.0585 44.7893 22.7217C44.9179 21.4027 44.7097 19.8813 43.5881 18.7597L29.2403 4.41187C27.8527 3.02428 25.8765 3.02573 24.2861 3.36776C22.6081 3.72863 20.7334 4.58419 18.8396 5.74801C16.4978 7.18716 13.9881 9.18353 11.5858 11.5858C9.18354 13.988 7.18717 16.4978 5.74802 18.8396C4.58421 20.7334 3.72865 22.6081 3.36778 24.2861C3.02574 25.8765 3.02429 27.8527 4.41189 29.2403Z"
                fill="currentColor"
              />
            </svg>
            <span className="text-xl font-bold tracking-tight text-neutral-800">
              IMAA Connect
            </span>
          </Box>

          {/* Center: Nav */}
          <Box
            component="nav"
            className="hidden lg:flex flex-1 items-center justify-center"
          >
            <div className="flex items-center gap-6 md:gap-8">
              <NavLink to="/events">Events</NavLink>
              <NavLink to="/community">Community</NavLink>
              <NavLink to="/resources">Resources</NavLink>
              <NavLink to="/about">About Us</NavLink>
            </div>
          </Box>

          {/* Right: Actions */}
          <Box className="hidden lg:flex flex-1 items-center justify-end gap-2.5">
            {authed ? (
              <Box className="flex items-center gap-3">
                {/* Cart (hidden for admins) */}
                {!owner && (
                  <>
                    <Tooltip title="Cart">
                      <IconButton
                        component={Link}
                        to={staff ? "/admin/carts" : "/account/cart"}
                        size="large"
                        sx={{ color: "text.primary" }}
                      >
                        <Badge
                          badgeContent={cartCount}
                          color="error"
                          overlap="circular"
                          invisible={!cartCount}
                          max={99}
                        >
                          <ShoppingCartOutlinedIcon />
                        </Badge>
                      </IconButton>
                    </Tooltip>
                    <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
                  </>
                )}

                {/* My Account */}
                <Button
                  component={Link}
                  to={accountHref}
                  sx={{ textTransform: "none" }}
                  className="px-0 text-base font-semibold text-teal-600 hover:text-teal-700"
                >
                  My Account
                </Button>

                <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

                {/* Logout */}
                <Button
                  onClick={signOut}
                  className="btn-glow h-9 px-5 rounded-xl text-base font-semibold bg-teal-500 text-white hover:bg-teal-600 hover:-translate-y-0.5"
                  disableElevation
                  sx={{ textTransform: "none" }}
                >
                  Logout
                </Button>
              </Box>
            ) : (
              <>
                <Button
                  component={Link}
                  to={`/signin?next=${next}`}
                  className="btn-glow h-9 px-5 rounded-xl text-base font-semibold bg-teal-100 text-teal-500 border border-teal-100 hover:bg-teal-200 hover:text-teal-700 hover:-translate-y-0.5"
                  variant="text"
                  sx={{ textTransform: "none" }}
                >
                  Login
                </Button>
                <Button
                  component={Link}
                  to="/signup"
                  className="btn-glow h-9 px-5 rounded-xl text-base font-semibold bg-teal-500 text-white hover:bg-teal-700 hover:-translate-y-0.5"
                  disableElevation
                  sx={{ textTransform: "none" }}
                >
                  Join Now
                </Button>
              </>
            )}
          </Box>

          {/* Mobile burger */}
          <Box className="lg:hidden">
            <IconButton onClick={openDrawer} aria-label="Open menu">
              <MenuRoundedIcon />
            </IconButton>
          </Box>
        </Box>
      </Toolbar>

      {/* Mobile Drawer */}
      <Drawer anchor="right" open={mobileOpen} onClose={closeDrawer}>
        <Box sx={{ width: 300 }} role="presentation" onClick={closeDrawer}>
          <Box className="flex items-center justify-between px-3 py-3">
            <span className="font-semibold">Menu</span>
            <IconButton onClick={closeDrawer} aria-label="Close">
              <CloseRoundedIcon />
            </IconButton>
          </Box>
          <Divider />

          <List>
            <ListItemButton component={Link} to="/events">
              <ListItemText primary="Events" />
            </ListItemButton>
            <ListItemButton component={Link} to="/community">
              <ListItemText primary="Community" />
            </ListItemButton>
            <ListItemButton component={Link} to="/resources">
              <ListItemText primary="Resources" />
            </ListItemButton>
            <ListItemButton component={Link} to="/about">
              <ListItemText primary="About Us" />
            </ListItemButton>
          </List>

          <Divider />

          {authed ? (
            <List>
              {!owner && (
                <ListItemButton
                  component={Link}
                  to={staff ? "/admin/carts" : "/account/cart"}
                >
                  <ListItemIcon>
                    <ShoppingCartOutlinedIcon />
                  </ListItemIcon>
                  <ListItemText primary="Cart" />
                </ListItemButton>
              )}
              <ListItemButton component={Link} to={accountHref}>
                <ListItemIcon>
                  <AccountCircleOutlinedIcon />
                </ListItemIcon>
                <ListItemText primary="My Account" />
              </ListItemButton>
              <ListItemButton onClick={signOut}>
                <ListItemIcon>
                  <LogoutRoundedIcon />
                </ListItemIcon>
                <ListItemText primary="Logout" />
              </ListItemButton>
            </List>
          ) : (
            <List>
              <ListItemButton component={Link} to="/signin">
                <ListItemIcon>
                  <LoginRoundedIcon />
                </ListItemIcon>
                <ListItemText primary="Sign In" />
              </ListItemButton>
            </List>
          )}
        </Box>
      </Drawer>
    </AppBar>
  );
};

export default Header;