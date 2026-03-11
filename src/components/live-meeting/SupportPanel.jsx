import React from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import FiberManualRecordRoundedIcon from "@mui/icons-material/FiberManualRecordRounded";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";

const DIALOG_PAPER_SX = {
  borderRadius: 3,
  bgcolor: "rgba(15, 23, 42, 0.95)",
  border: "1px solid rgba(255,255,255,0.10)",
  backdropFilter: "blur(12px)",
  color: "#fff",
};

function formatRequestTime(value) {
  if (!value) return "Just now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function locationLabel(location) {
  return location === "waiting_room" ? "Waiting Room" : "Main Room";
}

function statusLabel(status) {
  if (status === "sent") return "Request sent";
  if (status === "queued") return "Queued";
  if (status === "resolved") return "Resolved";
  return "Ready";
}

export function AttendeeSupportDialog({
  open,
  onClose,
  onRequestAssistance,
  requestDisabled = false,
  requestLabel = "Request Assistance",
  statusText = "No active request",
  helperText = "Need help? Notify the host team and we'll get to you shortly.",
  infoSeverity = "info",
  infoText = "",
}) {
  const derivedStatus =
    statusText === "No active request"
      ? "idle"
      : statusText.toLowerCase().includes("resolved")
        ? "resolved"
      : requestDisabled && requestLabel.toLowerCase().includes("sent")
        ? "sent"
        : requestLabel.toLowerCase().includes("queued")
          ? "queued"
          : "idle";

  return (
    <Dialog open={open} onClose={onClose} PaperProps={{ sx: DIALOG_PAPER_SX }} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pb: 1, fontWeight: 800, fontSize: 18, color: "rgba(255,255,255,0.92)" }}>
        <Stack direction="row" spacing={1.25} alignItems="center">
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2.5,
              display: "grid",
              placeItems: "center",
              bgcolor: "rgba(34,211,238,0.12)",
              border: "1px solid rgba(34,211,238,0.25)",
            }}
          >
            <SupportAgentIcon sx={{ color: "#67e8f9" }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: 21, lineHeight: 1.15 }}>
              Support
            </Typography>
            <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.56)", mt: 0.25 }}>
              Notify the host team without leaving the webinar
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Paper
          variant="outlined"
          sx={{
            p: 1.5,
            mb: 1.5,
            borderRadius: 3,
            bgcolor: "linear-gradient(180deg, rgba(18,34,64,0.88) 0%, rgba(10,20,38,0.92) 100%)",
            background: "linear-gradient(180deg, rgba(18,34,64,0.88) 0%, rgba(10,20,38,0.92) 100%)",
            borderColor: "rgba(125,211,252,0.16)",
          }}
        >
          <Typography sx={{ color: "rgba(255,255,255,0.82)", lineHeight: 1.45 }}>
            {helperText}
          </Typography>
        </Paper>

        {infoText ? (
          <Paper
            variant="outlined"
            sx={{
              mb: 1.5,
              px: 1.25,
              py: 1,
              borderRadius: 2.5,
              bgcolor:
                infoSeverity === "error"
                  ? "rgba(239,68,68,0.10)"
                  : infoSeverity === "warning"
                    ? "rgba(245,158,11,0.10)"
                    : "rgba(255,255,255,0.05)",
              borderColor:
                infoSeverity === "error"
                  ? "rgba(239,68,68,0.22)"
                  : infoSeverity === "warning"
                    ? "rgba(245,158,11,0.22)"
                    : "rgba(255,255,255,0.08)",
            }}
          >
            <Alert
              severity={infoSeverity}
              icon={false}
              sx={{
                p: 0,
                bgcolor: "transparent",
                color: "#fff",
                "& .MuiAlert-message": { p: 0, fontSize: 13, lineHeight: 1.45 },
              }}
            >
              {infoText}
            </Alert>
          </Paper>
        ) : null}

        <Paper
          variant="outlined"
          sx={{
            p: 1.5,
            borderRadius: 3,
            bgcolor: "rgba(255,255,255,0.04)",
            borderColor:
              derivedStatus === "resolved"
                ? "rgba(56,189,248,0.24)"
                :
              derivedStatus === "sent"
                ? "rgba(16,185,129,0.24)"
                : derivedStatus === "queued"
                  ? "rgba(245,158,11,0.24)"
                  : "rgba(255,255,255,0.08)",
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <Chip
              size="small"
              icon={
                derivedStatus === "sent" ? (
                  <CheckCircleRoundedIcon sx={{ fontSize: 14 }} />
                ) : (
                  <FiberManualRecordRoundedIcon sx={{ fontSize: 11 }} />
                )
              }
              label={statusLabel(derivedStatus)}
              sx={{
                height: 24,
                bgcolor:
                  derivedStatus === "resolved"
                    ? "rgba(56,189,248,0.14)"
                    :
                  derivedStatus === "sent"
                    ? "rgba(16,185,129,0.14)"
                    : derivedStatus === "queued"
                      ? "rgba(245,158,11,0.14)"
                      : "rgba(125,211,252,0.12)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "#fff",
                "& .MuiChip-icon": { color: "inherit" },
              }}
            />
          </Stack>

          <Typography sx={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.8, opacity: 0.58, mb: 0.5 }}>
            Current status
          </Typography>
          <Typography sx={{ fontWeight: 800, fontSize: 21, lineHeight: 1.2, color: "rgba(255,255,255,0.96)" }}>
            {statusText}
          </Typography>
        </Paper>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, pt: 0.5, justifyContent: "space-between" }}>
        <Button
          onClick={onClose}
          sx={{
            color: "rgba(255,255,255,0.78)",
            px: 1.25,
            "&:hover": { bgcolor: "rgba(255,255,255,0.08)" },
          }}
        >
          Close
        </Button>
        <Button
          onClick={onRequestAssistance}
          variant="contained"
          disabled={requestDisabled}
          startIcon={<SupportAgentIcon />}
          sx={{
            textTransform: "none",
            fontWeight: 700,
            minWidth: 148,
            bgcolor: "#14b8b1",
            "&:hover": { bgcolor: "#0f9a94" },
            "&.Mui-disabled": {
              bgcolor: "rgba(20,184,177,0.22)",
              color: "rgba(255,255,255,0.55)",
            },
          }}
        >
          {requestLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function HostSupportInbox({ requests, onResolve, onMessage }) {
  const allRequests = Array.isArray(requests) ? requests : [];
  const activeRequests = allRequests.filter((request) => request.status !== "resolved");
  const resolvedRequests = allRequests
    .filter((request) => request.status === "resolved")
    .slice(0, 3);

  return (
    <Stack spacing={1.25} sx={{ p: 2, overflow: "auto", height: "100%" }}>
      <Paper
        variant="outlined"
        sx={{
          p: 1.5,
          borderRadius: 2.5,
          bgcolor: "rgba(255,255,255,0.03)",
          borderColor: "rgba(255,255,255,0.08)",
        }}
      >
        <Typography sx={{ fontWeight: 800, fontSize: 14, mb: 0.25 }}>
          Support requests
        </Typography>
        <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.62)" }}>
          Open a direct message to help the attendee, then resolve the request once you have handled it.
        </Typography>
      </Paper>

      {activeRequests.length === 0 ? (
        <Box sx={{ p: 2.5, textAlign: "center", opacity: 0.75 }}>
          <SupportAgentIcon sx={{ fontSize: 36, mb: 1, color: "rgba(255,255,255,0.72)" }} />
          <Typography sx={{ fontWeight: 700, mb: 0.5 }}>No active support requests</Typography>
          <Typography sx={{ fontSize: 13, color: "rgba(255,255,255,0.62)" }}>
            New attendee requests will appear here.
          </Typography>
        </Box>
      ) : null}

      {activeRequests.map((request) => (
        <Paper
          key={request.id}
          variant="outlined"
          sx={{
            p: 1.5,
            borderRadius: 3,
            background:
              request.status === "new"
                ? "linear-gradient(180deg, rgba(42,14,20,0.95) 0%, rgba(23,17,28,0.92) 100%)"
                : "linear-gradient(180deg, rgba(17,25,39,0.92) 0%, rgba(15,23,42,0.92) 100%)",
            borderColor: request.status === "new" ? "rgba(239,68,68,0.42)" : "rgba(255,255,255,0.08)",
            boxShadow: request.status === "new" ? "0 14px 32px rgba(239,68,68,0.10)" : "none",
          }}
        >
          <Stack direction="row" spacing={1.25} alignItems="flex-start">
            <Avatar
              sx={{
                width: 42,
                height: 42,
                bgcolor: request.status === "new" ? "rgba(20,184,177,0.28)" : "rgba(20,184,177,0.18)",
                color: "#99f6e4",
                fontWeight: 800,
              }}
            >
              {(request.requesterName || "U").slice(0, 1).toUpperCase()}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mb: 0.75 }}>
                <Typography sx={{ fontWeight: 800, fontSize: 16, color: "rgba(255,255,255,0.96)" }} noWrap>
                  {request.requesterName || "Participant"}
                </Typography>
                <Chip
                  size="small"
                  label={locationLabel(request.location)}
                  sx={{
                    height: 24,
                    bgcolor: "rgba(125,211,252,0.12)",
                    border: "1px solid rgba(125,211,252,0.24)",
                    color: "#dbeafe",
                  }}
                />
                {request.status === "new" ? (
                  <Chip
                    size="small"
                    label="New"
                    color="error"
                    sx={{ height: 24, fontWeight: 700 }}
                  />
                ) : null}
              </Stack>

              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1.5, opacity: 0.76 }}>
                <AccessTimeRoundedIcon sx={{ fontSize: 14 }} />
                <Typography sx={{ fontSize: 12 }}>
                  Requested {formatRequestTime(request.createdAt)}
                </Typography>
              </Stack>

              <Stack direction="row" spacing={1} flexWrap="wrap">
                {onMessage ? (
                  <Button
                    onClick={() => onMessage(request)}
                    variant="contained"
                    size="small"
                    sx={{
                      textTransform: "none",
                      fontWeight: 700,
                      px: 1.6,
                      bgcolor: "#14b8b1",
                      "&:hover": { bgcolor: "#0f9a94" },
                    }}
                  >
                    Message
                  </Button>
                ) : null}
                <Button
                  onClick={() => onResolve?.(request.id)}
                  variant="outlined"
                  size="small"
                  sx={{
                    textTransform: "none",
                    fontWeight: 700,
                    px: 1.5,
                    borderColor: "rgba(20,184,177,0.35)",
                    color: "#99f6e4",
                    "&:hover": {
                      borderColor: "rgba(20,184,177,0.55)",
                      bgcolor: "rgba(20,184,177,0.08)",
                    },
                  }}
                >
                  Resolve
                </Button>
              </Stack>
            </Box>
          </Stack>
        </Paper>
      ))}

      {resolvedRequests.length > 0 ? (
        <Box sx={{ pt: 0.5 }}>
          <Typography sx={{ fontWeight: 800, fontSize: 11, letterSpacing: 0.8, opacity: 0.58, mb: 1 }}>
            RECENTLY RESOLVED
          </Typography>
          <Stack spacing={1}>
            {resolvedRequests.map((request) => (
              <Paper
                key={`resolved-${request.id}`}
                variant="outlined"
                sx={{
                  px: 1.25,
                  py: 1,
                  borderRadius: 2.5,
                  bgcolor: "rgba(16,185,129,0.06)",
                  borderColor: "rgba(16,185,129,0.18)",
                }}
              >
                <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="center">
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: 13 }} noWrap>
                      {request.requesterName || "Participant"}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: "rgba(255,255,255,0.58)" }}>
                      {locationLabel(request.location)} • Resolved {formatRequestTime(request.resolvedAt || request.createdAt)}
                    </Typography>
                  </Box>
                  <Chip
                    size="small"
                    icon={<CheckCircleRoundedIcon sx={{ fontSize: 14 }} />}
                    label="Resolved"
                    sx={{
                      height: 24,
                      bgcolor: "rgba(16,185,129,0.14)",
                      border: "1px solid rgba(16,185,129,0.22)",
                      color: "#d1fae5",
                      "& .MuiChip-icon": { color: "inherit" },
                    }}
                  />
                </Stack>
              </Paper>
            ))}
          </Stack>
        </Box>
      ) : null}
    </Stack>
  );
}
