// src/pages/community/HomePage.jsx
import * as React from "react";
import {
  Box, Button, Chip, Divider, Grid, List, ListItem, ListItemText,
  Paper, Stack, Typography
} from "@mui/material";
import CommunityProfileCard from "../../components/CommunityProfileCard.jsx"; // adjust path if needed

const BORDER = "#e2e8f0";

export default function HomePage({
  user,
  stats,
  tags = [],
  featuredGroups = [],
  upcomingEvents = [],
  recommendations = [],
  onCreatePost = () => {},
  onOpenEvent = () => {},
  onOpenGroup = () => {},
}) {
  return (
    <Grid container spacing={2}>
      {/* Left: Profile (optional on desktop) */}
      <Grid item xs={12} md={3} sx={{ display: { xs: "none", md: "block" } }}>
        <CommunityProfileCard user={user} stats={stats} tags={tags} />
      </Grid>

      {/* Center: Composer + Recommendations */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2, border: `1px solid ${BORDER}`, borderRadius: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
            Quick Actions
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="contained" onClick={onCreatePost}>
              New Post
            </Button>
            <Button size="small" variant="outlined">Upload</Button>
            <Button size="small" variant="outlined">Ask</Button>
          </Stack>
        </Paper>

        <Paper sx={{ p: 2, mt: 2, border: `1px solid ${BORDER}`, borderRadius: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            Recommendations
          </Typography>
          {recommendations.length === 0 ? (
            <Typography variant="body2" color="text.secondary">Nothing yet.</Typography>
          ) : (
            <List dense>
              {recommendations.map((r) => (
                <ListItem key={r.id} disableGutters>
                  <ListItemText primary={r.title} secondary={r.subtitle} />
                </ListItem>
              ))}
            </List>
          )}
        </Paper>
      </Grid>

      {/* Right: Events + Featured Groups */}
      <Grid item xs={12} md={3}>
        <Paper sx={{ p: 2, border: `1px solid ${BORDER}`, borderRadius: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            Upcoming Events
          </Typography>
          <List dense>
            {upcomingEvents.map((ev) => (
              <ListItem key={ev.id} button onClick={() => onOpenEvent(ev.id)}>
                <ListItemText primary={ev.title} secondary={ev.date} />
              </ListItem>
            ))}
          </List>
        </Paper>

        <Paper sx={{ p: 2, mt: 2, border: `1px solid ${BORDER}`, borderRadius: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            Featured Groups
          </Typography>
          <Stack spacing={1}>
            {featuredGroups.map((g) => (
              <Button
                key={g.id}
                variant="outlined"
                size="small"
                onClick={() => onOpenGroup(g.id)}
                sx={{ justifyContent: "flex-start" }}
              >
                {g.name}
              </Button>
            ))}
          </Stack>

          {tags.length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {tags.map((t) => <Chip key={t} label={t} size="small" />)}
              </Stack>
            </>
          )}
        </Paper>
      </Grid>
    </Grid>
  );
}
