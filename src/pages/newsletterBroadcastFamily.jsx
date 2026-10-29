// A/B variants and translations of an Email Broadcast. Each is a copy of the
// broadcast's email in Mautic, sent only as part of the broadcast's own send:
// Mautic splits the audience between the main version and its variants by
// share, and a translation replaces the main version for contacts whose
// preferred locale matches. Changes are allowed while the broadcast is a
// draft; after the send this shows the results per version.

import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  MenuItem,
  Paper,
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
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";

import {
  createNewsletterCampaignTranslation,
  createNewsletterCampaignVariant,
  deleteNewsletterCampaignVersion,
  getNewsletterCampaignFamily,
  updateNewsletterCampaignAbTest,
} from "../services/newsletterService";
import { WINNER_CRITERIA, suggestedWeight, validateLanguage, validateWeight } from "./newsletterTemplateFamily.jsx";

const NAVY = "#1B2A4A";

export const broadcastVersionPath = (campaignId, emailId) =>
  `/admin/newsletter/${encodeURIComponent(campaignId)}/versions/${encodeURIComponent(emailId)}`;

const errorMessage = (err, fallback) => err?.response?.data?.detail || err?.response?.data?.error || err?.message || fallback;
const rate = (count, percent, sent) => (sent ? `${count} (${percent}%)` : "-");

function FormDialog({ open, title, onClose, onSubmit, busy, error, submitLabel, submitColor = "primary", children }) {
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
        <Button variant="contained" color={submitColor} onClick={onSubmit} disabled={busy}
          startIcon={busy ? <CircularProgress size={16} color="inherit" /> : null}>
          {submitLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/**
 * The "A/B Test & Translations" section of a saved broadcast.
 * `blockedReason` (e.g. unsaved changes) disables adding versions.
 */
export default function BroadcastFamilySection({ campaignId, blockedReason = "", initialNotice = "" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [state, setState] = useState({ loading: true, family: null, error: "" });
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState("");
  const [notice, setNotice] = useState(initialNotice);

  const load = useCallback(() => {
    let active = true;
    setState((current) => ({ ...current, loading: true, error: "" }));
    getNewsletterCampaignFamily(campaignId)
      .then((family) => active && setState({ loading: false, family, error: "" }))
      .catch((err) => active && setState({ loading: false, family: null, error: errorMessage(err, "Variants and translations could not be loaded from Mautic.") }));
    return () => {
      active = false;
    };
  }, [campaignId]);

  useEffect(() => load(), [load]);

  // Shown once: drop the message carried here so a reload does not repeat it.
  useEffect(() => {
    if (location.state?.flash) navigate(`${location.pathname}${location.search}`, { replace: true, state: {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const family = state.family;
  const test = family?.abTest;
  const editable = Boolean(family?.editable);
  const canAdd = editable && !blockedReason;
  const lockedCriteria = test?.versions?.some((v) => !v.isMain) ? test.criteria : "";

  const open = (kind, values = {}) => {
    setDialog(kind);
    setDialogError("");
    setForm(values);
  };
  const close = () => !busy && setDialog(null);

  const run = async (action, after) => {
    setBusy(true);
    setDialogError("");
    try {
      const result = await action();
      setDialog(null);
      after(result);
    } catch (err) {
      setDialogError(errorMessage(err, "The change could not be saved."));
    } finally {
      setBusy(false);
    }
  };

  const addVariant = () => {
    const problem = validateWeight(form.weight);
    if (problem) return setDialogError(problem);
    return run(
      () => createNewsletterCampaignVariant(campaignId, { weight: Number(form.weight), winnerCriteria: form.winnerCriteria }),
      (created) => navigate(broadcastVersionPath(campaignId, created.id), {
        state: { flash: "Variant created as a copy of the broadcast. Change its subject or content." },
      })
    );
  };

  const addTranslation = () => {
    const problem = validateLanguage(form.language);
    if (problem) return setDialogError(problem);
    return run(
      () => createNewsletterCampaignTranslation(campaignId, { language: form.language.trim() }),
      (created) => navigate(broadcastVersionPath(campaignId, created.id), {
        state: { flash: `Translation (${created.language}) created as a copy of the broadcast. Translate its subject and content.` },
      })
    );
  };

  const saveTest = () => {
    if (form.mode === "weight") {
      const problem = validateWeight(form.value);
      if (problem) return setDialogError(problem);
    }
    const payload = form.mode === "weight" ? { emailId: form.emailId, weight: Number(form.value) } : { winnerCriteria: form.value };
    return run(() => updateNewsletterCampaignAbTest(campaignId, payload), (next) => {
      setState({ loading: false, family: next, error: "" });
      setNotice(form.mode === "weight" ? "Share saved." : "Winner criteria saved.");
    });
  };

  const remove = () =>
    run(() => deleteNewsletterCampaignVersion(campaignId, form.id), () => {
      setNotice(`"${form.name}" was removed.`);
      load();
    });

  const translations = family?.translations || [];
  const hasVariants = (family?.variants || []).length > 0;

  return (
    <Paper variant="outlined" component="section" aria-label="A/B Test & Translations"
      sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, borderColor: "#E7ECEF" }}>
      <Stack spacing={2}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1}>
          <Stack spacing={0.5}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: NAVY }}>A/B Test &amp; Translations</Typography>
            <Typography variant="body2" color="text.secondary">
              {editable
                ? "Send different versions of this broadcast, and versions in other languages. All of them go out with this broadcast's send."
                : "Versions are fixed once the broadcast is scheduled or sent."}
            </Typography>
          </Stack>
          {editable && (
            <Stack direction="row" spacing={1} sx={{ flexShrink: 0, "& .MuiButton-root": { whiteSpace: "nowrap" } }}>
              <Button size="small" variant="outlined" startIcon={<AddRoundedIcon />} disabled={!canAdd} sx={{ textTransform: "none" }}
                onClick={() => open("variant", { weight: String(suggestedWeight(test?.versions) || 1), winnerCriteria: lockedCriteria || WINNER_CRITERIA[0].value })}>
                Add Variant
              </Button>
              <Button size="small" variant="outlined" startIcon={<AddRoundedIcon />} disabled={!canAdd} sx={{ textTransform: "none" }}
                onClick={() => open("translation", { language: "" })}>
                Add Translation
              </Button>
            </Stack>
          )}
        </Stack>

        {editable && blockedReason && <Alert severity="info">{blockedReason}</Alert>}
        {notice && <Alert severity="success" onClose={() => setNotice("")}>{notice}</Alert>}
        {state.error && <Alert severity="warning" action={<Button color="inherit" size="small" onClick={load}>Retry</Button>}>{state.error}</Alert>}
        {state.loading && <Typography color="text.secondary">Loading versions…</Typography>}

        {family && !hasVariants && translations.length === 0 && !state.loading && (
          <Typography color="text.secondary">{editable ? "No variants or translations yet." : "This broadcast has no variants or translations."}</Typography>
        )}

        {test && (
          <Stack spacing={1}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: NAVY }}>
              {`A/B test · winner judged by ${test.criteriaLabel || "not set"}`}
            </Typography>
            <TableContainer>
              <Table size="small" aria-label="Broadcast versions">
                <TableHead>
                  <TableRow sx={{ "& th": { fontWeight: 800, color: NAVY, whiteSpace: "nowrap" } }}>
                    <TableCell>Version</TableCell>
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
                        {version.isMain ? (
                          <>{version.name} (main)</>
                        ) : (
                          <Link component={RouterLink} to={broadcastVersionPath(campaignId, version.id)}>{version.name}</Link>
                        )}
                        {version.isLeading && <Chip size="small" color="success" label="Leading" sx={{ ml: 1, fontWeight: 700 }} />}
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>{version.subject}</Typography>
                      </TableCell>
                      <TableCell>{`${version.weight}%`}</TableCell>
                      <TableCell>{version.sent}</TableCell>
                      <TableCell>{rate(version.opened, version.openRate, version.sent)}</TableCell>
                      <TableCell>{rate(version.clicked, version.clickRate, version.sent)}</TableCell>
                      <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                        {!version.isMain && editable && (
                          <>
                            <Button size="small" sx={{ textTransform: "none" }} aria-label={`Change share of ${version.name}`}
                              onClick={() => open("test", { mode: "weight", emailId: version.id, value: String(version.weight) })}>
                              Share
                            </Button>
                            <Button size="small" color="error" sx={{ textTransform: "none" }} aria-label={`Remove ${version.name}`}
                              onClick={() => open("remove", { id: version.id, name: version.name })}>
                              Remove
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between" alignItems={{ sm: "center" }}>
              <Typography variant="caption" color="text.secondary">
                Mautic splits the audience between these versions by share when the broadcast is sent; the results show here afterwards.
              </Typography>
              {editable && (
                <Button size="small" sx={{ textTransform: "none", flexShrink: 0 }}
                  onClick={() => open("test", { mode: "criteria", value: test.criteria || WINNER_CRITERIA[0].value })}>
                  Change criteria
                </Button>
              )}
            </Stack>
          </Stack>
        )}

        {translations.length > 0 && (
          <Stack spacing={1}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: NAVY }}>
              {`Translations · this broadcast is ${family.language || "en"}`}
            </Typography>
            <TableContainer>
              <Table size="small" aria-label="Broadcast translations">
                <TableHead>
                  <TableRow sx={{ "& th": { fontWeight: 800, color: NAVY } }}>
                    <TableCell>Language</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {translations.map((t) => (
                    <TableRow key={t.id} data-translation-id={t.id}>
                      <TableCell>{t.language}</TableCell>
                      <TableCell sx={{ wordBreak: "break-word" }}>
                        <Link component={RouterLink} to={broadcastVersionPath(campaignId, t.id)}>{t.name}</Link>
                      </TableCell>
                      <TableCell align="right">
                        {editable && (
                          <Button size="small" color="error" sx={{ textTransform: "none" }} aria-label={`Remove ${t.name}`}
                            onClick={() => open("remove", { id: t.id, name: t.name })}>
                            Remove
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Stack>
        )}

        {(hasVariants || translations.length > 0) && (
          <Alert severity="info" variant="outlined">
            Contacts whose preferred locale matches a translation get it instead of the main version.
            {hasVariants && translations.length > 0
              ? " Contacts given an A/B variant get that variant as it is, in its own language: translations only replace the main version."
              : ""}
          </Alert>
        )}
      </Stack>

      <FormDialog open={dialog === "variant"} title="Add A/B variant" onClose={close} onSubmit={addVariant} busy={busy} error={dialogError} submitLabel="Create Variant">
        <Typography variant="body2" color="text.secondary">
          The variant starts as a copy of this broadcast. When the broadcast is sent, Mautic sends it to this share of the audience;
          the main version gets the rest.
        </Typography>
        <TextField label="Share of the audience (%)" type="number" value={form.weight || ""} onChange={(e) => setForm({ ...form, weight: e.target.value })}
          slotProps={{ htmlInput: { min: 1, max: 100 } }} fullWidth />
        <TextField select label="Winner judged by" value={form.winnerCriteria || WINNER_CRITERIA[0].value} disabled={Boolean(lockedCriteria)}
          onChange={(e) => setForm({ ...form, winnerCriteria: e.target.value })} fullWidth
          helperText={lockedCriteria ? "Every variant of the test uses the test's criteria." : "Mautic shows which version leads after the send."}>
          {WINNER_CRITERIA.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
        </TextField>
      </FormDialog>

      <FormDialog open={dialog === "translation"} title="Add translation" onClose={close} onSubmit={addTranslation} busy={busy} error={dialogError} submitLabel="Create Translation">
        <Typography variant="body2" color="text.secondary">
          The translation starts as a copy of this broadcast. Contacts whose preferred locale matches get it instead of the main version.
        </Typography>
        <TextField label="Language" value={form.language || ""} onChange={(e) => setForm({ ...form, language: e.target.value })} placeholder="fr"
          helperText={`Locale code, e.g. fr, de or pt_BR. This broadcast is ${family?.language || "en"}.`} fullWidth />
      </FormDialog>

      <FormDialog open={dialog === "test"} title={form.mode === "weight" ? "Change share" : "Change winner criteria"} onClose={close}
        onSubmit={saveTest} busy={busy} error={dialogError} submitLabel="Save">
        {form.mode === "weight" ? (
          <TextField label="Share of the audience (%)" type="number" value={form.value || ""} onChange={(e) => setForm({ ...form, value: e.target.value })}
            slotProps={{ htmlInput: { min: 1, max: 100 } }} fullWidth />
        ) : (
          <TextField select label="Winner judged by" value={form.value || WINNER_CRITERIA[0].value} onChange={(e) => setForm({ ...form, value: e.target.value })} fullWidth>
            {WINNER_CRITERIA.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
          </TextField>
        )}
      </FormDialog>

      <FormDialog open={dialog === "remove"} title="Remove version" onClose={close} onSubmit={remove} busy={busy} error={dialogError}
        submitLabel="Remove" submitColor="error">
        <Typography>{`Remove "${form.name}" from this broadcast? It is deleted from Mautic.`}</Typography>
      </FormDialog>
    </Paper>
  );
}
