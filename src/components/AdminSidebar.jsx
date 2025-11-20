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
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { isOwnerUser, isStaffUser } from "../utils/adminRole";
import EventNoteRoundedIcon from "@mui/icons-material/EventNoteRounded";
import LibraryBooksRoundedIcon from "@mui/icons-material/LibraryBooksRounded";
import OndemandVideoRoundedIcon from "@mui/icons-material/OndemandVideoRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import NotificationsNoneRoundedIcon from "@mui/icons-material/NotificationsNoneRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import ShoppingCartRoundedIcon from "@mui/icons-material/ShoppingCartRounded";

const TEAL = "#14b8b1";
const TEXT = "#334155";
const HOVER_BG = "#e6f7f6";
const CARD_BG = "#ffffff";
const CARD_BORDER = "#e5e7eb";

const defaultItems = [
  { key: "events", label: "My Events", Icon: EventNoteRoundedIcon },
  { key: "posts", label: "Posts", Icon: ArticleOutlinedIcon },
  { key: "resources", label: "My Resources", Icon: LibraryBooksRoundedIcon },
  { key: "recordings", label: "My Recordings", Icon: OndemandVideoRoundedIcon },
  { key: "groups", label: "Groups", Icon: GroupsRoundedIcon },
  { key: "messages", label: "Messages", Icon: ChatBubbleOutlineRoundedIcon },
  { key: "carts", label: "Cart", Icon: ShoppingCartRoundedIcon },
  { key: "staff", label: "Staff", Icon: AdminPanelSettingsRoundedIcon },
  { key: "notifications", label: "Notifications", Icon: NotificationsNoneRoundedIcon },
  { key: "settings", label: "Settings", Icon: SettingsRoundedIcon },
];

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

   let listItems = items ?? defaultItems;
  const owner = isOwnerUser();
  const staffOnly = !owner && isStaffUser();
  if (owner) {
    listItems = listItems.filter((item) => item.key !== "carts");
  }
  if (staffOnly) {
    listItems = listItems.filter(
      (item) => !["staff", "posts"].includes(item.key)
    );
  }


  const ListUI = (
    <Paper
      elevation={0}
      variant="outlined"
      sx={{ width: 280, bgcolor: CARD_BG, borderColor: CARD_BORDER, borderRadius: 3, p: 1 }}
    >
      <Box sx={{ px: 2, pt: 1, pb: 1 }}>
        <Typography variant="subtitle2" sx={{ color: TEXT, fontWeight: 700 }}>
          {title}
        </Typography>
      </Box>
      <List dense disablePadding>
        {listItems.map((item) => {
          const selected = active === item.key;
          const ItemIcon = item.Icon || item.icon || null;
          { ItemIcon && <ItemIcon className="mr-2" fontSize="small" /> }
          return (
            <ListItemButton
              selected={active === item.key}
              onClick={() => onSelect?.(item.key)}
              sx={{
                position: "relative",
                m: "4px 8px",
                borderRadius: 2,
                color: selected ? TEAL : TEXT,
                "& .MuiListItemIcon-root": { minWidth: 40, color: selected ? TEAL : "#525252" },
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
              {ItemIcon && (
                <ListItemIcon>
                  <ItemIcon fontSize="small" />
                </ListItemIcon>
              )}
              <ListItemText primary={item.label} />
            </ListItemButton>
          );
        })}
      </List>
    </Paper>
  );

  return isMobile ? (
    <Drawer anchor="left" open={mobileOpen} onClose={onMobileClose}>
      <Box sx={{ p: 1 }}>{ListUI}</Box>
    </Drawer>
  ) : (
    <Box sx={{ width: 280 }}>{ListUI}</Box>
  );
}
