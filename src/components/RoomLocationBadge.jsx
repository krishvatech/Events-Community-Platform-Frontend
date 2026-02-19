import React from "react";
import { Chip, useTheme } from "@mui/material";

/**
 * RoomLocationBadge Component
 * Displays the room location of a participant with color-coded styling
 *
 * @param {Object} props
 * @param {'main' | 'breakout' | 'lounge'} props.type - Type of room
 * @param {string} props.roomName - Display name of the room (e.g., "Main Room", "Breakout 2", "Table A")
 * @param {string} [props.roomId] - Room ID (optional, not displayed)
 * @param {'small' | 'medium'} [props.size='small'] - Badge size
 * @returns {JSX.Element}
 */
const RoomLocationBadge = ({ type, roomName, roomId, size = "small" }) => {
  const theme = useTheme();

  // Define color schemes for each room type
  const colorSchemes = {
    main: {
      backgroundColor: "#1a1a1a",
      color: "#ffffff",
      borderColor: "#404040",
    },
    breakout: {
      backgroundColor: "#1a1a1a",
      color: "#ffffff",
      borderColor: "#404040",
    },
    lounge: {
      backgroundColor: "#1a1a1a",
      color: "#ffffff",
      borderColor: "#404040",
    },
  };

  const scheme = colorSchemes[type] || colorSchemes.main;
  const sizeProps = size === "small" ? { size: "small" } : {};

  return (
    <Chip
      label={roomName}
      variant="outlined"
      {...sizeProps}
      sx={{
        backgroundColor: scheme.backgroundColor,
        color: scheme.color,
        borderColor: scheme.borderColor,
        fontWeight: 500,
        fontSize: size === "small" ? "0.75rem" : "0.875rem",
        height: size === "small" ? "24px" : "32px",
      }}
    />
  );
};

export default RoomLocationBadge;
