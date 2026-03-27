import React, { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardContent,
  TextField,
  Button,
  Stack,
  Typography,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  Divider,
  Box,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PendingIcon from "@mui/icons-material/Schedule";

const RAW_BASE = (import.meta.env.VITE_API_BASE_URL || "").trim();
const API_BASE = RAW_BASE.replace(/\/+$/, "");
const urlJoin = (base, path) => `${base}${path.startsWith("/") ? path : `/${path}`}`;

/**
 * EmailAliasManagement
 * Allows authenticated users to add and verify secondary email addresses.
 * When an alias is verified, all guest attendance history under that email
 * is automatically merged into the user's account.
 */
export default function EmailAliasManagement({ accessToken }) {
  const [aliases, setAliases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Add alias dialog
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [addingEmail, setAddingEmail] = useState(false);

  // Verify alias dialog
  const [openVerifyDialog, setOpenVerifyDialog] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  // Load aliases on mount
  useEffect(() => {
    loadAliases();
  }, []);

  const loadAliases = async () => {
    setLoading(true);
    try {
      const res = await fetch(urlJoin(API_BASE, "/users/me/email-aliases/list/"), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) {
        throw new Error(`Failed to load email aliases (${res.status})`);
      }

      const data = await res.json();
      setAliases(data.aliases || []);
    } catch (err) {
      setError(err.message || "Failed to load email aliases");
      console.error("Load aliases error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmail = async () => {
    setError("");
    setSuccess("");

    if (!newEmail.trim()) {
      setError("Please enter an email address");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim())) {
      setError("Please enter a valid email address");
      return;
    }

    setAddingEmail(true);
    try {
      const res = await fetch(urlJoin(API_BASE, "/users/me/email-aliases/"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ email: newEmail.trim().toLowerCase() }),
      });

      const text = await res.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

      if (!res.ok) {
        throw new Error(data.error || data.message || `Failed to add email (${res.status})`);
      }

      setSuccess(`Verification code sent to ${newEmail.trim()}`);
      setVerifyingEmail(newEmail.trim().toLowerCase());
      setOpenAddDialog(false);
      setNewEmail("");
      setOpenVerifyDialog(true);
    } catch (err) {
      setError(err.message || "Failed to add email alias");
      console.error("Add email error:", err);
    } finally {
      setAddingEmail(false);
    }
  };

  const handleVerifyEmail = async () => {
    setError("");
    setSuccess("");

    if (!otpCode.trim()) {
      setError("Please enter the verification code");
      return;
    }

    setVerifyingOtp(true);
    try {
      const res = await fetch(urlJoin(API_BASE, "/users/me/email-aliases/verify/"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          email: verifyingEmail,
          otp_code: otpCode.trim(),
        }),
      });

      const text = await res.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

      if (!res.ok) {
        throw new Error(data.error || data.message || `Failed to verify email (${res.status})`);
      }

      setSuccess(
        `Email verified! ${data.events_merged || 0} event(s) merged into your account.`
      );
      setOpenVerifyDialog(false);
      setOtpCode("");
      setVerifyingEmail("");
      loadAliases();
    } catch (err) {
      setError(err.message || "Failed to verify email");
      console.error("Verify email error:", err);
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleRemoveAlias = async (aliasId, aliasEmail) => {
    if (!confirm(`Remove ${aliasEmail} from your account?`)) {
      return;
    }

    try {
      const res = await fetch(urlJoin(API_BASE, `/users/me/email-aliases/${aliasId}/`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) {
        throw new Error(`Failed to remove email (${res.status})`);
      }

      setSuccess(`${aliasEmail} removed`);
      loadAliases();
    } catch (err) {
      setError(err.message || "Failed to remove email alias");
      console.error("Remove alias error:", err);
    }
  };

  return (
    <>
      <Card>
        <CardHeader title="Additional Email Addresses" />
        <CardContent>
          <Stack spacing={2}>
            {error && (
              <Alert severity="error" onClose={() => setError("")}>
                {error}
              </Alert>
            )}

            {success && (
              <Alert severity="success" onClose={() => setSuccess("")}>
                {success}
              </Alert>
            )}

            <Typography variant="body2" color="textSecondary">
              Add verified email addresses to your account. When you verify an email, all past
              event attendance history under that email will be automatically merged into your
              account.
            </Typography>

            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                <CircularProgress size={40} />
              </Box>
            ) : aliases.length === 0 ? (
              <Typography variant="body2" color="textSecondary" sx={{ py: 2 }}>
                No additional email addresses added yet.
              </Typography>
            ) : (
              <List>
                {aliases.map((alias) => (
                  <ListItem key={alias.id} sx={{ py: 1.5, border: "1px solid #eee", mb: 1, borderRadius: 1 }}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          {alias.email}
                          {alias.verified ? (
                            <Chip
                              icon={<CheckCircleIcon />}
                              label="Verified"
                              size="small"
                              color="success"
                              variant="outlined"
                            />
                          ) : (
                            <Chip
                              icon={<PendingIcon />}
                              label="Pending"
                              size="small"
                              color="warning"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        alias.verified_at
                          ? `Verified on ${new Date(alias.verified_at).toLocaleDateString()}`
                          : `Added on ${new Date(alias.added_at).toLocaleDateString()}`
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        aria-label="delete"
                        onClick={() => handleRemoveAlias(alias.id, alias.email)}
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}

            <Button
              variant="outlined"
              fullWidth
              onClick={() => setOpenAddDialog(true)}
              disabled={loading}
            >
              + Add Email Address
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Add Email Dialog */}
      <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add Email Address</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 2 }}>
            <Typography variant="body2" color="textSecondary">
              Enter an additional email address to link with your account. We'll send a verification
              code to confirm ownership.
            </Typography>

            <TextField
              label="Email Address"
              type="email"
              fullWidth
              size="small"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              disabled={addingEmail}
              autoFocus
            />

            <Stack direction="row" spacing={1}>
              <Button
                variant="text"
                fullWidth
                onClick={() => setOpenAddDialog(false)}
                disabled={addingEmail}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                fullWidth
                onClick={handleAddEmail}
                disabled={addingEmail || !newEmail.trim()}
              >
                {addingEmail ? <CircularProgress size={20} /> : "Send Code"}
              </Button>
            </Stack>
          </Stack>
        </DialogContent>
      </Dialog>

      {/* Verify Email Dialog */}
      <Dialog open={openVerifyDialog} onClose={() => setOpenVerifyDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Verify Email Address</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 2 }}>
            <Typography variant="body2" color="textSecondary">
              A verification code has been sent to <strong>{verifyingEmail}</strong>. Enter it
              below to confirm your email.
            </Typography>

            <TextField
              label="Verification Code"
              placeholder="Enter 6-digit code"
              inputProps={{ maxLength: 6, style: { textAlign: "center", letterSpacing: "0.25em", fontSize: "1.5em" } }}
              fullWidth
              size="small"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
              disabled={verifyingOtp}
              autoFocus
            />

            <Typography variant="caption" color="textSecondary">
              This code expires in 10 minutes.
            </Typography>

            <Stack direction="row" spacing={1}>
              <Button
                variant="text"
                fullWidth
                onClick={() => setOpenVerifyDialog(false)}
                disabled={verifyingOtp}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                fullWidth
                onClick={handleVerifyEmail}
                disabled={verifyingOtp || otpCode.length !== 6}
              >
                {verifyingOtp ? <CircularProgress size={20} /> : "Verify Code"}
              </Button>
            </Stack>
          </Stack>
        </DialogContent>
      </Dialog>
    </>
  );
}
