/**
 * Clear Media Cache Dialog Component
 *
 * Modern redesigned dialog with enhanced visual hierarchy and interactions
 */

import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
  Stack,
} from "@mui/material";
import {
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";

const ClearMediaCacheDialog = ({
  open,
  onConfirm,
  onCancel,
  isClearing = false,
  showDetails = false,
  onToggleDetails = () => {},
  limitations = null,
}) => {
  const defaultLimitations = {
    canClear: [
      "Device preferences & cached data",
    ],
    cannotClear: [
      "Browser permission database (must revoke manually)",
    ],
  };

  const info = limitations || defaultLimitations;

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          background: "linear-gradient(135deg, #060d1a 0%, #0f172a 100%)",
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle
        sx={{
          background: "linear-gradient(135deg, #0d9996 0%, #059a92 100%)",
          color: "white",
          py: 2,
          display: "flex",
          alignItems: "center",
          gap: 1,
          borderRadius: "8px 8px 0 0",
        }}
      >
        <WarningIcon sx={{ fontSize: 26 }} />
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "1.1rem" }}>
          Clear Cache & Permissions
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 3, pb: 3, bgcolor: "#060d1a", textAlign: "center" }}>
        {isClearing ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              py: 3,
              gap: 2,
            }}
          >
            <CircularProgress size={45} sx={{ color: "#0ea5a4" }} />
            <Typography variant="body2" sx={{ fontWeight: 600, color: "#e2e8f0" }}>
              Clearing Cache...
            </Typography>
          </Box>
        ) : (
          <Typography variant="body2" sx={{ color: "#64748b", lineHeight: 1.8, fontSize: "1rem" }}>
            This will clear your device preferences and cached data. You'll be prompted for permissions again when you rejoin.
          </Typography>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          gap: 2,
          p: 2,
          bgcolor: "#050a15",
          borderTop: "1px solid rgba(14, 165, 164, 0.2)",
        }}
      >
        <Button
          onClick={onCancel}
          disabled={isClearing}
          variant="outlined"
          sx={{
            borderColor: "#334155",
            color: "#94a3b8",
            textTransform: "none",
            fontWeight: 600,
            transition: "all 0.3s ease",
            "&:hover": {
              borderColor: "#475569",
              bgcolor: "rgba(14, 165, 164, 0.05)",
            },
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          disabled={isClearing}
          variant="contained"
          sx={{
            background: "linear-gradient(135deg, #0ea5a4 0%, #06b6a8 100%)",
            textTransform: "none",
            fontWeight: 700,
            fontSize: "0.95rem",
            px: 3,
            display: "flex",
            gap: 1,
            alignItems: "center",
            transition: "all 0.3s ease",
            "&:hover:not(:disabled)": {
              background: "linear-gradient(135deg, #06b6a8 0%, #059b9a 100%)",
              transform: "translateY(-2px)",
              boxShadow: "0 8px 16px rgba(14, 165, 164, 0.4)",
            },
            "&:disabled": {
              background: "linear-gradient(135deg, #475569 0%, #334155 100%)",
            },
          }}
        >
          {isClearing && <CircularProgress size={18} color="inherit" />}
          {isClearing ? "Clearing..." : "Clear Cache & Reload"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ClearMediaCacheDialog;
