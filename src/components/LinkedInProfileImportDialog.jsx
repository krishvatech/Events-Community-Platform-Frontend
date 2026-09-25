import React, { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Typography,
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
  const [identityCheck, setIdentityCheck] = useState(null);
  const [ownershipConfirmed, setOwnershipConfirmed] = useState(false);
  const [addLinkedinEmail, setAddLinkedinEmail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const previewImport = async () => {
    if (!file) return;

    setLoading(true);
    setError("");
    setOwnershipConfirmed(false);
    setAddLinkedinEmail(false);

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
      setIdentityCheck(data.identity_check || null);
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
            ownership_confirmed: ownershipConfirmed,
            add_linkedin_email: addLinkedinEmail,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.detail || "Import failed");
      }

      onImported?.();
      handleClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (event) => {
    setFile(event.target.files?.[0] || null);
    setPreview(null);
    setIdentityCheck(null);
    setOwnershipConfirmed(false);
    setAddLinkedinEmail(false);
    setError("");
  };

  const handleClose = () => {
    setFile(null);
    setPreview(null);
    setIdentityCheck(null);
    setOwnershipConfirmed(false);
    setAddLinkedinEmail(false);
    setError("");
    onClose();
  };

  const identityStatus = identityCheck?.status || "matched";
  const needsOwnershipConfirmation = identityStatus === "review";
  const identityBlocked = identityStatus === "blocked";
  const canImport =
    !!preview &&
    !loading &&
    !identityBlocked &&
    (!needsOwnershipConfirmation || ownershipConfirmed);

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
                onChange={handleFileChange}
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

            {needsOwnershipConfirmation && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  The LinkedIn email is different from your account email.
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Account email: <strong>{identityCheck.account_email || "Not available"}</strong>
                </Typography>
                <Typography variant="body2">
                  LinkedIn email: <strong>{identityCheck.linkedin_email || "Not available"}</strong>
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  The profile name matches your account closely. Confirm ownership to continue.
                </Typography>

                <FormControlLabel
                  sx={{ mt: 1, display: "flex", alignItems: "flex-start" }}
                  control={
                    <Checkbox
                      checked={ownershipConfirmed}
                      onChange={(event) => setOwnershipConfirmed(event.target.checked)}
                    />
                  }
                  label="I confirm this LinkedIn profile belongs to me."
                />

                <FormControlLabel
                  sx={{ display: "flex", alignItems: "flex-start" }}
                  control={
                    <Checkbox
                      checked={addLinkedinEmail}
                      onChange={(event) => setAddLinkedinEmail(event.target.checked)}
                      disabled={!ownershipConfirmed}
                    />
                  }
                  label="Add the LinkedIn email to my profile as an additional email."
                />
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", ml: 4 }}>
                  This adds it to your profile email list only. It does not change your login email.
                </Typography>
              </Alert>
            )}

            {identityBlocked && (
              <Alert severity="error" sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  This LinkedIn profile appears to belong to another person.
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Account email: <strong>{identityCheck.account_email || "Not available"}</strong>
                </Typography>
                <Typography variant="body2">
                  LinkedIn email: <strong>{identityCheck.linkedin_email || "Not available"}</strong>
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Account name: <strong>{identityCheck.account_name || "Not available"}</strong>
                </Typography>
                <Typography variant="body2">
                  LinkedIn name: <strong>{identityCheck.linkedin_name || "Not available"}</strong>
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Please upload your own LinkedIn profile PDF.
                </Typography>
              </Alert>
            )}
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

        {preview && !identityBlocked && (
          <Button
            variant="contained"
            onClick={confirmImport}
            disabled={!canImport}
            startIcon={
              loading ? <CircularProgress size={16} color="inherit" /> : null
            }
          >
            {loading
              ? "Importing…"
              : needsOwnershipConfirmation
                ? "Import Anyway"
                : "Import"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
