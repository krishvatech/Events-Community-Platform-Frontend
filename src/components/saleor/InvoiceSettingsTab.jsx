import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import RestartAltOutlinedIcon from "@mui/icons-material/RestartAltOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import { apiClient } from "../../utils/api";

const ORANGE = "var(--imaa-dm-teal-text, var(--imaa-teal-hover))";
const TEXT = "var(--imaa-ink)";
const ENDPOINT = "/invoicing/admin/legal-entity/";

const EMPTY_SETTINGS = {
  id: null,
  code: "",
  name: "",
  legal_form: "",
  address: "",
  country: "CH",
  vat_id: "",
  currency: "USD",
  vat_exempt: true,
  bank_details: {
    account_name: "",
    bank_name: "",
    iban: "",
    swift: "",
    bic: "",
    account_number: "",
  },
};

const BANK_DETAIL_KEYS = [
  "account_name",
  "bank_name",
  "iban",
  "swift",
  "bic",
  "account_number",
];

function normalizeSettings(data = {}) {
  const bankDetails = data.bank_details && typeof data.bank_details === "object"
    ? data.bank_details
    : {};

  return {
    ...EMPTY_SETTINGS,
    ...data,
    country: String(data.country || "CH").toUpperCase(),
    currency: String(data.currency || "USD").toUpperCase(),
    vat_exempt: Boolean(data.vat_exempt),
    bank_details: BANK_DETAIL_KEYS.reduce(
      (result, key) => ({ ...result, [key]: bankDetails[key] || "" }),
      { ...EMPTY_SETTINGS.bank_details },
    ),
  };
}

function extractError(error, fallback) {
  const data = error?.response?.data;
  if (typeof data === "string") return data;
  if (data?.detail) return data.detail;
  if (data?.error) return data.error;
  if (data && typeof data === "object") {
    const messages = Object.entries(data).flatMap(([field, value]) => {
      const values = Array.isArray(value) ? value : [value];
      return values.map((message) => `${field}: ${message}`);
    });
    if (messages.length) return messages.join(" ");
  }
  return error?.message || fallback;
}

function SectionTitle({ icon, title, subtitle }) {
  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, mb: 2.5 }}>
      <Box
        sx={{
          width: 38,
          height: 38,
          borderRadius: "var(--imaa-radius-card)",
          bgcolor: "var(--imaa-teal-light)",
          color: ORANGE,
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography sx={{ color: TEXT, fontWeight: 800 }}>{title}</Typography>
        <Typography variant="body2" sx={{ color: "var(--imaa-dm-text-meta, #64748b)", mt: 0.25 }}>
          {subtitle}
        </Typography>
      </Box>
    </Box>
  );
}

export default function InvoiceSettingsTab() {
  const [settings, setSettings] = useState(EMPTY_SETTINGS);
  const [savedSettings, setSavedSettings] = useState(EMPTY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadSettings = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiClient.get(ENDPOINT);
      const normalized = normalizeSettings(response.data);
      setSettings(normalized);
      setSavedSettings(normalized);
    } catch (loadError) {
      setError(extractError(loadError, "Failed to load invoice settings."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const dirty = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(savedSettings),
    [settings, savedSettings],
  );

  const updateField = (field) => (event) => {
    const value = event.target.value;
    setSuccess("");
    setSettings((current) => ({ ...current, [field]: value }));
  };

  const updateUppercaseField = (field, maxLength) => (event) => {
    const value = event.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, maxLength);
    setSuccess("");
    setSettings((current) => ({ ...current, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        name: settings.name.trim(),
        legal_form: settings.legal_form.trim(),
        address: settings.address.trim(),
        country: settings.country.trim().toUpperCase(),
        currency: settings.currency.trim().toUpperCase(),
      };

      const response = await apiClient.patch(ENDPOINT, payload);
      const normalized = normalizeSettings(response.data);
      setSettings(normalized);
      setSavedSettings(normalized);
      setSuccess(
        "Invoice settings updated successfully. New invoice PDFs and PDFs explicitly regenerated later will use these details.",
      );
    } catch (saveError) {
      setError(extractError(saveError, "Failed to save invoice settings."));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(normalizeSettings(savedSettings));
    setError("");
    setSuccess("");
  };

  const invoiceFromLines = [
    settings.name,
    settings.legal_form && !settings.name.includes(settings.legal_form) ? settings.legal_form : "",
    ...String(settings.address || "").split("\n"),
  ].filter((line) => String(line || "").trim());

  if (loading) {
    return (
      <Box role="status" aria-live="polite" aria-label="Loading invoice settings" sx={{ minHeight: 360, display: "grid", placeItems: "center" }}>
        <Box sx={{ textAlign: "center" }}>
          <CircularProgress sx={{ color: ORANGE }} />
          <Typography sx={{ mt: 2, color: "var(--imaa-dm-text-meta, #64748b)" }}>Loading invoice settings…</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography component="h2" variant="h6" sx={{ fontFamily: "var(--imaa-font-serif)", color: TEXT, fontWeight: 800 }}>
          Invoice Settings
        </Typography>
        <Typography variant="body2" sx={{ color: "var(--imaa-dm-text-meta, #64748b)", mt: 0.5 }}>
          Manage the legal-entity information shown in the Invoice From section of invoice PDFs.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: "var(--imaa-radius-card)" }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 3, borderRadius: "var(--imaa-radius-card)" }} onClose={() => setSuccess("")}>
          {success}
        </Alert>
      )}
      <Alert severity="info" sx={{ mb: 3, borderRadius: "var(--imaa-radius-card)" }}>
        Existing PDF files are not changed automatically. These details are used when a new invoice PDF is generated or an invoice PDF is explicitly regenerated.
      </Alert>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.25fr) minmax(340px, 0.75fr)" },
          gap: 3,
          alignItems: "start",
        }}
      >
        <Box sx={{ display: "grid", gap: 3 }}>
          <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5, md: 3 }, borderRadius: "var(--imaa-radius-card)", borderColor: "var(--imaa-border)", minWidth: 0 }}>
            <SectionTitle
              icon={<ReceiptLongOutlinedIcon fontSize="small" />}
              title="Invoice From"
              subtitle="Company details displayed as the issuer on invoice PDFs."
            />

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
              <TextField
                label="Legal Entity Code"
                value={settings.code}
                disabled
                fullWidth
                helperText="Used in invoice numbering and cannot be edited here."
              />
              <TextField
                label="Company Name"
                value={settings.name}
                onChange={updateField("name")}
                required
                fullWidth
                inputProps={{ maxLength: 255 }}
              />
              <TextField
                label="Legal Form"
                value={settings.legal_form}
                onChange={updateField("legal_form")}
                required
                fullWidth
                inputProps={{ maxLength: 100 }}
              />
              <TextField
                label="Country Code"
                value={settings.country}
                onChange={updateUppercaseField("country", 2)}
                required
                fullWidth
                helperText="Two-letter ISO code, for example CH."
                inputProps={{ maxLength: 2 }}
              />
              <TextField
                label="Default Currency"
                value={settings.currency}
                onChange={updateUppercaseField("currency", 3)}
                required
                fullWidth
                helperText="Used as the legal entity default; existing order currency is unchanged."
                inputProps={{ maxLength: 3 }}
              />
              <TextField
                label="Address"
                value={settings.address}
                onChange={updateField("address")}
                required
                fullWidth
                multiline
                minRows={4}
                sx={{ gridColumn: { xs: "auto", md: "1 / -1" } }}
                helperText="Use one address line per row exactly as it should appear on the invoice."
              />
            </Box>
          </Paper>

          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1.5, flexWrap: "wrap", flexDirection: { xs: "column-reverse", sm: "row" } }}>
            <Button
              variant="outlined"
              startIcon={<RestartAltOutlinedIcon />}
              onClick={handleReset}
              disabled={!dirty || saving}
              sx={{
                borderRadius: "var(--imaa-radius-field)",
                textTransform: "none",
                fontWeight: 700,
                color: TEXT,
                // outline: unchanged in light mode; the stronger dark border (and hover) in dark mode
                borderColor: "var(--imaa-dm-border-strong, var(--imaa-border))",
                "&:hover": { borderColor: "var(--imaa-dm-text-hint, var(--imaa-border))" },
                minHeight: 44,
              }}
            >
              Reset Unsaved Changes
            </Button>
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveOutlinedIcon />}
              onClick={handleSave}
              disabled={saving || !dirty || !settings.name.trim() || !settings.legal_form.trim() || !settings.address.trim() || settings.country.length !== 2 || settings.currency.length !== 3}
              sx={{
                bgcolor: TEXT,
                borderRadius: "var(--imaa-radius-field)",
                textTransform: "none",
                fontWeight: 700,
                px: 3,
                minHeight: 44,
                // hover: unchanged in light mode; in dark mode the ink fill is light, so hover a shade dimmer
                "&:hover": { bgcolor: "var(--imaa-dm-text-2, #1a253a)" },
                // disabled: MUI's own light values; a muted fill, outline and readable label in dark mode
                "&.Mui-disabled": {
                  bgcolor: "var(--imaa-dm-muted, rgba(0, 0, 0, 0.12))",
                  color: "var(--imaa-dm-text-meta, rgba(0, 0, 0, 0.26))",
                  boxShadow: "inset 0 0 0 1px var(--imaa-dm-border-strong, transparent)",
                },
              }}
            >
              Save Invoice Settings
            </Button>
          </Box>
        </Box>

        <Paper
          variant="outlined"
          sx={{
            p: { xs: 2.5, md: 3 },
            borderRadius: "var(--imaa-radius-card)",
            borderColor: "var(--imaa-border)",
            position: { lg: "sticky" },
            top: { lg: 24 },
            overflow: "hidden",
            minWidth: 0,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
            <Box>
              <Typography sx={{ color: TEXT, fontWeight: 800 }}>Invoice Preview</Typography>
              <Typography variant="caption" sx={{ color: "var(--imaa-dm-text-meta, #64748b)" }}>Preview of editable issuer fields</Typography>
            </Box>
            <Typography variant="caption" sx={{ color: ORANGE, fontWeight: 800, letterSpacing: 0.7 }}>
              {settings.code || "ENTITY"}
            </Typography>
          </Box>

          <Box sx={{ border: "1px solid var(--imaa-dm-border, #dbe3ef)", borderRadius: 2, overflow: "hidden" }}>
            <Box sx={{ bgcolor: "var(--imaa-dm-surface-alt, #f8fafc)", px: 2, py: 1.4, borderBottom: "1px solid var(--imaa-dm-border, #dbe3ef)" }}>
              <Typography variant="subtitle2" sx={{ color: "var(--imaa-dm-blue-text, #0f2857)", fontWeight: 800 }}>
                Invoice From
              </Typography>
            </Box>
            <Box sx={{ p: 2, minHeight: 150 }}>
              {invoiceFromLines.length ? invoiceFromLines.map((line, index) => (
                <Typography key={`${line}-${index}`} variant="body2" sx={{ color: "var(--imaa-dm-text, #1f2937)", lineHeight: 1.55 }}>
                  {line}
                </Typography>
              )) : (
                <Typography variant="body2" sx={{ color: "var(--imaa-dm-text-hint, #94a3b8)" }}>Enter invoice issuer details.</Typography>
              )}
            </Box>
          </Box>

          <Box sx={{ mt: 2.5, p: 2, borderRadius: 2, bgcolor: "var(--imaa-dm-surface-alt, #f8fafc)", border: "1px solid var(--imaa-dm-border, #e2e8f0)" }}>
            <Typography variant="caption" sx={{ color: "var(--imaa-dm-text-meta, #64748b)", fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.8 }}>
              Invoice defaults
            </Typography>
            <Box sx={{ mt: 1.2, display: "flex", justifyContent: "space-between", gap: 2 }}>
              <Typography variant="body2" sx={{ color: "var(--imaa-dm-text-meta, #64748b)" }}>Currency</Typography>
              <Typography variant="body2" sx={{ color: TEXT, fontWeight: 800 }}>{settings.currency || "—"}</Typography>
            </Box>
          </Box>

        </Paper>
      </Box>
    </Box>
  );
}
