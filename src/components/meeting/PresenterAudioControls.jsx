/**
 * PresenterAudioControls.jsx
 * UI component for presenter audio control (on/off toggle + volume slider)
 * Displays controls for the current presenter's screen share audio
 */

import React, { useCallback } from "react";
import { Box, IconButton, Slider, Tooltip } from "@mui/material";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";

const PresenterAudioControls = ({
  isEnabled = false,
  volume = 1.0,
  onToggle = () => {},
  onVolumeChange = () => {},
  disabled = false,
  presenterName = "Presenter",
  size = "small",
  showLabel = false,
  sx = {},
}) => {
  const handleToggleClick = useCallback(() => {
    onToggle(!isEnabled);
  }, [isEnabled, onToggle]);

  const handleVolumeChangeInternal = useCallback(
    (_, newValue) => {
      onVolumeChange(newValue);
    },
    [onVolumeChange]
  );

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.75,
        bgcolor: "rgba(255,255,255,0.06)",
        borderRadius: 2,
        px: 1,
        py: 0.75,
        ...sx,
      }}
    >
      {showLabel && (
        <span
          style={{
            fontSize: "12px",
            color: "rgba(255,255,255,0.6)",
            marginRight: "4px",
          }}
        >
          {presenterName}
        </span>
      )}

      <Tooltip
        title={
          isEnabled
            ? `Mute ${presenterName}'s screen audio`
            : `Unmute ${presenterName}'s screen audio`
        }
      >
        <IconButton
          size={size}
          onClick={handleToggleClick}
          disabled={disabled}
          sx={{
            color: isEnabled ? "#22c55e" : "rgba(255,255,255,0.4)",
            transition: "all 0.2s ease",
            "&:hover": {
              color: isEnabled ? "#10b981" : "rgba(255,255,255,0.6)",
              backgroundColor: "rgba(255,255,255,0.06)",
            },
            "&:disabled": {
              color: "rgba(255,255,255,0.2)",
              cursor: "not-allowed",
            },
          }}
          aria-label={
            isEnabled ? "Mute screen audio" : "Unmute screen audio"
          }
        >
          {isEnabled ? (
            <VolumeUpIcon fontSize={size} />
          ) : (
            <VolumeOffIcon fontSize={size} />
          )}
        </IconButton>
      </Tooltip>

      <Slider
        size={size}
        value={volume}
        min={0}
        max={1}
        step={0.05}
        onChange={handleVolumeChangeInternal}
        disabled={!isEnabled || disabled}
        sx={{
          width: size === "small" ? 70 : 100,
          color: "#22c55e",
          "& .MuiSlider-thumb": {
            transition: "all 0.2s ease",
          },
          "& .MuiSlider-track": {
            backgroundColor: "#22c55e",
          },
          "& .MuiSlider-rail": {
            backgroundColor: "rgba(34, 197, 94, 0.2)",
          },
          "&.Mui-disabled": {
            opacity: 0.5,
          },
        }}
        aria-label={`${presenterName} screen audio volume`}
      />
    </Box>
  );
};

export default PresenterAudioControls;
