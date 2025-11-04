// src/components/CommunityProfileCard.jsx
import * as React from "react";
import {
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Paper,
  Stack,
  Typography,
  Tooltip,
} from "@mui/material";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import MoreHorizRoundedIcon from "@mui/icons-material/MoreHorizRounded";

const BORDER = "#e2e8f0";
const SLATE_700 = "#334155";

function initials(name = "") {
  const parts = name.trim().split(/\s+/);
  if (!parts.length) return "";
  const first = parts[0]?.[0] || "";
  const second = parts[1]?.[0] || "";
  return (first + second).toUpperCase();
}

export default function CommunityProfileCard({
  user = {
    name: "Mathews",
    status: "Active",
    avatarUrl: "",
  },

  // groups (aka communities) list for the right rail
  communities = [
    { id: 1, name: "Nature Lovers", code: "NL", color: "#FFEAA7", subscribed: true },
    { id: 2, name: "Green Reads & Reels", code: "GR", color: "#E5E7EB", subscribed: true },
    { id: 3, name: "Inspired by Nature", code: "IN", color: "#FFD6D6", subscribed: true },
  ],

  friends = [
    {
      id: 1,
      name: "Christine Robertson",
      avatarUrl:
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=128&q=80&auto=format&fit=crop",
    },
    {
      id: 2,
      name: "James Fox",
      avatarUrl:
        "https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?w=128&q=80&auto=format&fit=crop",
    },
    {
      id: 3,
      name: "Almanda Backenberg",
      avatarUrl:
        "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=128&q=80&auto=format&fit=crop",
    },
  ],

  onMessage = () => {},
  onMore = () => {},
  onCommunityUnsubscribe = (c) => console.log("Unsubscribe:", c),

  // We’ll still call these if you pass them, but we also open the local dialog.
  onViewAllCommunities,
  onViewAllFriends,
}) {
  const [openGroups, setOpenGroups] = React.useState(false);
  const [openFriends, setOpenFriends] = React.useState(false);

  const handleOpenGroups = () => {
    onViewAllCommunities?.();
    setOpenGroups(true);
  };
  const handleOpenFriends = () => {
    onViewAllFriends?.();
    setOpenFriends(true);
  };

  return (
    <>
      <Stack spacing={2.25}>
        {/* Profile card */}
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            border: `1px solid ${BORDER}`,
            borderRadius: 3,
            textAlign: "center",
          }}
        >
          <Stack spacing={1.25} alignItems="center">
            <Avatar
              src={user.avatarUrl}
              alt={user.name}
              sx={{ width: 72, height: 72, bgcolor: "#1abc9c", fontWeight: 700 }}
            >
              {user.avatarUrl ? null : initials(user.name)}
            </Avatar>

            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: SLATE_700 }}>
              {user.name}
            </Typography>

            {!!user.status && (
              <Chip
                size="small"
                label={user.status}
                variant="filled"
                sx={{
                  bgcolor: "#E6F9EE",
                  color: "#198754",
                  fontWeight: 600,
                  height: 22,
                  "& .MuiChip-label": { px: 1.25, pt: "1px" },
                }}
              />
            )}

            <Stack direction="row" spacing={1}>
              <Tooltip title="Message">
                <IconButton size="small" onClick={onMessage}>
                  <ChatBubbleOutlineRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="More">
                <IconButton size="small" onClick={onMore}>
                  <MoreHorizRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        </Paper>

        {/* Your Groups */}
        <Paper elevation={0} sx={{ p: 2, border: `1px solid ${BORDER}`, borderRadius: 3 }}>
          <SectionHeader title="Your Groups" onViewAll={handleOpenGroups} viewAllText="View all" />

          <Stack spacing={1.25} mt={1}>
            {communities.map((c) => (
              <Stack key={c.id} direction="row" spacing={1.25} alignItems="center">
                <Avatar
                  variant="rounded"
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: 1.5,
                    bgcolor: c.color || "#F1F5F9",
                    color: "#111827",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {c.code || initials(c.name)}
                </Avatar>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 600, color: SLATE_700, lineHeight: 1.2 }}
                    noWrap
                    title={c.name}
                  >
                    {c.name}
                  </Typography>
                  {c.subscribed && (
                    <Button
                      size="small"
                      variant="text"
                      onClick={() => onCommunityUnsubscribe(c)}
                      sx={{
                        p: 0,
                        minWidth: 0,
                        justifyContent: "flex-start",
                        color: "#2E7D32",
                        textTransform: "none",
                        fontSize: 12,
                      }}
                    >
                      Unsubscribe
                    </Button>
                  )}
                </Box>
              </Stack>
            ))}
          </Stack>
        </Paper>

        {/* Your friends */}
        <Paper elevation={0} sx={{ p: 2, border: `1px solid ${BORDER}`, borderRadius: 3 }}>
          <SectionHeader title="Your friends" onViewAll={handleOpenFriends} viewAllText="View all" />

          <Stack spacing={1.25} mt={1}>
            {friends.map((f) => (
              <Stack key={f.id} direction="row" spacing={1.25} alignItems="center">
                <Avatar src={f.avatarUrl} alt={f.name} sx={{ width: 28, height: 28 }} />
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, color: SLATE_700 }}
                  noWrap
                  title={f.name}
                >
                  {f.name}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Paper>
      </Stack>

      {/* Dialog: Your Groups */}
      <Dialog open={openGroups} onClose={() => setOpenGroups(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800 }}>Your Groups</DialogTitle>
        <DialogContent dividers>
          <List disablePadding>
            {communities.map((c, idx) => (
              <React.Fragment key={c.id || idx}>
                <ListItemButton disableRipple>
                  <ListItemAvatar>
                    <Avatar
                      variant="rounded"
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: 1.5,
                        bgcolor: c.color || "#F1F5F9",
                        color: "#111827",
                        fontSize: 13,
                        fontWeight: 800,
                      }}
                    >
                      {c.code || initials(c.name)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={<Typography sx={{ fontWeight: 700 }}>{c.name}</Typography>}
                    secondary={c.subscribed ? "Subscribed" : ""}
                  />
                  {c.subscribed && (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => onCommunityUnsubscribe(c)}
                      sx={{ textTransform: "none" }}
                    >
                      Unsubscribe
                    </Button>
                  )}
                </ListItemButton>
                {idx < communities.length - 1 && <Divider component="li" />}
              </React.Fragment>
            ))}
            {communities.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>
                No groups to show.
              </Typography>
            )}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenGroups(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Your friends */}
      <Dialog open={openFriends} onClose={() => setOpenFriends(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800 }}>Your friends</DialogTitle>
        <DialogContent dividers>
          <List disablePadding>
            {friends.map((f, idx) => (
              <React.Fragment key={f.id || idx}>
                <ListItemButton disableRipple>
                  <ListItemAvatar>
                    <Avatar src={f.avatarUrl} alt={f.name} />
                  </ListItemAvatar>
                  <ListItemText
                    primary={<Typography sx={{ fontWeight: 700 }}>{f.name}</Typography>}
                    secondary=""
                  />
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => onMessage(f)}
                    sx={{ textTransform: "none" }}
                  >
                    Message
                  </Button>
                </ListItemButton>
                {idx < friends.length - 1 && <Divider component="li" />}
              </React.Fragment>
            ))}
            {friends.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>
                No friends to show.
              </Typography>
            )}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenFriends(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function SectionHeader({ title, onViewAll, viewAllText = "View all" }) {
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between">
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      <Button
        size="small"
        variant="text"
        onClick={onViewAll}
        sx={{ textTransform: "none", fontSize: 12, p: 0, minWidth: 0 }}
      >
        {viewAllText}
      </Button>
    </Stack>
  );
}
