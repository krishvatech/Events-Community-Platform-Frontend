import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Slider,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CoffeeIcon from "@mui/icons-material/Coffee";

/**
 * BreakConfigDialog Component
 *
 * Dialog for the Host to configure and start a break.
 * Allows selection of break duration via slider (1-60 minutes).
 */
export default function BreakConfigDialog({ open, onClose, onStartBreak }) {
  const [durationMinutes, setDurationMinutes] = useState(10);

  const handleStart = () => {
    onStartBreak(durationMinutes * 60);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: "#0f172a",
          border: "1px solid rgba(255,255,255,0.12)",
          color: "#E5E7EB",
        },
      }}
    >
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <CoffeeIcon />
          <Typography fontWeight={700}>Start Break</Typography>
        </Box>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{ color: "rgba(255,255,255,0.6)" }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Typography sx={{ fontSize: 13, color: "rgba(255,255,255,0.65)", mb: 3 }}>
          All participants will see a break screen with a countdown timer. You can
          end the break early at any time.
        </Typography>

        <Typography sx={{ fontWeight: 600, mb: 1 }}>
          Break Duration: {durationMinutes} minute{durationMinutes !== 1 ? "s" : ""}
        </Typography>
        <Slider
          value={durationMinutes}
          min={1}
          max={60}
          step={1}
          onChange={(_, val) => setDurationMinutes(val)}
          marks={[
            { value: 5, label: "5m" },
            { value: 10, label: "10m" },
            { value: 15, label: "15m" },
            { value: 30, label: "30m" },
          ]}
          sx={{ color: "#10b8a6" }}
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={onClose}
          sx={{ color: "rgba(255,255,255,0.6)", textTransform: "none" }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleStart}
          variant="contained"
          sx={{
            bgcolor: "#10b8a6",
            textTransform: "none",
            fontWeight: 700,
            "&:hover": { bgcolor: "#0ea5a4" },
          }}
        >
          Start Break
        </Button>
      </DialogActions>
    </Dialog>
  );
}
