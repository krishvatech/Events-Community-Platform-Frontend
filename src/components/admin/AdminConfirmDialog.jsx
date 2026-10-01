import React, { useId } from "react";
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";

const AdminConfirmDialog = ({
  open,
  title,
  description,
  children,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmColor = "primary",
  loading = false,
  onConfirm,
  onCancel,
  onClose,
}) => {
  const titleId = useId();
  const descriptionId = useId();
  const handleCancel = onCancel || onClose;

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : handleCancel}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle id={titleId}>{title}</DialogTitle>
      {(description || children) ? (
        <DialogContent dividers>
          {description ? <DialogContentText id={descriptionId}>{description}</DialogContentText> : null}
          {children}
        </DialogContent>
      ) : null}
      <DialogActions>
        <Button onClick={handleCancel} disabled={loading}>{cancelLabel}</Button>
        <Button onClick={onConfirm} color={confirmColor} variant="contained" disabled={loading}>
          {loading ? <CircularProgress size={20} color="inherit" aria-label={`${confirmLabel} in progress`} /> : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AdminConfirmDialog;
