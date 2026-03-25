/**
 * React hook for managing media device cache clearing UI and logic
 */

import { useState } from "react";
import { clearMediaDeviceCache, getPermissionLimitations } from "../utils/mediaDeviceCache";

export const useClearMediaCache = (onSuccess) => {
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [showDetails, setShowDetails] = useState(false);

  const handleOpenConfirmDialog = () => {
    setConfirmDialogOpen(true);
  };

  const handleCloseConfirmDialog = () => {
    setConfirmDialogOpen(false);
  };

  const handleConfirmClear = async () => {
    setConfirmDialogOpen(false);
    setIsClearing(true);

    try {
      const result = await clearMediaDeviceCache();

      if (result.success) {
        setSnackbarMessage(
          "Media device cache cleared! Page will reload in 2 seconds..."
        );
        setSnackbarSeverity("success");

        // Wait 2 seconds, then reload
        setTimeout(() => {
          if (onSuccess) {
            onSuccess(result);
          }
          window.location.reload();
        }, 2000);
      } else {
        setSnackbarMessage(
          `Partial success: ${result.message} ${result.errors.length > 0 ? "Some items could not be cleared." : ""}`
        );
        setSnackbarSeverity("warning");
      }
    } catch (error) {
      setSnackbarMessage(`Error: ${error.message}`);
      setSnackbarSeverity("error");
    } finally {
      setIsClearing(false);
      setSnackbarOpen(true);
    }
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbarOpen(false);
  };

  const getLimitations = () => {
    return getPermissionLimitations();
  };

  return {
    // State
    confirmDialogOpen,
    isClearing,
    snackbarOpen,
    snackbarMessage,
    snackbarSeverity,
    showDetails,

    // Handlers
    handleOpenConfirmDialog,
    handleCloseConfirmDialog,
    handleConfirmClear,
    handleCloseSnackbar,
    setShowDetails,
    getLimitations,
  };
};
