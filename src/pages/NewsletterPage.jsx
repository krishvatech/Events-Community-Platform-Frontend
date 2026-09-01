import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Divider,
  Paper,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import MarkEmailReadRoundedIcon from "@mui/icons-material/MarkEmailReadRounded";

import {
  getNewsletterPreferences,
  updateNewsletterPreferences,
} from "../services/newsletterService";

const normalizePreferences = (data) =>
  Array.isArray(data?.preferences) ? data.preferences : [];

const filterEmptyMessages = {
  all: "No newsletter subscriptions are currently available.",
  subscribed: "No subscribed newsletters.",
  unsubscribed: "No unsubscribed newsletters.",
};

export default function NewsletterPage() {
  const [preferences, setPreferences] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingSlugs, setSavingSlugs] = useState(() => new Set());
  const [snack, setSnack] = useState({ open: false, severity: "success", message: "" });

  const filteredPreferences = preferences.filter((preference) => {
    if (statusFilter === "subscribed") return preference.subscribed === true;
    if (statusFilter === "unsubscribed") return preference.subscribed === false;
    return true;
  });

  const loadPreferences = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getNewsletterPreferences();
      setPreferences(normalizePreferences(data));
    } catch (err) {
      console.error("Failed to load newsletter preferences:", err);
      setError("We could not load your newsletter preferences. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPreferences();
  }, []);

  const setSaving = (slug, saving) => {
    setSavingSlugs((current) => {
      const next = new Set(current);
      if (saving) next.add(slug);
      else next.delete(slug);
      return next;
    });
  };

  const handleToggle = async (preference, desiredValue) => {
    setSaving(preference.slug, true);
    setSnack({ open: false, severity: "success", message: "" });

    try {
      const data = await updateNewsletterPreferences([
        {
          slug: preference.slug,
          subscribed: desiredValue,
        },
      ]);
      setPreferences(normalizePreferences(data));
      setSnack({
        open: true,
        severity: "success",
        message: "Newsletter preference updated.",
      });
    } catch (err) {
      console.error("Failed to update newsletter preference:", err);
      setSnack({
        open: true,
        severity: "error",
        message: "We could not update that newsletter preference. Please try again.",
      });
    } finally {
      setSaving(preference.slug, false);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, md: 3 } }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: "#1B2A4A", mb: 0.75 }}>
            Newsletter
          </Typography>
          <Typography color="text.secondary">
            Choose the newsletters you would like to receive.
          </Typography>
        </Box>

        <Paper
          variant="outlined"
          sx={{
            borderRadius: 2,
            borderColor: "#F0EEEB",
            overflow: "hidden",
            bgcolor: "#ffffff",
          }}
        >
          <Box
            sx={{
              px: { xs: 2, md: 3 },
              py: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1.25,
              flexDirection: { xs: "column", sm: "row" },
              borderBottom: "1px solid #F0EEEB",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, width: { xs: "100%", sm: "auto" } }}>
              <MarkEmailReadRoundedIcon sx={{ color: "#E8532F" }} />
              <Typography variant="h6" sx={{ fontWeight: 700, color: "#2C3E5A" }}>
                My Subscriptions
              </Typography>
            </Box>
            <Tabs
              value={statusFilter}
              onChange={(_, value) => setStatusFilter(value)}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              sx={{
                minHeight: 40,
                maxWidth: { xs: "100%", sm: "auto" },
                "& .MuiTabs-scroller": { maxWidth: "100%" },
                "& .MuiTab-root": { textTransform: "none", minHeight: 40, px: 1.5 },
                "& .Mui-selected": { color: "#0ea5a4 !important", fontWeight: 700 },
                "& .MuiTabs-indicator": { backgroundColor: "#0ea5a4" },
              }}
            >
              <Tab label="All" value="all" />
              <Tab label="Subscribed" value="subscribed" />
              <Tab label="Unsubscribed" value="unsubscribed" />
            </Tabs>
          </Box>

          <Box sx={{ p: { xs: 2, md: 3 } }}>
            {loading ? (
              <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 220 }}>
                <CircularProgress />
              </Stack>
            ) : error ? (
              <Alert
                severity="error"
                action={
                  <Button
                    color="inherit"
                    size="small"
                    startIcon={<RefreshRoundedIcon />}
                    onClick={loadPreferences}
                  >
                    Retry
                  </Button>
                }
              >
                {error}
              </Alert>
            ) : filteredPreferences.length === 0 ? (
              <Alert severity="info" variant="outlined">
                {filterEmptyMessages[statusFilter]}
              </Alert>
            ) : (
              <Stack divider={<Divider flexItem />} spacing={0}>
                {filteredPreferences.map((preference) => {
                  const saving = savingSlugs.has(preference.slug);

                  return (
                    <Box
                      key={preference.slug}
                      sx={{
                        py: 2,
                        display: "flex",
                        gap: 2,
                        alignItems: { xs: "flex-start", sm: "center" },
                        justifyContent: "space-between",
                        flexDirection: { xs: "column", sm: "row" },
                      }}
                    >
                      <Box sx={{ minWidth: 0, pr: { sm: 2 } }}>
                        <Typography sx={{ fontWeight: 700, color: "#1B2A4A", overflowWrap: "anywhere" }}>
                          {preference.name}
                        </Typography>
                        {preference.description && (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mt: 0.5, overflowWrap: "anywhere" }}
                          >
                            {preference.description}
                          </Typography>
                        )}
                      </Box>

                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: { xs: "flex-start", sm: "flex-end" },
                          flexShrink: 0,
                          width: { xs: "100%", sm: "auto" },
                        }}
                      >
                        <Button
                          variant={preference.subscribed ? "outlined" : "contained"}
                          disabled={saving}
                          onClick={() => handleToggle(preference, !preference.subscribed)}
                          sx={{
                            textTransform: "none",
                            minWidth: 128,
                            borderRadius: 2,
                            ...(preference.subscribed
                              ? {}
                              : {
                                  backgroundColor: "#10b8a6",
                                  "&:hover": { backgroundColor: "#0ea5a4" },
                                }),
                          }}
                        >
                          {saving ? (
                            <CircularProgress size={18} color="inherit" />
                          ) : preference.subscribed ? (
                            "Unsubscribe"
                          ) : (
                            "Subscribe"
                          )}
                        </Button>
                      </Box>
                    </Box>
                  );
                })}
              </Stack>
            )}
          </Box>
        </Paper>
      </Stack>

      <Snackbar
        open={snack.open}
        autoHideDuration={3500}
        onClose={() => setSnack((current) => ({ ...current, open: false }))}
      >
        <Alert
          severity={snack.severity}
          variant="filled"
          onClose={() => setSnack((current) => ({ ...current, open: false }))}
          sx={{ width: "100%" }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
