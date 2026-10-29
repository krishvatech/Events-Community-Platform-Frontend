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
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import AccountTreeRoundedIcon from "@mui/icons-material/AccountTreeRounded";

import {
  listNewsletterContactCampaigns,
  listNewsletterMauticCampaigns,
  runNewsletterContactBulkAction,
} from "../../services/newsletterService";

const errorMessage = (err, fallback) => err?.response?.data?.detail || err?.response?.data?.error || err?.message || fallback;

const formatDate = (value) => {
  const date = value ? new Date(String(value).replace(" ", "T")) : null;
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" })
    : "";
};

/**
 * The Campaigns a contact is in (published or not), with manual add and remove
 * as the admin's own Mautic user, like the native contact page.
 */
export default function ContactCampaignsPanel({ mauticContactId, contactName = "this contact" }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [choices, setChoices] = useState([]);
  const [addId, setAddId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [removing, setRemoving] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listNewsletterContactCampaigns(mauticContactId);
      setRows(Array.isArray(data?.results) ? data.results : []);
    } catch (err) {
      setRows([]);
      setError(errorMessage(err, "We could not load this contact's campaigns."));
    } finally {
      setLoading(false);
    }
  }, [mauticContactId]);

  useEffect(() => {
    load();
    let active = true;
    listNewsletterMauticCampaigns({ page: 1, page_size: 100 })
      .then((data) => active && setChoices(Array.isArray(data?.results) ? data.results : []))
      .catch(() => active && setChoices([]));
    return () => {
      active = false;
    };
  }, [load]);

  const change = async (action, campaignId, campaignName) => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await runNewsletterContactBulkAction({
        action,
        contact_ids: [String(mauticContactId)],
        campaign_id: String(campaignId),
      });
      const row = result?.results?.[0];
      if (row?.status === "updated") {
        setMessage({
          severity: "success",
          text: action === "campaign_add" ? `Added to ${campaignName}.` : `Removed from ${campaignName}.`,
        });
      } else {
        setMessage({ severity: row?.status === "failed" ? "error" : "info", text: row?.message || "Nothing changed." });
      }
      setAddId("");
      await load();
    } catch (err) {
      setMessage({ severity: "error", text: errorMessage(err, "The campaign change failed.") });
    } finally {
      setBusy(false);
      setRemoving(null);
    }
  };

  const memberIds = new Set(rows.map((row) => String(row.id)));
  const addable = choices.filter((campaign) => !memberIds.has(String(campaign.id)));
  const toAdd = addable.find((campaign) => String(campaign.id) === addId);

  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, borderColor: "#E7ECEF" }} role="region" aria-label="Campaigns">
      <Stack spacing={1.75}>
        <Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <AccountTreeRoundedIcon fontSize="small" color="action" />
            <Typography variant="h6" sx={{ fontWeight: 850, color: "#1B2A4A" }}>Campaigns</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Every Mautic campaign this contact is in, published or not.
          </Typography>
        </Box>

        {message && <Alert severity={message.severity} onClose={() => setMessage(null)}>{message.text}</Alert>}
        {error && (
          <Alert severity="error" action={<Button color="inherit" size="small" onClick={load}>Retry</Button>}>{error}</Alert>
        )}

        {loading ? (
          <Skeleton height={48} />
        ) : rows.length ? (
          <Stack spacing={1} component="ul" aria-label="Contact campaigns" sx={{ listStyle: "none", m: 0, p: 0 }}>
            {rows.map((row) => (
              <Stack
                component="li"
                key={row.id}
                direction="row"
                spacing={1}
                alignItems="center"
                justifyContent="space-between"
                sx={{ border: "1px solid #E7ECEF", borderRadius: 1.5, px: 1.5, py: 1 }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 700 }} noWrap>{row.name || `Campaign #${row.id}`}</Typography>
                  <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                    {!row.published && <Chip size="small" label="Unpublished" variant="outlined" />}
                    <Typography variant="caption" color="text.secondary">
                      {[row.manually_added ? "Added manually" : "Added by its segments or forms", formatDate(row.date_added)]
                        .filter(Boolean)
                        .join(" · ")}
                    </Typography>
                  </Stack>
                </Box>
                <Button
                  size="small"
                  color="warning"
                  onClick={() => setRemoving(row)}
                  disabled={busy}
                  aria-label={`Remove from ${row.name || `Campaign #${row.id}`}`}
                  sx={{ textTransform: "none", flexShrink: 0 }}
                >
                  Remove
                </Button>
              </Stack>
            ))}
          </Stack>
        ) : (
          !error && <Typography variant="body2" color="text.secondary">Not in any campaign.</Typography>
        )}

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <FormControl size="small" fullWidth disabled={busy}>
            <InputLabel id="contact-campaign-add-label">Add to campaign</InputLabel>
            <Select
              labelId="contact-campaign-add-label"
              label="Add to campaign"
              value={addId}
              onChange={(event) => setAddId(String(event.target.value))}
            >
              {addable.map((campaign) => (
                <MenuItem key={campaign.id} value={String(campaign.id)}>
                  {campaign.name || `Campaign #${campaign.id}`}
                  {campaign.isPublished ? "" : " (unpublished)"}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            size="small"
            onClick={() => change("campaign_add", toAdd.id, toAdd.name)}
            disabled={busy || !toAdd}
            sx={{ textTransform: "none", flexShrink: 0 }}
          >
            {busy && !removing ? <CircularProgress size={18} color="inherit" /> : "Add"}
          </Button>
        </Stack>
      </Stack>

      <Dialog open={Boolean(removing)} onClose={() => (busy ? null : setRemoving(null))} fullWidth maxWidth="xs">
        <DialogTitle>Remove from campaign</DialogTitle>
        <DialogContent>
          <Typography>
            {`Remove ${contactName} from "${removing?.name || ""}"? Mautic stops their remaining events in it.`}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoving(null)} disabled={busy}>Cancel</Button>
          <Button
            variant="contained"
            color="warning"
            onClick={() => change("campaign_remove", removing.id, removing.name)}
            disabled={busy}
          >
            {busy ? <CircularProgress size={18} color="inherit" /> : "Remove"}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
