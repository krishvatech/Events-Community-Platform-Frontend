// src/components/CommunityProfileCard.jsx
import * as React from "react";
import {
  Avatar, Box, Button, Chip, Divider, Paper, Stack, Typography,
} from "@mui/material";

const BORDER = "#e2e8f0";
const SLATE_700 = "#334155";
const HOVER_BG = "#e6f7f6";

export default function CommunityProfileCard({
  user = {
    name: "Anita Sharma",
    title: "M&A Analyst",
    avatarUrl:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=128&q=80&auto=format&fit=crop",
  },
  stats = { posts: 24, groups: 6, followers: 312 },
  tags = ["Deal Diligence"],
  onEdit = () => {},
  onMessage = () => {},
  actions = { showEdit: true, showMessage: true },
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        border: `1px solid ${BORDER}`,
        borderRadius: 3,
      }}
    >
      <Stack direction="row" spacing={2} alignItems="center">
        <Avatar src={user.avatarUrl} alt={user.name} sx={{ width: 56, height: 56 }} />
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: SLATE_700 }}>
            {user.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">{user.title}</Typography>
        </Box>
      </Stack>

      <Stack direction="row" spacing={1} mt={1.5} flexWrap="wrap">
        {tags.map((t) => (
          <Chip key={t} label={t} size="small" variant="outlined" />
        ))}
      </Stack>

      <Divider sx={{ my: 2 }} />

      {(actions.showEdit || actions.showMessage) && (
        <Stack direction="row" spacing={1.25} mt={2}>

          {actions.showMessage && (
            <Button
              fullWidth
              size="small"
              variant="outlined"
              onClick={onMessage}
              sx={{
                textTransform: "none",
                "&:hover": { background: HOVER_BG },
              }}
            >
              Message
            </Button>
          )}
        </Stack>
      )}
    </Paper>
  );
}

function Stat({ label, value }) {
  return (
    <Box sx={{ textAlign: "center", minWidth: 80 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Box>
  );
}