// A/B variants and translations of a landing page (LP3). A main page can
// have variants (Mautic splits visitors by weight and judges a winner by the
// test's criteria) and translations (visitors whose browser or contact
// language matches are redirected to /{language}/{alias}). Preference-center
// pages never get either. Every write runs as the admin's own Mautic user.

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
  createNewsletterPageTranslation,
  createNewsletterPageVariant,
  getNewsletterPageAbTest,
  makeNewsletterPageWinner,
  updateNewsletterPageAbTest,
} from "../services/newsletterService";
import { NAVY, TITLE_MAX_LENGTH, getErrorMessage, pageDetailsPath } from "./newsletterPageShared.jsx";

export const WINNER_CRITERIA = [
  { value: "page.dwelltime", label: "Time on page (longest wins)" },
  { value: "page.bouncerate", label: "Bounce rate (lowest wins)" },
  { value: "form.submissions", label: "Form submissions (most wins)" },
];

const LANGUAGE_PATTERN = /^[a-z]{2,3}(?:_[A-Z]{2})?$/;

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
  return LANGUAGE_PATTERN.test(String(value || "").trim()) ? "" : "Use a locale code such as fr or fr_CA.";
}

export const roleLabel = (page) =>
  page?.role === "variant" ? "A/B variant" : page?.role === "translation" ? `Translation (${page.language})` : "";

/** A chip naming a page's role in its family; nothing for a main page. */
export function PageRoleChip({ page }) {
  const label = roleLabel(page);
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

/** Adds a variant: a copy of the main page that starts unpublished. */
export function AddVariantDialog({ page, test, open, onClose, onCreated }) {
  const [form, setForm] = useState({ title: "", weight: "50", winnerCriteria: WINNER_CRITERIA[0].value });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lockedCriteria = test?.versions?.some((v) => !v.isMain) ? test.criteria : "";

  useEffect(() => {
    if (!open) return;
    setForm({
      title: page?.title ? `${page.title} (Variant)` : "",
      weight: String(suggestedWeight(test?.versions) || 1),
      winnerCriteria: lockedCriteria || WINNER_CRITERIA[0].value,
    });
    setError("");
  }, [open, page?.title, test, lockedCriteria]);

  const submit = async () => {
    const problem = validateWeight(form.weight);
    if (problem) return setError(problem);
    setBusy(true);
    setError("");
    try {
      const created = await createNewsletterPageVariant(page.id, {
        weight: Number(form.weight),
        winnerCriteria: form.winnerCriteria,
        ...(form.title.trim() ? { title: form.title.trim() } : {}),
      });
      onCreated(created, "Variant created (unpublished). Edit its content, then publish it to start the test.");
    } catch (err) {
      setError(getErrorMessage(err, "The variant could not be created."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormDialog open={open} title="Add A/B variant" onClose={onClose} onSubmit={submit} busy={busy} error={error} submitLabel="Create Variant">
      <Typography variant="body2" color="text.secondary">
        The variant starts as an unpublished copy of this page. Once published, Mautic sends this share of visitors to it from
        this page's address; the main page gets what the variants leave.
      </Typography>
      <TextField label="Variant title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} fullWidth
        slotProps={{ htmlInput: { maxLength: TITLE_MAX_LENGTH } }} />
      <TextField label="Traffic weight (%)" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} type="number"
        slotProps={{ htmlInput: { min: 1, max: 100 } }} fullWidth />
      <TextField select label="Winner judged by" value={form.winnerCriteria} onChange={(e) => setForm({ ...form, winnerCriteria: e.target.value })}
        disabled={Boolean(lockedCriteria)} helperText={lockedCriteria ? "Every variant of a test uses the test's criteria." : ""} fullWidth>
        {WINNER_CRITERIA.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
      </TextField>
    </FormDialog>
  );
}

/** Adds a translation: a copy of the main page in another language, unpublished. */
export function AddTranslationDialog({ page, open, onClose, onCreated }) {
  const [form, setForm] = useState({ language: "", title: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm({ language: "", title: "" });
    setError("");
  }, [open]);

  const submit = async () => {
    const problem = validateLanguage(form.language);
    if (problem) return setError(problem);
    setBusy(true);
    setError("");
    try {
      const created = await createNewsletterPageTranslation(page.id, {
        language: form.language.trim(),
        ...(form.title.trim() ? { title: form.title.trim() } : {}),
      });
      onCreated(created, `Translation (${created.language}) created (unpublished). Translate its content, then publish it.`);
    } catch (err) {
      setError(getErrorMessage(err, "The translation could not be created."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormDialog open={open} title="Add translation" onClose={onClose} onSubmit={submit} busy={busy} error={error} submitLabel="Create Translation">
      <Typography variant="body2" color="text.secondary">
        The translation starts as an unpublished copy of this page. Once published, visitors whose browser or contact
        language matches are sent to it from this page's address.
      </Typography>
      <TextField label="Language" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} placeholder="fr"
        helperText={`Locale code, e.g. fr, de or pt_BR. This page is ${page?.language || "en"}.`} fullWidth required />
      <TextField label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} fullWidth
        helperText="Optional. Defaults to this page's title with the language code." slotProps={{ htmlInput: { maxLength: TITLE_MAX_LENGTH } }} />
    </FormDialog>
  );
}

/** Changes one variant's weight, or the whole test's criteria. */
export function VariantSettingsDialog({ open, mode, pageId, current, onClose, onSaved }) {
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
      const test = await updateNewsletterPageAbTest(pageId, mode === "weight" ? { weight: Number(value) } : { winnerCriteria: value });
      onSaved(test, mode === "weight" ? "Variant weight saved. Mautic restarts the test's counts." : "Winner criteria saved for the whole test.");
    } catch (err) {
      setError(getErrorMessage(err, "The A/B test could not be changed."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormDialog open={open} title={mode === "weight" ? "Change traffic weight" : "Change winner criteria"} onClose={onClose}
      onSubmit={submit} busy={busy} error={error} submitLabel="Save">
      {mode === "weight" ? (
        <TextField label="Traffic weight (%)" value={value} onChange={(e) => setValue(e.target.value)} type="number"
          slotProps={{ htmlInput: { min: 1, max: 100 } }} helperText="Changing it restarts the test's counts in Mautic." fullWidth />
      ) : (
        <TextField select label="Winner judged by" value={value} onChange={(e) => setValue(e.target.value)} fullWidth>
          {WINNER_CRITERIA.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
        </TextField>
      )}
    </FormDialog>
  );
}

/** Confirms, then makes a variant the main page. */
export function WinnerDialog({ variant, mainTitle, open, onClose, onDone }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (open) setError("");
  }, [open]);

  const confirm = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await makeNewsletterPageWinner(variant.id);
      onDone(result, `"${variant.title}" is now the main page.`);
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
        <Box component="ul" sx={{ m: 0, pl: 2.5, color: "text.secondary" }}>
          <li><Typography variant="body2">{`"${variant?.title}" becomes the main page and takes over its address, so existing links keep working.`}</Typography></li>
          <li><Typography variant="body2">{`"${mainTitle}" and any other variants become unpublished variants of it; the test ends and its counts reset.`}</Typography></li>
          <li><Typography variant="body2">The page's translations move to the winner.</Typography></li>
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

const formatResult = (value, criteria) => {
  if (value === null || value === undefined) return "-";
  if (criteria === "page.bouncerate") return `${value}%`;
  if (criteria === "page.dwelltime") return `${value}s`;
  return String(value);
};

/**
 * The A/B test section of a main page (or a variant: it shows the same test).
 * `onNavigate(id, flash)` opens another page of the family.
 */
export function AbTestSection({ page, onNavigate, onChanged }) {
  const [state, setState] = useState({ loading: true, test: null, error: "" });
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [winner, setWinner] = useState(null);
  const [notice, setNotice] = useState("");
  const hasVariants = page.role === "variant" || Number(page.variantChildrenCount || 0) > 0;

  const load = useCallback(() => {
    if (!hasVariants) {
      setState({ loading: false, test: null, error: "" });
      return undefined;
    }
    let active = true;
    setState((current) => ({ ...current, loading: true, error: "" }));
    getNewsletterPageAbTest(page.id)
      .then((test) => active && setState({ loading: false, test, error: "" }))
      .catch((err) => active && setState({ loading: false, test: null, error: getErrorMessage(err, "The A/B test could not be loaded from Mautic.") }));
    return () => {
      active = false;
    };
  }, [page.id, hasVariants]);

  useEffect(() => load(), [load]);

  const test = state.test;
  const main = test?.versions?.find((v) => v.isMain);
  const canAdd = page.role === "main" && page.editable;

  return (
    <Stack spacing={1.5} data-testid="ab-test-section">
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1}>
        <Typography variant="body2" color="text.secondary">
          {test
            ? `Winner judged by: ${test.criteriaLabel}. ${test.running ? "The test is running." : "Publish a variant to start the test."}`
            : "Split visitors between versions of this page and let Mautic judge which works best."}
        </Typography>
        <Stack direction="row" spacing={1}>
          {test && page.editable && (
            <Button size="small" onClick={() => setEditing({ mode: "criteria", pageId: page.id, current: test.criteria })} sx={{ textTransform: "none" }}>
              Change criteria
            </Button>
          )}
          {canAdd && (
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
                <TableCell>Weight</TableCell>
                <TableCell>Visitors in test</TableCell>
                <TableCell>Result</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {test.versions.map((version) => (
                <TableRow key={version.id} data-version-id={version.id}>
                  <TableCell sx={{ wordBreak: "break-word" }}>
                    <Link component={RouterLink} to={pageDetailsPath(version.id)}>{version.title}</Link>
                    {version.isMain ? " (main)" : ""}
                    {version.isLeading && <Chip size="small" color="success" label="Leading" sx={{ ml: 1, fontWeight: 700 }} />}
                  </TableCell>
                  <TableCell>{version.isPublished ? "Published" : "Unpublished"}</TableCell>
                  <TableCell>{`${version.weight}%`}</TableCell>
                  <TableCell>{version.variantHits}</TableCell>
                  <TableCell>{formatResult(version.result, test.criteria)}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                    {!version.isMain && page.editable && (
                      <>
                        <Button size="small" onClick={() => setEditing({ mode: "weight", pageId: version.id, current: version.weight })} sx={{ textTransform: "none" }}>
                          Weight
                        </Button>
                        <Button size="small" color="success" onClick={() => setWinner(version)} sx={{ textTransform: "none" }}>
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
          Mautic restarts a test's counts whenever a published version is changed. Unpublished variants are not shown to visitors.
        </Typography>
      )}

      <AddVariantDialog page={page} test={test} open={adding} onClose={() => setAdding(false)}
        onCreated={(created, message) => {
          setAdding(false);
          onNavigate(created.id, message, true);
        }} />
      <VariantSettingsDialog open={Boolean(editing)} mode={editing?.mode} pageId={editing?.pageId} current={editing?.current}
        onClose={() => setEditing(null)}
        onSaved={(next, message) => {
          setEditing(null);
          setState({ loading: false, test: next, error: "" });
          if (onChanged) onChanged(message);
          else setNotice(message);
        }} />
      <WinnerDialog variant={winner} mainTitle={main?.title || page.title} open={Boolean(winner)} onClose={() => setWinner(null)}
        onDone={(result, message) => {
          setWinner(null);
          onNavigate(result.winner.id, message, false);
        }} />
    </Stack>
  );
}

/** The translations section of a main page. */
export function TranslationsSection({ page, onNavigate }) {
  const [adding, setAdding] = useState(false);
  const translations = Array.isArray(page.translations) ? page.translations : [];

  return (
    <Stack spacing={1.5} data-testid="translations-section">
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1}>
        <Typography variant="body2" color="text.secondary">
          {`This page is ${page.language || "en"}. Visitors whose browser or contact language matches a published translation are sent to it.`}
        </Typography>
        {page.editable && (
          <Button size="small" variant="outlined" startIcon={<AddRoundedIcon />} onClick={() => setAdding(true)} sx={{ textTransform: "none" }}>
            Add Translation
          </Button>
        )}
      </Stack>
      {translations.length === 0 ? (
        <Typography color="text.secondary">No translations yet.</Typography>
      ) : (
        <TableContainer>
          <Table size="small" aria-label="Translations">
            <TableHead>
              <TableRow sx={{ "& th": { fontWeight: 800, color: NAVY } }}>
                <TableCell>Language</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Status</TableCell>
                <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>Address</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {translations.map((t) => (
                <TableRow key={t.id} data-translation-id={t.id}>
                  <TableCell>{t.language}</TableCell>
                  <TableCell sx={{ wordBreak: "break-word" }}><Link component={RouterLink} to={pageDetailsPath(t.id)}>{t.title}</Link></TableCell>
                  <TableCell>{t.isPublished ? "Published" : "Unpublished"}</TableCell>
                  <TableCell sx={{ display: { xs: "none", md: "table-cell" }, wordBreak: "break-all" }}>{t.publicUrl || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <AddTranslationDialog page={page} open={adding} onClose={() => setAdding(false)}
        onCreated={(created, message) => {
          setAdding(false);
          onNavigate(created.id, message, true);
        }} />
    </Stack>
  );
}

/** For a variant or translation: what it belongs to and how visitors reach it. */
export function FamilyBanner({ page }) {
  if (page.role === "main" || !page.familyParent) return null;
  const parent = (
    <Link component={RouterLink} to={pageDetailsPath(page.familyParent.id)}>{page.familyParent.title || `Page #${page.familyParent.id}`}</Link>
  );
  return page.role === "variant" ? (
    <Alert severity="info" data-testid="family-banner">
      This is an A/B variant of {parent}
      {page.variantSettings ? ` with ${page.variantSettings.weight}% of traffic` : ""}. Visitors reach it only through the main page's address.
    </Alert>
  ) : (
    <Alert severity="info" data-testid="family-banner">
      This is the {page.language} translation of {parent}. Matching visitors are sent here from the main page; its own address is {page.publicUrl || "shown once Mautic's address is known"}.
    </Alert>
  );
}
