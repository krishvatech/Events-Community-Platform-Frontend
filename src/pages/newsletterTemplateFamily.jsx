// A/B variants and translations of an email template. A main template can
// have variants (Mautic gives each its share of sends and judges a winner by
// open or click-through rate) and translations (sent to contacts whose
// preferred locale matches). Ending a test copies the winner's content onto
// the main template, so Campaigns that send it carry on unchanged. Every
// write runs as the admin's own Mautic user.

import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import { Link as RouterLink } from "react-router-dom";

import {
  createNewsletterTemplateTranslation,
  createNewsletterTemplateVariant,
  getNewsletterTemplateAbTest,
  makeNewsletterTemplateWinner,
  updateNewsletterTemplate,
  updateNewsletterTemplateAbTest,
} from "../services/newsletterService";
import { NAVY, getErrorMessage, templateDetailsPath } from "./newsletterTemplateShared.jsx";

export const WINNER_CRITERIA = [
  { value: "email.openrate", label: "Open rate (highest wins)" },
  { value: "email.clickthrough", label: "Click-through rate (highest wins)" },
];

// Two-letter languages only: Mautic matches a contact's locale by its first
// two letters, so longer codes (fil_PH) would never reach anyone.
const LANGUAGE_PATTERN = /^[a-z]{2}(?:_[A-Z]{2})?$/;
const NAME_MAX_LENGTH = 190;

/** The weight a new variant can take: what the other variants leave, at most 50. */
export function suggestedWeight(versions = []) {
  const used = versions.filter((v) => !v.isMain).reduce((sum, v) => sum + Number(v.weight || 0), 0);
  return Math.max(0, Math.min(50, 100 - used));
}

export function validateWeight(value) {
  const text = String(value ?? "").trim();
  if (!/^\d+$/.test(text) || Number(text) < 1 || Number(text) > 100) return "Weight must be a whole number from 1 to 100.";
  return "";
}

export function validateLanguage(value) {
  return LANGUAGE_PATTERN.test(String(value || "").trim()) ? "" : "Use a locale code such as fr, de or pt_BR.";
}

export const roleLabel = (template) =>
  template?.role === "variant" ? "A/B variant" : template?.role === "translation" ? `Translation (${template.language})` : "";

/** A chip naming a template's role in its family; nothing for a main template. */
export function TemplateRoleChip({ template }) {
  const label = roleLabel(template);
  return label ? <Chip size="small" variant="outlined" color="secondary" label={label} sx={{ fontWeight: 700 }} /> : null;
}

function FormDialog({ open, title, onClose, onSubmit, busy, error, submitLabel, children }) {
  return (
    <Dialog open={open} onClose={() => !busy && onClose()} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {children}
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="contained" onClick={onSubmit} disabled={busy} startIcon={busy ? <CircularProgress size={16} color="inherit" /> : null}>
          {submitLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** Adds a variant: a copy of the main template that starts unpublished. */
export function AddVariantDialog({ template, test, open, onClose, onCreated }) {
  const [form, setForm] = useState({ name: "", weight: "50", winnerCriteria: WINNER_CRITERIA[0].value });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lockedCriteria = test?.versions?.some((v) => !v.isMain && v.isPublished) ? test.criteria : "";

  useEffect(() => {
    if (!open) return;
    setForm({
      name: template?.name ? `${template.name} (Variant)` : "",
      weight: String(suggestedWeight(test?.versions) || 1),
      winnerCriteria: lockedCriteria || WINNER_CRITERIA[0].value,
    });
    setError("");
  }, [open, template?.name, test, lockedCriteria]);

  const submit = async () => {
    const problem = validateWeight(form.weight);
    if (problem) return setError(problem);
    setBusy(true);
    setError("");
    try {
      const created = await createNewsletterTemplateVariant(template.id, {
        weight: Number(form.weight),
        winnerCriteria: form.winnerCriteria,
        ...(form.name.trim() ? { name: form.name.trim() } : {}),
      });
      onCreated(created, "Variant created (unpublished). Change its subject or content, then publish it to start the test.");
    } catch (err) {
      setError(getErrorMessage(err, "The variant could not be created."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormDialog open={open} title="Add A/B variant" onClose={onClose} onSubmit={submit} busy={busy} error={error} submitLabel="Create Variant">
      <Typography variant="body2" color="text.secondary">
        The variant starts as an unpublished copy of this template. Once published, Mautic sends it to this share of the
        contacts the template is sent to; the main template gets what the variants leave.
      </Typography>
      <TextField label="Variant name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} fullWidth
        slotProps={{ htmlInput: { maxLength: NAME_MAX_LENGTH } }} />
      <TextField label="Share of sends (%)" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} type="number"
        slotProps={{ htmlInput: { min: 1, max: 100 } }} fullWidth />
      <TextField select label="Winner judged by" value={form.winnerCriteria} onChange={(e) => setForm({ ...form, winnerCriteria: e.target.value })}
        disabled={Boolean(lockedCriteria)} helperText={lockedCriteria ? "Every variant of a running test uses the test's criteria." : ""} fullWidth>
        {WINNER_CRITERIA.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
      </TextField>
    </FormDialog>
  );
}

/** Adds a translation: a copy of the main template in another language, unpublished. */
export function AddTranslationDialog({ template, open, onClose, onCreated }) {
  const [form, setForm] = useState({ language: "", name: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm({ language: "", name: "" });
    setError("");
  }, [open]);

  const submit = async () => {
    const problem = validateLanguage(form.language);
    if (problem) return setError(problem);
    setBusy(true);
    setError("");
    try {
      const created = await createNewsletterTemplateTranslation(template.id, {
        language: form.language.trim(),
        ...(form.name.trim() ? { name: form.name.trim() } : {}),
      });
      onCreated(created, `Translation (${created.language}) created (unpublished). Translate its subject and content, then publish it.`);
    } catch (err) {
      setError(getErrorMessage(err, "The translation could not be created."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormDialog open={open} title="Add translation" onClose={onClose} onSubmit={submit} busy={busy} error={error} submitLabel="Create Translation">
      <Typography variant="body2" color="text.secondary">
        The translation starts as an unpublished copy of this template. Once published, contacts whose preferred locale
        matches its language get it instead of the main template.
      </Typography>
      <TextField label="Language" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} placeholder="fr"
        helperText={`Locale code, e.g. fr, de or pt_BR. This template is ${template?.language || "en"}.`} fullWidth required />
      <TextField label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} fullWidth
        helperText="Optional. Defaults to this template's name with the language code." slotProps={{ htmlInput: { maxLength: NAME_MAX_LENGTH } }} />
    </FormDialog>
  );
}

/** Changes a template's own language. */
export function LanguageDialog({ template, open, onClose, onSaved }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setValue(template?.language || "");
    setError("");
  }, [open, template?.language]);

  const submit = async () => {
    const problem = validateLanguage(value);
    if (problem) return setError(problem);
    setBusy(true);
    setError("");
    try {
      onSaved(await updateNewsletterTemplate(template.id, { language: value.trim() }), "Language saved.");
    } catch (err) {
      setError(getErrorMessage(err, "The language could not be changed."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormDialog open={open} title="Change language" onClose={onClose} onSubmit={submit} busy={busy} error={error} submitLabel="Save">
      <TextField label="Language" value={value} onChange={(e) => setValue(e.target.value)} helperText="Locale code, e.g. en, fr or pt_BR." fullWidth />
    </FormDialog>
  );
}

/** Changes one variant's weight, or the whole test's criteria. */
export function VariantSettingsDialog({ open, mode, templateId, current, onClose, onSaved }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setValue(String(current ?? ""));
    setError("");
  }, [open, current]);

  const submit = async () => {
    if (mode === "weight") {
      const problem = validateWeight(value);
      if (problem) return setError(problem);
    }
    setBusy(true);
    setError("");
    try {
      const test = await updateNewsletterTemplateAbTest(templateId, mode === "weight" ? { weight: Number(value) } : { winnerCriteria: value });
      onSaved(test, mode === "weight" ? "Share saved. Mautic restarts the test's counts." : "Winner criteria saved for the whole test.");
    } catch (err) {
      setError(getErrorMessage(err, "The A/B test could not be changed."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormDialog open={open} title={mode === "weight" ? "Change share of sends" : "Change winner criteria"} onClose={onClose}
      onSubmit={submit} busy={busy} error={error} submitLabel="Save">
      {mode === "weight" ? (
        <TextField label="Share of sends (%)" value={value} onChange={(e) => setValue(e.target.value)} type="number"
          slotProps={{ htmlInput: { min: 1, max: 100 } }} helperText="Changing it restarts the test's counts in Mautic." fullWidth />
      ) : (
        <TextField select label="Winner judged by" value={value} onChange={(e) => setValue(e.target.value)} fullWidth>
          {WINNER_CRITERIA.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
        </TextField>
      )}
    </FormDialog>
  );
}

/** Confirms, then ends the test with this variant as the winner. */
export function WinnerDialog({ variant, mainName, open, onClose, onDone }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (open) setError("");
  }, [open]);

  const confirm = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await makeNewsletterTemplateWinner(variant.id);
      onDone(result, `"${variant.name}" won. Its content is now the main template's.`);
    } catch (err) {
      setError(getErrorMessage(err, "The winner could not be set."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => !busy && onClose()} maxWidth="sm" fullWidth>
      <DialogTitle>Make this variant the winner?</DialogTitle>
      <DialogContent>
        <Box component="ul" sx={{ m: 0, pl: 2.5, color: "text.secondary", listStyleType: "disc" }}>
          <li><Typography variant="body2">{`"${variant?.name}"'s subject, sender and content are copied onto "${mainName}", which keeps its ID, so Campaigns sending it carry on unchanged.`}</Typography></li>
          <li><Typography variant="body2">Every variant is switched off (unpublished, 0%) and the test ends.</Typography></li>
          <li><Typography variant="body2">Translations are not changed; update them to match if needed.</Typography></li>
        </Box>
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="contained" color="success" onClick={confirm} disabled={busy}
          startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <EmojiEventsRoundedIcon />}>
          Make Winner
        </Button>
      </DialogActions>
    </Dialog>
  );
}

const rate = (count, percent, sent) => (sent ? `${count} (${percent}%)` : "-");

/**
 * The A/B test section of a main template (or a variant: it shows the same
 * test). `onNavigate(id, flash)` opens another template of the family.
 */
export function AbTestSection({ template, onNavigate, onChanged }) {
  const [state, setState] = useState({ loading: true, test: null, error: "" });
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [winner, setWinner] = useState(null);
  const [notice, setNotice] = useState("");
  const hasVariants = template.role === "variant" || (template.variants || []).length > 0;

  const load = useCallback(() => {
    if (!hasVariants) {
      setState({ loading: false, test: null, error: "" });
      return undefined;
    }
    let active = true;
    setState((current) => ({ ...current, loading: true, error: "" }));
    getNewsletterTemplateAbTest(template.id)
      .then((test) => active && setState({ loading: false, test: Array.isArray(test?.versions) ? test : null, error: "" }))
      .catch((err) => active && setState({ loading: false, test: null, error: getErrorMessage(err, "The A/B test could not be loaded from Mautic.") }));
    return () => {
      active = false;
    };
  }, [template.id, hasVariants]);

  useEffect(() => load(), [load]);

  const test = state.test;
  const main = test?.versions?.find((v) => v.isMain);

  return (
    <Stack spacing={1.5} data-testid="ab-test-section">
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1}>
        <Typography variant="body2" color="text.secondary">
          {test
            ? `Winner judged by: ${test.criteriaLabel || "not set"}. ${test.running ? "The test is running." : "Publish a variant to start the test."}`
            : "Send different versions of this template and let Mautic judge which gets more opens or clicks."}
        </Typography>
        <Stack direction="row" spacing={1}>
          {test?.criteria && (
            <Button size="small" onClick={() => setEditing({ mode: "criteria", templateId: template.id, current: test.criteria })} sx={{ textTransform: "none" }}>
              Change criteria
            </Button>
          )}
          {template.role === "main" && (
            <Button size="small" variant="outlined" startIcon={<AddRoundedIcon />} onClick={() => setAdding(true)} sx={{ textTransform: "none" }}>
              Add Variant
            </Button>
          )}
        </Stack>
      </Stack>
      {notice && <Alert severity="success" onClose={() => setNotice("")}>{notice}</Alert>}
      {state.loading && hasVariants && <Typography color="text.secondary">Loading A/B test…</Typography>}
      {state.error && <Alert severity="warning">{state.error}</Alert>}
      {test?.mixedCriteria && <Alert severity="warning">The variants use different winner criteria, so Mautic cannot judge a winner. Change the criteria to fix it.</Alert>}
      {test && (
        <TableContainer>
          <Table size="small" aria-label="A/B test versions">
            <TableHead>
              <TableRow sx={{ "& th": { fontWeight: 800, color: NAVY, whiteSpace: "nowrap" } }}>
                <TableCell>Version</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Share</TableCell>
                <TableCell>Sent</TableCell>
                <TableCell>Opened</TableCell>
                <TableCell>Clicked</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {test.versions.map((version) => (
                <TableRow key={version.id} data-version-id={version.id}>
                  <TableCell sx={{ wordBreak: "break-word" }}>
                    <Link component={RouterLink} to={templateDetailsPath(version.id)}>{version.name}</Link>
                    {version.isMain ? " (main)" : ""}
                    {version.isLeading && <Chip size="small" color="success" label="Leading" sx={{ ml: 1, fontWeight: 700 }} />}
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>{version.subject}</Typography>
                  </TableCell>
                  <TableCell>{version.isPublished ? "Published" : "Off"}</TableCell>
                  <TableCell>{`${version.weight}%`}</TableCell>
                  <TableCell>{version.sent}</TableCell>
                  <TableCell>{rate(version.opened, version.openRate, version.sent)}</TableCell>
                  <TableCell>{rate(version.clicked, version.clickRate, version.sent)}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                    {!version.isMain && (
                      <>
                        <Button size="small" onClick={() => setEditing({ mode: "weight", templateId: version.id, current: version.weight })} sx={{ textTransform: "none" }}
                          aria-label={`Change share of ${version.name}`}>
                          Share
                        </Button>
                        <Button size="small" color="success" onClick={() => setWinner(version)} sx={{ textTransform: "none" }}
                          aria-label={`Make ${version.name} the winner`} disabled={!version.isPublished}>
                          Make winner
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {test && (
        <Typography variant="caption" color="text.secondary">
          Counts are since the test started{test.startedAt ? "" : " (it has not started yet)"}. Mautic restarts them whenever a published version
          is changed. Mautic never picks the winner by itself: choose it here when the results are clear.
        </Typography>
      )}

      <AddVariantDialog template={template} test={test} open={adding} onClose={() => setAdding(false)}
        onCreated={(created, message) => {
          setAdding(false);
          onNavigate(created.id, message);
        }} />
      {editing && (
        <VariantSettingsDialog open mode={editing.mode} templateId={editing.templateId} current={editing.current}
          onClose={() => setEditing(null)}
          onSaved={(next, message) => {
            setEditing(null);
            setState({ loading: false, test: Array.isArray(next?.versions) ? next : null, error: "" });
            if (onChanged) onChanged(message);
            else setNotice(message);
          }} />
      )}
      <WinnerDialog variant={winner} mainName={main?.name || template.name} open={Boolean(winner)} onClose={() => setWinner(null)}
        onDone={(result, message) => {
          setWinner(null);
          onNavigate(result.template.id, message);
        }} />
    </Stack>
  );
}

/** The translations section of a main template. */
export function TranslationsSection({ template, onNavigate, onChanged }) {
  const [adding, setAdding] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const translations = Array.isArray(template.translations) ? template.translations : [];

  return (
    <Stack spacing={1.5} data-testid="translations-section">
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1}>
        <Typography variant="body2" color="text.secondary">
          {`This template is ${template.language || "en"}. Contacts whose preferred locale matches a published translation get it instead.`}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button size="small" onClick={() => setLanguageOpen(true)} sx={{ textTransform: "none" }}>Change language</Button>
          <Button size="small" variant="outlined" startIcon={<AddRoundedIcon />} onClick={() => setAdding(true)} sx={{ textTransform: "none" }}>
            Add Translation
          </Button>
        </Stack>
      </Stack>
      {translations.length === 0 ? (
        <Typography color="text.secondary">No translations yet.</Typography>
      ) : (
        <TableContainer>
          <Table size="small" aria-label="Translations">
            <TableHead>
              <TableRow sx={{ "& th": { fontWeight: 800, color: NAVY } }}>
                <TableCell>Language</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {translations.map((t) => (
                <TableRow key={t.id} data-translation-id={t.id}>
                  <TableCell>{t.language}</TableCell>
                  <TableCell sx={{ wordBreak: "break-word" }}><Link component={RouterLink} to={templateDetailsPath(t.id)}>{t.name}</Link></TableCell>
                  <TableCell>{t.isPublished ? "Published" : "Unpublished"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <Typography variant="caption" color="text.secondary">
        Mautic matches the contact&apos;s Preferred locale field (fr_FR gets fr if there is no fr_FR version). Contacts without a matching
        locale get the main template.
      </Typography>
      <AddTranslationDialog template={template} open={adding} onClose={() => setAdding(false)}
        onCreated={(created, message) => {
          setAdding(false);
          onNavigate(created.id, message);
        }} />
      <LanguageDialog template={template} open={languageOpen} onClose={() => setLanguageOpen(false)}
        onSaved={(saved, message) => {
          setLanguageOpen(false);
          onChanged(saved, message);
        }} />
    </Stack>
  );
}

/** For a variant or translation: what it belongs to and who receives it. */
export function FamilyBanner({ template }) {
  const parentId = template.role === "variant" ? template.variantParentId : template.role === "translation" ? template.translationParentId : null;
  if (!parentId) return null;
  const parent = <Link component={RouterLink} to={templateDetailsPath(parentId)}>{`Template #${parentId}`}</Link>;
  return template.role === "variant" ? (
    <Alert severity="info" data-testid="family-banner">
      This is an A/B variant of {parent}. Contacts get it only as part of that template&apos;s sends, in the share the test gives it.
    </Alert>
  ) : (
    <Alert severity="info" data-testid="family-banner">
      This is the {template.language} translation of {parent}. Contacts whose preferred locale matches get it when that template is sent.
    </Alert>
  );
}
