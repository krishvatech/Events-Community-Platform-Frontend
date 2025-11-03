// src/components/CommunitySideBar.jsx
import * as React from "react";
import {
  Paper, Typography, List, ListItem, ListItemText,
  Stack, Divider, Chip, Button
} from "@mui/material";

const BORDER = "#e2e8f0";
const HOVER_BG = "#e6f7f6";
const SLATE_700 = "#334155";

// Same API as your in-file LeftNav:
// props: { view, onChangeView, topics? }
export default function CommunitySideBar({ view, onChangeView, topics }) {
  const TOPICS = topics && topics.length
    ? topics
    : ["Eco-Friendly tips", "Sustainable Living", "Climate Action & Advocacy", "Recycling & Upcycling"];

  const items = [
    { key: "home", label: "Home", icon: "🏠" },
    { key: "live", label: "Live Feed", icon: "🔴" },
    { key: "notify", label: "Notification", icon: "🔔" },
    { key: "messages", label: "Messages", icon: "💬" },
    { key: "feed", label: "Groups", icon: "👥" },
    { key: "members", label: "Members", icon: "🧑‍🤝‍🧑" },
  ];

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        border: `1px solid ${BORDER}`,
        borderRadius: 3,
        position: { md: "sticky" },
        top: { md: 16 },
        maxHeight: { md: "calc(100vh - 120px)" },
        overflowY: { md: "auto" },
      }}
    >
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5, color: SLATE_700 }}>
        IMAA Connect
      </Typography>

      <List dense>
        {items.map((it) => {
          const active = view === it.key || (it.key === "feed" && view === "feed");
          return (
            <ListItem
              key={it.key}
              onClick={() => onChangeView(it.key)}
              sx={{
                px: 1.25,
                borderRadius: 2,
                cursor: "pointer",
                ...(active
                  ? { bgcolor: HOVER_BG, "&:hover": { bgcolor: HOVER_BG } }
                  : { "&:hover": { background: HOVER_BG } }),
              }}
            >
              <ListItemText
                primary={
                  <Stack direction="row" alignItems="center" spacing={1.25}>
                    <span style={{ width: 18, display: "inline-block", textAlign: "center" }}>
                      {it.icon}
                    </span>
                    <Typography variant="body2" color="text.primary">
                      {it.label}
                    </Typography>
                  </Stack>
                }
              />
            </ListItem>
          );
        })}
      </List>

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: SLATE_700, mb: 1 }}>
        Topics
      </Typography>
      <Stack spacing={1}>
        {TOPICS.map((t) => (
          <Chip key={t} label={t} variant="outlined" sx={{ width: "100%" }} />
        ))}
        <Button size="small" variant="text">… MORE</Button>
      </Stack>
    </Paper>
  );
}