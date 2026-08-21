import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
  Divider,
} from "@mui/material";
import { API_BASE, getToken } from "../utils/api";

function tokenHeader() {
  const token = getToken();

  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function LinkedInProfileImportDialog({
  open,
  onClose,
  onImported,
}) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const previewImport = async () => {
    if (!file) return;

    setLoading(true);
    setError("");

    try {
      const form = new FormData();
      form.append("file", file);

      const response = await fetch(
        `${API_BASE}/auth/linkedin-profile/import-preview/`,
        {
          method: "POST",
          headers: tokenHeader(),
          body: form,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.detail || "Preview failed");
      }

      setPreview(data.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const confirmImport = async () => {
    if (!preview) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE}/auth/linkedin-profile/import-confirm/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...tokenHeader(),
          },
          body: JSON.stringify({
            profile_data: preview,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.detail || "Import failed");
      }

      onImported?.();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreview(null);
    setError("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
      <DialogTitle>Import LinkedIn Profile</DialogTitle>

      <DialogContent dividers>
        {!preview && (
          <>
            <Box
              sx={{
                mb: 2,
                p: 2,
                borderRadius: 1,
                backgroundColor: "#f5f7fa",
              }}
            >
              <Typography variant="subtitle2">
                How to download LinkedIn PDF
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                1. Open LinkedIn profile.
                <br />
                2. Click Resources / More button.
                <br />
                3. Select Save to PDF.
                <br />
                4. Upload the downloaded PDF here.
              </Typography>
            </Box>

            <Button variant="outlined" component="label">
              Select LinkedIn PDF
              <input
                hidden
                type="file"
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files[0])}
              />
            </Button>

            {file && (
              <Typography sx={{ mt: 2 }}>
                Selected: {file.name}
              </Typography>
            )}
          </>
        )}

        {preview && (
          <Box>
            <Typography variant="h6">
              {preview.full_name}
            </Typography>

            <Typography>
              {preview.headline}
            </Typography>

            {preview.phone && (
              <Typography sx={{ mt: 1 }}>
                Phone: {preview.phone}
              </Typography>
            )}

            <Divider sx={{ my: 2 }} />

            <Typography>
              Skills: {(preview.skills || []).join(", ")}
            </Typography>

            <Typography sx={{ mt: 1 }}>
              Experience: {(preview.experiences || []).length}
            </Typography>

            <Typography>
              Education: {(preview.educations || []).length}
            </Typography>
          </Box>
        )}

        {error && (
          <Typography color="error" sx={{ mt: 2 }}>
            {error}
          </Typography>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>
          Cancel
        </Button>

        {!preview && (
          <Button
            variant="contained"
            onClick={previewImport}
            disabled={!file || loading}
            startIcon={
              loading ? <CircularProgress size={16} color="inherit" /> : null
            }
          >
            {loading ? "Generating preview…" : "Preview"}
          </Button>
        )}

        {preview && (
          <Button
            variant="contained"
            onClick={confirmImport}
            disabled={loading}
            startIcon={
              loading ? <CircularProgress size={16} color="inherit" /> : null
            }
          >
            {loading ? "Importing…" : "Import"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
