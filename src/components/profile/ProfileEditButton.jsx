import React from "react";
import { IconButton, Tooltip } from "@mui/material";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";

// LinkedIn-style row action: a single muted pencil. Delete lives in the edit dialog.
export default function ProfileEditButton({ onClick, title = "Edit" }) {
  return (
    <Tooltip title={title}>
      <IconButton
        size="small"
        onClick={onClick}
        aria-label={title}
        sx={{ color: "text.secondary", "&:hover": { color: "text.primary" } }}
      >
        <EditOutlinedIcon sx={{ fontSize: 18 }} />
      </IconButton>
    </Tooltip>
  );
}

// Pins a ListItem's secondaryAction to the title row instead of MUI's vertical centre,
// so actions don't drift down on rows with descriptions or document chips.
export const topActionSx = {
  "& > .MuiListItemSecondaryAction-root": { top: 2, transform: "none" },
};
