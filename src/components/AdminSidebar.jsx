// src/components/AdminSidebar.jsx
import React from "react";
import {
  Box,
  Paper,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Drawer,
  Typography,
  useTheme,
  useMediaQuery,
} from "@mui/material";

// Prefer your custom icons if present; otherwise fall back to MUI
import * as CI from "./CustomIcons";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import EventNoteRoundedIcon from "@mui/icons-material/EventNoteRounded";
import LibraryBooksRoundedIcon from "@mui/icons-material/LibraryBooksRounded";
import OndemandVideoRoundedIcon from "@mui/icons-material/OndemandVideoRounded";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import AutorenewRoundedIcon from "@mui/icons-material/AutorenewRounded";
import NotificationsNoneRoundedIcon from "@mui/icons-material/NotificationsNoneRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";

// Map to your custom icons when available
const DashboardIcon   = CI?.CustomDashboardIcon   ?? DashboardRoundedIcon;
const EventIcon       = CI?.CustomEventIcon       ?? EventNoteRoundedIcon;
const ResourceIcon    = CI?.CustomResourcesIcon   ?? LibraryBooksRoundedIcon;
const RecordingsIcon  = CI?.CustomRecordingsIcon  ?? OndemandVideoRoundedIcon;
const MessagesIcon    = CI?.CustomMessagesIcon    ?? ChatBubbleOutlineRoundedIcon;
const OrdersIcon      = CI?.CustomOrdersIcon      ?? ReceiptLongRoundedIcon;
const MembersIcon     = CI?.CustomCommunityIcon   ?? PeopleAltRoundedIcon;
const SubsIcon        = CI?.CustomSubscriptionsIcon ?? AutorenewRoundedIcon;
const NotifsIcon      = CI?.CustomNotificationsIcon ?? NotificationsNoneRoundedIcon;
const SettingsIcon    = CI?.CustomSettingsIcon    ?? SettingsRoundedIcon;
const PostsIcon = CI?.CustomPostsIcon ?? ArticleOutlinedIcon;

// Palette to match your UI
const TEAL        = "#14b8b1";   // active
const TEXT        = "#334155";   // slate-700
const HOVER_BG    = "#e6f7f6";   // soft teal hover
const CARD_BG     = "#ffffff";
const CARD_BORDER = "#e5e7eb";

/**
 * AdminSidebar
 * ---------------------------------------------------------
 * Props:
 *  - active: one of
 *      'dashboard' | 'events' | 'resources' | 'recordings' |
 *      'messages'  | 'orders' | 'members'   | 'subscriptions' |
 *      'notifications' | 'settings'
 *  - onSelect: (key) => void
 *  - mobileOpen?: boolean
 *  - onMobileClose?: () => void
 *  - title?: string
 *  - items?: override items array if needed
 */
export default function AdminSidebar({
  active = "events",
  onSelect,
  mobileOpen = false,
  onMobileClose,
  title = "Admin",
  items,
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // Default admin tabs based on your system
  const defaultItems = [
    { key: "events",       label: "My Events",      Icon: EventIcon },
    { key: "posts",     label: "Posts",       Icon: PostsIcon },
    { key: "resources",    label: "My Resources",   Icon: ResourceIcon },
    { key: "recordings",   label: "My Recordings",  Icon: RecordingsIcon },
    { key: "messages",     label: "Messages",       Icon: MessagesIcon },
    { key: "orders",       label: "Orders",         Icon: OrdersIcon },
    { key: "groups",       label: "Groups",         Icon: GroupsRoundedIcon },
    { key: "subscriptions",label: "Subscriptions",  Icon: SubsIcon },
    { key: "notifications",label: "Notifications",  Icon: NotifsIcon },
    { key: "settings",     label: "Settings",       Icon: SettingsIcon },
  ];

  const listItems = items ?? defaultItems;

  const ListUI = (
    <Paper
      elevation={0}
      variant="outlined"
      sx={{
        width: 280,
        bgcolor: CARD_BG,
        borderColor: CARD_BORDER,
        borderRadius: 3,
        p: 1,
      }}
    >
      <Box sx={{ px: 2, pt: 1, pb: 1 }}>
        <Typography variant="subtitle2" sx={{ color: "#64748b" }}>
          {title}
        </Typography>
      </Box>

      <List dense disablePadding>
        {listItems.map(({ key, label, Icon }) => {
          const selected = active === key;
          return (
            <ListItemButton
              key={key}
              onClick={() => onSelect?.(key)}
              selected={selected}
              sx={{
                position: "relative",
                m: "4px 8px",
                borderRadius: 2,
                color: selected ? TEAL : TEXT,
                "& .MuiListItemIcon-root": {
                  minWidth: 40,
                  color: selected ? TEAL : "#525252",
                },
                "&.Mui-selected": { bgcolor: "rgba(20,184,177,0.08)" },
                "&.Mui-selected:hover": { bgcolor: HOVER_BG },
                "&:hover": { bgcolor: HOVER_BG },
                "&.Mui-selected::before": {
                  content: '""',
                  position: "absolute",
                  left: 6,
                  top: 6,
                  bottom: 6,
                  width: 3,
                  borderRadius: 2,
                  backgroundColor: TEAL,
                },
              }}
            >
              <ListItemIcon>
                <Icon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={label}
                primaryTypographyProps={{ sx: { fontSize: "0.95rem", fontWeight: 600 } }}
              />
            </ListItemButton>
          );
        })}
      </List>
    </Paper>
  );

  // Desktop: inline card; Mobile: drawer with same card inside
  return isMobile ? (
    <Drawer anchor="left" open={mobileOpen} onClose={onMobileClose}>
      <Box sx={{ p: 1 }}>{ListUI}</Box>
    </Drawer>
  ) : (
    <Box sx={{ width: 280 }}>{ListUI}</Box>
  );
}