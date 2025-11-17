// src/pages/admin/AdminMessagesPage.jsx
import * as React from "react";
import {
  Avatar,
  Box,
  Divider,
  Grid,
  IconButton,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
  InputAdornment,
} from "@mui/material";
import ArrowBackIosNewRoundedIcon from "@mui/icons-material/ArrowBackIosNewRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import SearchIcon from "@mui/icons-material/Search";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";

const BORDER = "#e2e8f0";

const MOCK_MEMBERS = [
  { id: 1, name: "Moderator One", role: "Senior Moderator", initials: "MO" },
  { id: 2, name: "Moderator Two", role: "Content Moderator", initials: "MT" },
  { id: 3, name: "Moderator Three", role: "Community Mod", initials: "M3" },
];

const MOCK_MESSAGES = [
  { id: 1, from: "me", text: "Hi, thanks for checking the reports." },
  { id: 2, from: "them", text: "Sure, I’ll review the flagged posts today." },
  { id: 3, from: "me", text: "Great, let me know if anything is urgent." },
];

export default function AdminMessagesPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [selectedUser, setSelectedUser] = React.useState(null);
  const [messageInput, setMessageInput] = React.useState("");

  const handleSelectUser = (user) => {
    setSelectedUser(user);
  };

  const handleBackToList = () => {
    setSelectedUser(null);
  };

  const handleSend = () => {
    if (!messageInput.trim() || !selectedUser) return;
    // TODO: integrate with your send-message API
    console.log("Send message to:", selectedUser, "text:", messageInput);
    setMessageInput("");
  };

  return (
    <Box sx={{ py: 2 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
        Messages
      </Typography>

      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: `1px solid ${BORDER}`,
          overflow: "hidden",
          minHeight: { xs: 480, md: 560 },
        }}
      >
        <Grid
          container
          sx={{
            height: "100%",
          }}
        >
          {/* LEFT PANEL — MEMBER LIST */}
          <Grid
            item
            xs={12}
            md={5} // 40% (approx) on desktop
            sx={{
              borderRight: {
                xs: "none",
                md: `1px solid ${BORDER}`, // vertical divider on desktop
              },
              display: {
                xs: selectedUser ? "none" : "block", // hide on mobile when chat is open
                md: "block",
              },
              height: "100%",
            }}
          >
            {/* List header */}
            <Box
              sx={{
                px: 2,
                py: 1.5,
                borderBottom: `1px solid ${BORDER}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Moderators
              </Typography>
            </Box>

            {/* Search + list */}
            <Box sx={{ px: 1.5, py: 1.5 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search moderators"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            <Divider />

            <Box sx={{ maxHeight: { xs: 380, md: 480 }, overflowY: "auto" }}>
              <List disablePadding>
                {MOCK_MEMBERS.map((user) => (
                  <ListItemButton
                    key={user.id}
                    onClick={() => handleSelectUser(user)}
                    selected={selectedUser?.id === user.id}
                    sx={{
                      px: 2,
                      py: 1.2,
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar>
                        {user.initials}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
                          {user.name}
                        </Typography>
                      }
                      secondary={
                        <Typography
                          variant="body2"
                          sx={{ color: "text.secondary", fontSize: 12 }}
                        >
                          {user.role}
                        </Typography>
                      }
                    />
                  </ListItemButton>
                ))}
              </List>
            </Box>
          </Grid>

          {/* RIGHT PANEL — CHAT */}
          <Grid
            item
            xs={12}
            md={7} // 60% (approx) on desktop
            sx={{
              display: {
                xs: selectedUser ? "flex" : "none", // only show on mobile when a user is selected
                md: "flex",
              },
              flexDirection: "column",
              height: "100%",
            }}
          >
            {/* Chat header */}
            <Box
              sx={{
                px: 2,
                py: 1.5,
                borderBottom: `1px solid ${BORDER}`,
                display: "flex",
                alignItems: "center",
                gap: 1.5,
              }}
            >
              {/* Back button: only on mobile */}
              {isMobile && (
                <IconButton
                  size="small"
                  onClick={handleBackToList}
                  sx={{ mr: 0.5 }}
                >
                  <ArrowBackIosNewRoundedIcon fontSize="small" />
                </IconButton>
              )}

              {selectedUser ? (
                <>
                  <Avatar sx={{ width: 32, height: 32 }}>
                    {selectedUser.initials}
                  </Avatar>
                  <Box>
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 600, fontSize: 14 }}
                    >
                      {selectedUser.name}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: "text.secondary", fontSize: 12 }}
                    >
                      {selectedUser.role}
                    </Typography>
                  </Box>
                </>
              ) : (
                <Typography
                  variant="body2"
                  sx={{ color: "text.secondary", fontSize: 14 }}
                >
                  Select a moderator to start a conversation
                </Typography>
              )}
            </Box>

            {/* Messages area */}
            <Box
              sx={{
                flex: 1,
                p: 2,
                overflowY: "auto",
                backgroundColor: "#f8fafc",
              }}
            >
              {!selectedUser ? (
                <Box
                  sx={{
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{ color: "text.secondary", textAlign: "center" }}
                  >
                    Choose a moderator from the list to view messages.
                  </Typography>
                </Box>
              ) : (
                <Stack spacing={1.5}>
                  {MOCK_MESSAGES.map((msg) => (
                    <Box
                      key={msg.id}
                      sx={{
                        display: "flex",
                        justifyContent:
                          msg.from === "me" ? "flex-end" : "flex-start",
                      }}
                    >
                      <Box
                        sx={{
                          maxWidth: "80%",
                          px: 1.5,
                          py: 1,
                          borderRadius: 2,
                          fontSize: 13,
                          backgroundColor:
                            msg.from === "me"
                              ? theme.palette.primary.main
                              : "#ffffff",
                          color:
                            msg.from === "me"
                              ? theme.palette.primary.contrastText
                              : "text.primary",
                          boxShadow: "0 1px 2px rgba(15, 23, 42, 0.08)",
                        }}
                      >
                        {msg.text}
                      </Box>
                    </Box>
                  ))}
                </Stack>
              )}
            </Box>

            {/* Input area */}
            <Box
              sx={{
                borderTop: `1px solid ${BORDER}`,
                px: 2,
                py: 1.2,
                backgroundColor: "#ffffff",
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField
                  fullWidth
                  size="small"
                  placeholder={
                    selectedUser
                      ? "Type a message..."
                      : "Select a moderator to start chatting"
                  }
                  disabled={!selectedUser}
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <IconButton
                  color="primary"
                  disabled={!selectedUser || !messageInput.trim()}
                  onClick={handleSend}
                >
                  <SendRoundedIcon />
                </IconButton>
              </Stack>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}
