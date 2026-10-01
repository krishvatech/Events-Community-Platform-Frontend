import React from "react";
import { Chip } from "@mui/material";

// Only statuses already used by Developer-B-owned Admin, Marketing, and Blog pages.
export const ADMIN_STATUS_META = Object.freeze({
  active: { label: "Active", color: "success", variant: "filled" },
  approved: { label: "Approved", color: "success", variant: "filled" },
  archived: { label: "Archived", color: "default", variant: "outlined" },
  cancelled: { label: "Cancelled", color: "default", variant: "outlined" },
  denied: { label: "Denied", color: "warning", variant: "filled" },
  draft: { label: "Draft", color: "default", variant: "outlined" },
  failed: { label: "Failed", color: "error", variant: "filled" },
  inactive: { label: "Inactive", color: "default", variant: "outlined" },
  pending: { label: "Pending", color: "warning", variant: "outlined" },
  published: { label: "Published", color: "success", variant: "filled" },
  rejected: { label: "Rejected", color: "error", variant: "outlined" },
  scheduled: { label: "Scheduled", color: "info", variant: "filled" },
  sending: { label: "Sending", color: "warning", variant: "filled" },
  sent: { label: "Completed", color: "success", variant: "filled" },
  succeeded: { label: "Succeeded", color: "success", variant: "filled" },
});

const humanizeStatus = (status) => {
  const value = String(status || "unknown").trim();
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
};

const AdminStatusChip = ({ status, label, color, variant, icon, sx, ...props }) => {
  const normalized = String(status || "").trim().toLowerCase();
  const meta = ADMIN_STATUS_META[normalized] || {};

  return (
    <Chip
      size="small"
      label={label || meta.label || humanizeStatus(status)}
      color={color || meta.color || "default"}
      variant={variant || meta.variant || "outlined"}
      icon={icon}
      data-status={normalized || "unknown"}
      sx={{ fontWeight: 700, ...sx }}
      {...props}
    />
  );
};

export default AdminStatusChip;
