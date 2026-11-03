// A campaign's category, restart rule and publish window, saved on their own
// so the workflow is never part of the request.

import React, { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, CircularProgress, FormControlLabel, Skeleton, Stack, Switch, Typography } from "@mui/material";

import MauticCategoryPicker from "./MauticCategoryPicker.jsx";
import PublishWindowFields, { fromLocalInput, toLocalInput, windowProblem } from "./PublishWindowFields.jsx";
import { getNativeMauticCampaign, updateNativeMauticCampaignSettings } from "../../services/newsletterService";

const NAVY = "#1B2A4A";
const errorText = (err, fallback) => err?.response?.data?.detail || err?.message || fallback;

const toDraft = (campaign) => ({
  category: campaign?.category?.id ? Number(campaign.category.id) : null,
  allowRestart: Boolean(campaign?.allowRestart),
  publishUp: toLocalInput(campaign?.publishUp),
  publishDown: toLocalInput(campaign?.publishDown),
});

/** Only what changed, as the API takes it. */
export const settingsChanges = (draft, saved) => {
  const after = { category: draft.category || null, allowRestart: draft.allowRestart,
    publishUp: fromLocalInput(draft.publishUp), publishDown: fromLocalInput(draft.publishDown) };
  const before = { category: saved.category || null, allowRestart: saved.allowRestart,
    publishUp: fromLocalInput(saved.publishUp), publishDown: fromLocalInput(saved.publishDown) };
  return Object.fromEntries(Object.entries(after).filter(([key, value]) => value !== before[key]));
};

export default function CampaignSettingsPanel({ campaignId }) {
  const [state, setState] = useState({ loading: true, campaign: null, error: "" });
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState({ severity: "", text: "", errors: {} });

  useEffect(() => {
    let active = true;
    setState({ loading: true, campaign: null, error: "" });
    getNativeMauticCampaign(campaignId)
      .then((campaign) => {
        if (!active) return;
        setState({ loading: false, campaign, error: "" });
        setDraft(toDraft(campaign));
      })
      .catch((err) => active && setState({ loading: false, campaign: null, error: errorText(err, "The campaign settings could not be loaded.") }));
    return () => {
      active = false;
    };
  }, [campaignId]);

  const saved = useMemo(() => (state.campaign ? toDraft(state.campaign) : null), [state.campaign]);
  const changes = draft && saved ? settingsChanges(draft, saved) : {};
  const problem = draft ? windowProblem(draft.publishUp, draft.publishDown) : "";
  const update = (patch) => {
    setDraft((current) => ({ ...current, ...patch }));
    setMessage({ severity: "", text: "", errors: {} });
  };

  const save = async () => {
    setBusy(true);
    setMessage({ severity: "", text: "", errors: {} });
    try {
      const campaign = await updateNativeMauticCampaignSettings(campaignId, changes);
      setState({ loading: false, campaign, error: "" });
      setDraft(toDraft(campaign));
      setMessage({ severity: "success", text: "Settings saved.", errors: {} });
    } catch (err) {
      setMessage({ severity: "error", text: errorText(err, "The settings could not be saved."), errors: err?.response?.data?.errors || {} });
    } finally {
      setBusy(false);
    }
  };

  if (state.loading) return <Skeleton variant="rectangular" height={220} />;
  if (state.error) return <Alert severity="error">{state.error}</Alert>;

  const outside = state.campaign?.isPublished && draft.publishDown && new Date(draft.publishDown) < new Date();
  return (
    <Stack spacing={2.5} sx={{ maxWidth: 760 }} aria-label="Campaign settings">
      <Box>
        <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 850, color: NAVY }}>Campaign Settings</Typography>
        <Typography variant="body2" color="text.secondary">Saved on their own: the workflow is not changed.</Typography>
      </Box>
      {message.text && <Alert severity={message.severity}>{message.text}</Alert>}
      <MauticCategoryPicker bundle="campaign" value={draft.category} current={state.campaign?.category} disabled={busy}
        onChange={(category) => update({ category })} helperText="Manage categories under Administration → Categories." />
      <FormControlLabel
        control={<Switch checked={draft.allowRestart} onChange={(event) => update({ allowRestart: event.target.checked })} disabled={busy} />}
        label="Contacts can restart: a contact who left or finished can go through this campaign again"
      />
      <PublishWindowFields start={draft.publishUp} end={draft.publishDown} disabled={busy} errors={message.errors}
        onChange={({ start, end }) => update({ publishUp: start, publishDown: end })}
        startHelp="The published campaign runs from then on. Your local time." endHelp="After this the campaign stops running. Your local time." />
      {outside && <Alert severity="warning">The unpublish date has passed, so this published campaign does not run.</Alert>}
      <Box>
        <Button variant="contained" onClick={save} disabled={busy || Boolean(problem) || !Object.keys(changes).length}
          startIcon={busy ? <CircularProgress size={16} color="inherit" /> : null}>
          Save Settings
        </Button>
      </Box>
    </Stack>
  );
}
