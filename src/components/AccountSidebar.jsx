// src/components/AccountSidebar.jsx
import React, { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Paper, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Button, Drawer, IconButton, Box, Divider
} from "@mui/material";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

// Icons
import TimelineOutlinedIcon from "@mui/icons-material/TimelineOutlined";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import ForumOutlinedIcon from "@mui/icons-material/ForumOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import WorkspacePremiumOutlinedIcon from "@mui/icons-material/WorkspacePremiumOutlined";
import AutorenewOutlinedIcon from "@mui/icons-material/AutorenewOutlined";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";

const NAV_ITEMS = [
  { key: "activity", label: "Activity", icon: <TimelineOutlinedIcon />, to: "/account" },
  { key: "courses", label: "My Events", icon: <SchoolOutlinedIcon />, to: "/myevents" },
  { key: "profile", label: "Profile", icon: <PersonOutlineOutlinedIcon />, to: "/account/profile" },
  { key: "elibrary", label: "My Recordings", icon: <MenuBookOutlinedIcon />, to: "/account/recordings" },
  { key: "forums", label: "Forums", icon: <ForumOutlinedIcon /> },
  { key: "orders", label: "Orders", icon: <ReceiptLongOutlinedIcon />, to: "/cart" },
  { key: "memberships", label: "Memberships", icon: <WorkspacePremiumOutlinedIcon /> },
  { key: "subscriptions", label: "Subscriptions", icon: <AutorenewOutlinedIcon /> },
  { key: "friends", label: "Friends", icon: <PeopleAltOutlinedIcon /> },
  { key: "settings", label: "Settings", icon: <SettingsOutlinedIcon /> },
];

export default function AccountSidebar({ stickyTop = 96 }) {
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeKey = useMemo(() => {
    if (pathname.startsWith("/cart")) return "orders";
    if (pathname.startsWith("/myevents")) return "courses";
    if (pathname.startsWith("/events/")) return "courses"; // event details keeps highlight
    if (pathname.startsWith("/account/recordings")) return "elibrary";
    if (pathname.startsWith("/account/profile")) return "profile";
    return "activity";
  }, [pathname]);

  const ListUI = ({ onItem }) => (
    <List disablePadding>
      {NAV_ITEMS.map((item) => {
        const active = activeKey === item.key;
        const btnProps = item.to ? { component: Link, to: item.to } : { onClick: onItem || (() => { }) };
        return (
          <ListItem key={item.key} disablePadding>
            <ListItemButton
              {...btnProps}
              className={`${active ? "bg-teal-50 text-teal-700" : "text-slate-700 hover:bg-slate-50"}`}
              sx={{ py: 1.25 }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: active ? "#0ea5a4" : "#64748b" }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: active ? 700 : 500 }} />
            </ListItemButton>
          </ListItem>
        );
      })}
    </List>
  );

  return (
    <>
      {/* Mobile trigger (mobile + tablet) */}
      <div className="lg:hidden mb-3">
        <Button
          onClick={() => setMobileOpen(true)}
          startIcon={<MenuRoundedIcon />}
          variant="outlined"
          className="rounded-xl"
          sx={{ textTransform: "none", width: "100%" }}
        >
          Account Menu
        </Button>
      </div>

      {/* Desktop sidebar (lg+) */}
      <Paper
        elevation={0}
        className="rounded-2xl border border-slate-200 sticky hidden lg:block"
        sx={{ top: { lg: stickyTop }, position: { lg: "sticky" } }}
      >
        <ListUI />
      </Paper>

      {/* Mobile drawer */}
      <Drawer anchor="left" open={mobileOpen} onClose={() => setMobileOpen(false)}>
        <Box sx={{ width: 300 }} role="presentation" onClick={() => setMobileOpen(false)}>
          <Box className="flex items-center justify-between px-3 py-3">
            <span className="font-semibold">Account</span>
            <IconButton aria-label="Close"><CloseRoundedIcon /></IconButton>
          </Box>
          <Divider />
          <ListUI onItem={() => setMobileOpen(false)} />
        </Box>
      </Drawer>
    </>
  );
}