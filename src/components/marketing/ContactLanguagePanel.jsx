import React, { useEffect, useState } from "react";
import { Alert, Autocomplete, Box, Button, CircularProgress, Paper, Stack, TextField, Typography } from "@mui/material";
import TranslateRoundedIcon from "@mui/icons-material/TranslateRounded";

import { listNewsletterFieldChoices, updateNewsletterAdminContact } from "../../services/newsletterService";

const errorMessage = (err, fallback) => err?.response?.data?.detail || err?.response?.data?.error || err?.message || fallback;

/** What Mautic does with a locale when it sends a translated template. */
export const describeLocale = (locale, label) =>
  locale
    ? `Translated templates go out in ${label || locale}: an exact ${locale} version first, otherwise any ${locale.slice(0, 2)} version, otherwise the main template.`
    : "No preferred locale: this contact always gets a template's main version.";

/**
 * The contact's Preferred locale, the Mautic field that decides which
 * translation of a template they receive.
 */
export default function ContactLanguagePanel({ mauticContactId, locale = "", onSaved }) {
  const [choices, setChoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [value, setValue] = useState(locale || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => setValue(locale || ""), [locale]);

  useEffect(() => {
    let active = true;
    listNewsletterFieldChoices("locale")
      .then((data) => active && setChoices(Array.isArray(data?.results) ? data.results : []))
      .catch(() => active && setMessage({ severity: "warning", text: "Mautic's language list could not be loaded." }))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const labelOf = (code) => choices.find((choice) => choice.value === code)?.label || code;
  const selected = value ? { value, label: labelOf(value) } : null;

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const updated = await updateNewsletterAdminContact(mauticContactId, { preferred_locale: value });
      onSaved?.(updated);
      setMessage({ severity: "success", text: value ? "Preferred locale saved in Mautic." : "Preferred locale cleared in Mautic." });
    } catch (err) {
      setMessage({ severity: "error", text: errorMessage(err, "The preferred locale could not be saved.") });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Paper variant="outlined" role="region" aria-label="Language" sx={{ p: 2.5, borderRadius: 2, borderColor: "#E7ECEF" }}>
      <Stack spacing={1.75}>
        <Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <TranslateRoundedIcon fontSize="small" color="action" />
            <Typography variant="h6" sx={{ fontWeight: 850, color: "#1B2A4A" }}>Language</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {describeLocale(locale, locale ? labelOf(locale) : "")}
          </Typography>
        </Box>
        {message && <Alert severity={message.severity} onClose={() => setMessage(null)}>{message.text}</Alert>}
        <Autocomplete
          size="small"
          options={choices}
          loading={loading}
          value={selected}
          onChange={(_, option) => setValue(option?.value || "")}
          getOptionLabel={(option) => (option.label && option.label !== option.value ? `${option.label} (${option.value})` : option.value)}
          isOptionEqualToValue={(option, current) => option.value === current.value}
          disabled={saving}
          renderInput={(params) => <TextField {...params} label="Preferred locale" placeholder="Not set" />}
        />
        <Button
          variant="contained"
          size="small"
          onClick={save}
          disabled={saving || value === (locale || "")}
          sx={{ textTransform: "none", alignSelf: "flex-start" }}
        >
          {saving ? <CircularProgress size={18} color="inherit" /> : "Save Language"}
        </Button>
      </Stack>
    </Paper>
  );
}
