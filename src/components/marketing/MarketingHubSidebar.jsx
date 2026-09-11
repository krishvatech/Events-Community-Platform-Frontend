import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Avatar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import VerifiedIcon from "@mui/icons-material/Verified";

import {
  CONNECT_HOME_PATH,
  MARKETING_HOME_PATH,
  isMarketingNavItemActive,
  marketingNavigationGroups,
} from "../../config/marketingNavigation";
import { apiClient } from "../../utils/api";
import { clearAuth } from "../../utils/authStorage";

const ORANGE = "#E8532F";
const TEXT = "#2C3E5A";
const HOVER_BG = "rgba(232,83,47,0.07)";
const CARD_BORDER = "#F0EEEB";
const SIDEBAR_WIDTH = 280;

function getAvatarUrl(user) {
  const raw =
    user?.profile?.user_image ||
    user?.profile?.user_image_url ||
    user?.avatar ||
    user?.user_image ||
    user?.image ||
    "";
  if (!raw) return "";
  if (raw.startsWith("http") || raw.startsWith("blob:")) return raw;
  const base = (import.meta.env.VITE_API_BASE_URL || "").trim().replace(/\/+$/, "");
  return raw.startsWith("/") ? `${base}${raw}` : `${base}/${raw}`;
}

export default function MarketingHubSidebar({ mobileOpen, onMobileClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [user, setUser] = useState(null);
  const [openLogoutDialog, setOpenLogoutDialog] = useState(false);

  useEffect(() => {
    let active = true;
    apiClient.get("/users/me/").then((res) => {
      if (active) setUser(res.data);
    }).catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const closeMobile = () => {
    if (isMobile) onMobileClose?.();
  };

  const handleLogoutConfirm = async () => {
    setOpenLogoutDialog(false);
    const access = localStorage.getItem("access_token");
    const refresh = localStorage.getItem("refresh_token");
    const isJwtLike = (t) => typeof t === "string" && t.split(".").length === 3;

    try {
      if (import.meta.env.VITE_AUTH_PROVIDER !== "cognito" && access && refresh && isJwtLike(refresh)) {
        await apiClient.post("/auth/logout/", { refresh });
      }
    } catch {}

    try {
      if (access) {
        await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/wagtail/logout/`, {
          method: "POST",
          headers: { Authorization: `Bearer ${access}` },
          credentials: "include",
        });
      }
    } catch {}

    clearAuth();
    localStorage.setItem("cart_count", "0");
    window.dispatchEvent(new Event("cart:update"));
    window.dispatchEvent(new Event("auth:changed"));
    navigate("/", { replace: true });
  };

  const content = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: "#ffffff", borderRight: `1px solid ${CARD_BORDER}` }}>
      <Box
        onClick={() => {
          navigate(MARKETING_HOME_PATH);
          closeMobile();
        }}
        sx={{ px: 2.5, py: 2, display: "flex", alignItems: "center", gap: 1.5, borderBottom: `1px solid ${CARD_BORDER}`, cursor: "pointer" }}
      >
        <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: "#1B2A4A", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#0A9396" strokeWidth="1.5" />
            <path d="M7 15.5c2.8-4.6 7.2-4.6 10 0" stroke="#E8532F" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M8 9h8" stroke="#0A9396" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </Box>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: 14, color: "#1B2A4A", lineHeight: 1.2 }}>IMAA</Typography>
          <Typography sx={{ fontWeight: 700, fontSize: 10, color: "#0A9396", letterSpacing: "0.12em", textTransform: "uppercase", lineHeight: 1.2 }}>MARKETING HUB</Typography>
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflowY: "auto", py: 1 }}>
        {marketingNavigationGroups.map((group) => (
          <Box key={group.label} sx={{ mb: 1.5 }}>
            <Typography variant="overline" sx={{ px: 2.5, pt: 1.5, pb: 0.5, display: "block", color: "#C0BAB4", fontWeight: 800, fontSize: 10, letterSpacing: "0.1em" }}>
              {group.label}
            </Typography>
            <List disablePadding>
              {group.items.map((item) => {
                const selected = isMarketingNavItemActive(item, location.pathname);
                const Icon = item.icon;
                return (
                  <ListItemButton
                    key={item.id}
                    selected={selected}
                    onClick={() => {
                      navigate(item.path);
                      closeMobile();
                    }}
                    sx={{
                      borderRadius: 2,
                      px: 1.5,
                      mx: 1,
                      mb: 0.5,
                      color: selected ? ORANGE : TEXT,
                      bgcolor: selected ? HOVER_BG : "transparent",
                      "&:hover": { bgcolor: HOVER_BG },
                      "&.Mui-selected": { bgcolor: HOVER_BG },
                      "&.Mui-selected:hover": { bgcolor: HOVER_BG },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36, color: selected ? ORANGE : "#6b7280" }}>
                      <Icon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary={item.label} primaryTypographyProps={{ variant: "body2", fontWeight: selected ? 700 : 500 }} />
                  </ListItemButton>
                );
              })}
            </List>
          </Box>
        ))}
      </Box>

      <Box sx={{ px: 1, py: 1 }}>
        <ListItemButton
          onClick={() => {
            navigate(CONNECT_HOME_PATH);
            closeMobile();
          }}
          sx={{ borderRadius: 2, px: 1.5, mx: 1, color: TEXT, "&:hover": { bgcolor: HOVER_BG } }}
        >
          <ListItemIcon sx={{ minWidth: 36, color: "#6b7280" }}>
            <ArrowBackRoundedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Back to IMAA Connect" primaryTypographyProps={{ variant: "body2", fontWeight: 700 }} />
        </ListItemButton>
      </Box>

      <Divider />

      <Box sx={{ p: 2, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
        <Box
          onClick={() => {
            navigate("/account/profile");
            closeMobile();
          }}
          sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0, flex: 1, cursor: "pointer", p: 0.5, borderRadius: 2, "&:hover": { bgcolor: "rgba(0, 0, 0, 0.04)" } }}
        >
          <Avatar src={getAvatarUrl(user)} sx={{ width: 40, height: 40 }}>
            {(user?.first_name || user?.username || "U")[0]?.toUpperCase()}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Typography variant="subtitle2" fontWeight={700} noWrap>
                {user ? `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username : "User"}
              </Typography>
              {user?.profile?.kyc_status === "approved" && (
                <Tooltip title="Verified">
                  <VerifiedIcon sx={{ fontSize: 16, color: "#22d3ee" }} />
                </Tooltip>
              )}
            </Box>
            <Typography variant="caption" color="text.secondary" noWrap display="block">
              {user?.is_superuser ? "Platform Admin" : user?.is_staff ? "Staff" : "Member"}
            </Typography>
          </Box>
        </Box>
        <Tooltip title="Logout">
          <IconButton onClick={() => setOpenLogoutDialog(true)} color="error" sx={{ bgcolor: "rgba(211, 47, 47, 0.04)", "&:hover": { bgcolor: "rgba(211, 47, 47, 0.12)" } }}>
            <LogoutRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Dialog open={openLogoutDialog} onClose={() => setOpenLogoutDialog(false)} PaperProps={{ sx: { borderRadius: 3, p: 1, minWidth: 320 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Are you leaving our system?</DialogTitle>
        <DialogContent>
          <DialogContentText>You are about to log out. We'll miss you!</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenLogoutDialog(false)} sx={{ borderRadius: 2, textTransform: "none", color: "text.secondary" }}>Cancel</Button>
          <Button onClick={handleLogoutConfirm} variant="contained" color="error" sx={{ borderRadius: 2, textTransform: "none", boxShadow: "none" }} autoFocus>
            Yes, Logout
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );

  return isMobile ? (
    <Drawer variant="temporary" open={mobileOpen} onClose={onMobileClose} ModalProps={{ keepMounted: true }} sx={{ "& .MuiDrawer-paper": { boxSizing: "border-box", width: SIDEBAR_WIDTH } }}>
      {content}
    </Drawer>
  ) : (
    <Drawer variant="permanent" open sx={{ display: { xs: "none", md: "block" }, "& .MuiDrawer-paper": { boxSizing: "border-box", width: SIDEBAR_WIDTH, position: "fixed", height: "100vh" } }}>
      {content}
    </Drawer>
  );
}
