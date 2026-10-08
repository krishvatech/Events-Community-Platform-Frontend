"use client";

// src/components/public/PublicMobileMenu.jsx
// Burger menu of the server-rendered public shell below 1200px: the same pattern, breakpoint
// and destinations as the application header's drawer (src/components/Header.jsx), which the
// UI audits keep as the behavioural baseline. The button is part of the server HTML; the drawer
// only mounts when opened, so the browser-only sign-in state never reaches the server render.
// MUI's Drawer provides the focus trap, Escape to close and the backdrop.
import { useEffect, useId, useState } from "react";
import { usePathname } from "next/navigation";
import { Box, Divider, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText } from "@mui/material";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import LoginRoundedIcon from "@mui/icons-material/LoginRounded";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import { Link } from "#navigation";
import { colors, semanticColors } from "../../styles/designTokens";
import { useMemberSession } from "./publicSession";

const isActivePath = (pathname, to) => {
  const target = to.replace(/\/$/, "") || "/";
  const current = pathname.replace(/\/$/, "") || "/";
  return target === "/" ? current === "/" : current === target || current.startsWith(`${target}/`);
};

export default function PublicMobileMenu({ items }) {
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const authed = useMemberSession();
  const menuId = useId();

  // Close after any navigation (including Back/Forward) while the menu is open.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const close = () => setOpen(false);
  const itemSx = (to) => ({
    minHeight: 48,
    borderLeft: `3px solid ${isActivePath(pathname, to) ? colors.teal : "transparent"}`,
    "&.Mui-selected": { bgcolor: "rgba(10,147,150,.08)" },
    "&.Mui-selected:hover": { bgcolor: "rgba(10,147,150,.12)" },
  });

  return (
    <>
      <IconButton
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        sx={{ color: semanticColors.text, minWidth: 44, minHeight: 44 }}
      >
        <MenuRoundedIcon />
      </IconButton>

      <Drawer
        anchor="right"
        open={open}
        onClose={close}
        slotProps={{ paper: { id: menuId, role: "dialog", "aria-modal": true, "aria-label": "Menu" } }}
      >
        <Box sx={{ width: { xs: "min(320px, 88vw)", sm: 320 }, minHeight: "100%", bgcolor: semanticColors.surface, color: semanticColors.text }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, py: 1.5 }}>
            <span style={{ fontWeight: 700, fontSize: 16, color: semanticColors.text }}>Menu</span>
            <IconButton onClick={close} aria-label="Close navigation menu" sx={{ minWidth: 44, minHeight: 44, color: semanticColors.text }}>
              <CloseRoundedIcon />
            </IconButton>
          </Box>
          <Divider />
          <List component="nav" aria-label="Primary navigation">
            {items.map(({ label, to }) => (
              <ListItemButton
                key={to}
                component={Link}
                to={to}
                resetScroll
                onClick={close}
                selected={isActivePath(pathname, to)}
                aria-current={isActivePath(pathname, to) ? "page" : undefined}
                sx={itemSx(to)}
              >
                <ListItemText primary={label} primaryTypographyProps={{ fontWeight: 500 }} />
              </ListItemButton>
            ))}
          </List>
          <Divider />
          <List aria-label="Account">
            {authed ? (
              <ListItemButton component={Link} to="/account/profile" resetScroll onClick={close} sx={{ minHeight: 48 }}>
                <ListItemIcon><AccountCircleOutlinedIcon /></ListItemIcon>
                <ListItemText primary="My Account" />
              </ListItemButton>
            ) : (
              <>
                <ListItemButton component={Link} to="/signin" resetScroll onClick={close} sx={{ minHeight: 48 }}>
                  <ListItemIcon><LoginRoundedIcon /></ListItemIcon>
                  <ListItemText primary="Log in" />
                </ListItemButton>
                <ListItemButton component={Link} to="/signup" resetScroll onClick={close} sx={{ minHeight: 48 }}>
                  <ListItemText primary="Sign up" primaryTypographyProps={{ fontWeight: 700, color: "var(--imaa-dm-orange-text, #CC4422)" }} />
                </ListItemButton>
              </>
            )}
          </List>
        </Box>
      </Drawer>
    </>
  );
}
