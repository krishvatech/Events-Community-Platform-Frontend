// src/components/AccountSidebar.jsx
import React, { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Button,
  Drawer,
  Box,
} from "@mui/material";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";

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

// --- Harmonized styling (same vibe as CommunitySideBar) ---
const BORDER = "#e2e8f0";
const HOVER_BG = "#e6f7f6";
const TEAL = "#14b8b1";
const SLATE_700 = "#334155";

const NAV_ITEMS = [
  {
    key: "resources",
    label: "My Resources",
    icon: <TimelineOutlinedIcon fontSize="small" />,
    to: "/account/resources",
  },
  {
    key: "events",
    label: "My Events",
    icon: <SchoolOutlinedIcon fontSize="small" />,
    to: "/account/events",
  },
  {
    key: "profile",
    label: "Profile",
    icon: <PersonOutlineOutlinedIcon fontSize="small" />,
    to: "/account/profile",
  },
  {
    key: "elibrary",
    label: "My Recordings",
    icon: <MenuBookOutlinedIcon fontSize="small" />,
    to: "/account/recordings",
  },
  {
    key: "forums",
    label: "Forums",
    icon: <ForumOutlinedIcon fontSize="small" />,
  },
  {
    key: "orders",
    label: "Orders",
    icon: <ReceiptLongOutlinedIcon fontSize="small" />,
    to: "/account/cart",
  },
  {
    key: "memberships",
    label: "Memberships",
    icon: <WorkspacePremiumOutlinedIcon fontSize="small" />,
  },
  {
    key: "subscriptions",
    label: "Subscriptions",
    icon: <AutorenewOutlinedIcon fontSize="small" />,
  },
  {
    key: "friends",
    label: "Contacts",
    icon: <PeopleAltOutlinedIcon fontSize="small" />,
  },
  {
    key: "settings",
    label: "Settings",
    icon: <SettingsOutlinedIcon fontSize="small" />,
  },
];

export default function AccountSidebar({ stickyTop = 96 }) {
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeKey = useMemo(() => {
    if (pathname.startsWith("/account/cart")) return "orders";
    if (pathname.startsWith("/account/events")) return "events";
    if (pathname.startsWith("/events/")) return "events"; // event details keeps highlight
    if (pathname.startsWith("/account/recordings")) return "elibrary";
    if (pathname.startsWith("/account/profile")) return "profile";
    return "resources";
  }, [pathname]);

  const ListUI = ({ onItem }) => (
    <List disablePadding>
      {NAV_ITEMS.map((item) => {
        const active = activeKey === item.key;

        const handleClick = () => {
          if (onItem) onItem();
        };

        const btnProps = item.to
          ? {
              component: Link,
              to: item.to,
              onClick: handleClick,
            }
          : {
              onClick: handleClick,
            };

        return (
          <ListItem key={item.key} disablePadding sx={{ my: 0.25 }}>
            <ListItemButton
              {...btnProps}
              sx={{
                borderRadius: 2,
                px: 1.5,
                py: 1,
                position: "relative",
                m: "2px 0",
                color: active ? TEAL : SLATE_700,
                "&:hover": { bgcolor: HOVER_BG },
                ...(active && {
                  bgcolor: "rgba(20,184,177,0.08)",
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    left: 6,
                    top: 6,
                    bottom: 6,
                    width: 3,
                    borderRadius: 8,
                    backgroundColor: TEAL,
                  },
                }),
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 32,
                  color: active ? TEAL : "#6b7280",
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  variant: "body2",
                  fontWeight: active ? 700 : 500,
                }}
              />
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

      {/* Desktop sidebar (lg+) - styled like CommunitySideBar */}
      <Paper
        elevation={0}
        className="hidden lg:block"
        sx={{
          borderRadius: 3,
          border: `1px solid ${BORDER}`,
          position: { lg: "sticky" },
          top: { lg: stickyTop },
          p: 1.0,
          maxHeight: { lg: "calc(100vh - 120px)" },
          overflowY: { lg: "auto" },
          width: { lg: 300 },           // ← narrower sidebar on desktop
        }}
      >
        <ListUI />
      </Paper>

      {/* Mobile drawer - header removed, only the list */}
      <Drawer
        anchor="left"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
      >
        <Box sx={{ width: 260, p: 1 }}>  {/* ← match narrower width on mobile */}
          <ListUI onItem={() => setMobileOpen(false)} />
        </Box>
      </Drawer>
    </>
  );
}
