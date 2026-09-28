import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import CloudDownloadRoundedIcon from "@mui/icons-material/CloudDownloadRounded";
import blogApi from "../../services/blogApi";
import { isImportActive } from "../../services/blogService";
import { formatBlogDate } from "../../utils/blogContent";

export const IMPORT_POLL_INTERVAL_MS = 3000;

const STEP_LABELS = {
  queued: "Waiting for a worker…",
  fetching: "Fetching posts from WordPress…",
  planning: "Checking posts…",
  syncing_blogs: "Importing Blogs…",
  migrating_media: "Migrating images…",
  rewriting_links: "Updating links between Blogs…",
  finalizing: "Finishing…",
  waiting_retry: "WordPress is not responding; retrying shortly…",
  completed: "Completed",
  failed: "Failed",
};

const COUNTS = [
  ["created_count", "Created"],
  ["updated_count", "Updated"],
  ["skipped_count", "Skipped"],
  ["failed_count", "Failed"],
];

const WP_STATUS_LABELS = {
  publish: "Published",
  draft: "Draft",
  pending: "Pending",
  future: "Scheduled",
  private: "Private",
};

/**
 * Members-only chips. The breakdown arrives with the final report; while a run
 * is active only the neutral count is known. Finished runs from before draft
 * sync skipped restricted posts.
 */
function restrictedChips(run) {
  const restricted = run.summary?.restricted;
  if (!restricted || restricted.imported_as_draft === undefined) {
    if (!run.restricted_count) return [];
    return [isImportActive(run) ? `Restricted: ${run.restricted_count}` : `Restricted (skipped): ${run.restricted_count}`];
  }
  const chips = [`Restricted → Draft: ${restricted.imported_as_draft}`];
  if (restricted.teaser_only_not_imported) chips.push(`Restricted (not imported): ${restricted.teaser_only_not_imported}`);
  return chips;
}

function Counts({ run }) {
  return (
    <Stack direction="row" useFlexGap flexWrap="wrap" spacing={1} sx={{ mt: 1 }} data-testid="import-counts">
      {COUNTS.map(([field, label]) => (
        <Chip key={field} size="small" variant="outlined" label={`${label}: ${run[field] ?? 0}`} />
      ))}
      {restrictedChips(run).map((label) => (
        <Chip key={label} size="small" variant="outlined" label={label} />
      ))}
      <Chip size="small" variant="outlined" label={`Media migrated: ${run.media_migrated_count ?? 0}`} />
      <Chip size="small" variant="outlined" label={`Links rewritten: ${run.links_rewritten_count ?? 0}`} />
    </Stack>
  );
}

/** One line per side: what WordPress has, and what ECP shows after the sync. */
function StatusBreakdown({ run }) {
  const source = run.summary?.source_status_counts || {};
  const ecp = run.summary?.ecp_status_counts || {};
  // Published and Draft always; the rarer statuses only when present.
  const sourceParts = Object.entries(WP_STATUS_LABELS)
    .filter(([status]) => source[status] !== undefined && (source[status] > 0 || status === "publish" || status === "draft"))
    .map(([status, label]) => `${label} ${source[status]}`);
  const hasEcp = ecp.published !== undefined;
  if (!sourceParts.length && !hasEcp) return null;
  return (
    <Box sx={{ mt: 1 }} data-testid="import-status-breakdown">
      {sourceParts.length > 0 && (
        <Typography variant="body2">WordPress: {sourceParts.join(" · ")}</Typography>
      )}
      {hasEcp && (
        <Typography variant="body2">
          In ECP: {ecp.published} Published · {ecp.draft} Draft
          {ecp.restricted_draft ? ` (${ecp.restricted_draft} members-only)` : ""}
        </Typography>
      )}
    </Box>
  );
}

function Problems({ run }) {
  const errors = run.summary?.errors || [];
  const media = run.summary?.media_failures || [];
  if (!errors.length && !media.length) return null;
  return (
    <Box component="ul" sx={{ m: 0, mt: 1, pl: 2.5, fontSize: 13 }} data-testid="import-problems">
      {errors.slice(0, 5).map((e) => (
        <li key={`post-${e.wp_post_id}`}>WordPress post {e.wp_post_id}: {e.message}</li>
      ))}
      {media.slice(0, 5).map((m, i) => (
        <li key={`media-${m.wp_post_id}-${i}`}>
          Post {m.wp_post_id} {m.kind} image: {m.message}
        </li>
      ))}
    </Box>
  );
}

/**
 * "Import from WordPress" for My Blogs: confirmation, async start, polling and
 * the result. Only rendered inside the superuser-guarded My Blogs page; the
 * backend enforces the same permission on every call.
 */
export default function WordPressImportPanel({ onFinished, pollInterval = IMPORT_POLL_INTERVAL_MS }) {
  const [run, setRun] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [notice, setNotice] = useState("");
  const [pollWarning, setPollWarning] = useState("");
  const [startError, setStartError] = useState("");
  const timer = useRef(null);
  const mounted = useRef(true);
  const finishedRef = useRef(onFinished);
  finishedRef.current = onFinished;

  const stopPolling = () => {
    if (timer.current) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const poll = useCallback(
    (id) => {
      stopPolling();
      timer.current = window.setTimeout(async () => {
        timer.current = null;
        try {
          const next = await blogApi.getWordPressBlogImport(id);
          if (!mounted.current) return;
          setPollWarning("");
          setRun(next);
          if (isImportActive(next)) poll(id);
          else finishedRef.current?.(next);
        } catch (err) {
          if (!mounted.current) return;
          if (err.status === 401 || err.status === 403) {
            setPollWarning(err.message);
            return; // no point retrying without access
          }
          setPollWarning("Lost connection while checking progress. Retrying…");
          poll(id);
        }
      }, pollInterval);
    },
    [pollInterval]
  );

  useEffect(() => {
    mounted.current = true;
    blogApi
      .getLatestWordPressBlogImport()
      .then((latest) => {
        if (!mounted.current || !latest) return;
        setRun(latest);
        if (isImportActive(latest)) poll(latest.id);
      })
      .catch(() => {});
    return () => {
      mounted.current = false;
      stopPolling();
    };
  }, [poll]);

  const start = async () => {
    if (starting) return;
    setStarting(true);
    setStartError("");
    try {
      const started = await blogApi.startWordPressBlogImport();
      if (!mounted.current) return;
      setConfirmOpen(false);
      setNotice(started.alreadyRunning ? "An import is already running." : "");
      setRun(started);
      if (isImportActive(started)) poll(started.id);
    } catch (err) {
      if (mounted.current) setStartError(err.message);
    } finally {
      if (mounted.current) setStarting(false);
    }
  };

  const active = isImportActive(run);
  const total = run?.progress?.total || 0;
  const processed = run?.progress?.processed || 0;
  const percent = total ? Math.min(100, Math.round((processed / total) * 100)) : null;

  return (
    <Box sx={{ mb: 2 }}>
      <Stack direction="row" alignItems="center" spacing={2} useFlexGap flexWrap="wrap">
        <Button
          variant="outlined"
          startIcon={<CloudDownloadRoundedIcon />}
          onClick={() => setConfirmOpen(true)}
          disabled={active || starting}
          sx={{ textTransform: "none", fontWeight: 700, borderRadius: "10px" }}
        >
          {active ? "Importing from WordPress…" : "Import from WordPress"}
        </Button>
        {run && !active && (
          <Typography variant="body2" color="text.secondary" data-testid="last-import">
            Last WordPress import: {run.status === "failed" ? "failed" : "completed"}{" "}
            {formatBlogDate(run.finished_at || run.created_at)}
          </Typography>
        )}
      </Stack>

      {run && active && (
        <Alert severity="info" sx={{ mt: 2 }} data-testid="import-progress">
          <AlertTitle>Importing from WordPress…</AlertTitle>
          {notice && <Typography variant="body2" sx={{ fontWeight: 700 }}>{notice}</Typography>}
          <Typography variant="body2">{STEP_LABELS[run.current_step] || run.current_step}</Typography>
          {total > 0 && (
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              Processed {processed} / {total}
              {run.progress?.media_total ? ` · Images ${run.progress.media_processed} / ${run.progress.media_total}` : ""}
            </Typography>
          )}
          <LinearProgress
            sx={{ mt: 1, width: "100%", minWidth: 220 }}
            variant={percent === null ? "indeterminate" : "determinate"}
            value={percent ?? undefined}
            aria-label="Import progress"
          />
          <Counts run={run} />
          {pollWarning && <Typography variant="body2" sx={{ mt: 1 }}>{pollWarning}</Typography>}
        </Alert>
      )}

      {run && run.status === "succeeded" && (
        <Alert severity="success" sx={{ mt: 2 }} data-testid="import-result" onClose={() => setRun(null)}>
          <AlertTitle>WordPress import completed.</AlertTitle>
          <Counts run={run} />
          <StatusBreakdown run={run} />
        </Alert>
      )}
      {run && run.status === "partial" && (
        <Alert severity="warning" sx={{ mt: 2 }} data-testid="import-result" onClose={() => setRun(null)}>
          <AlertTitle>Import completed with warnings.</AlertTitle>
          <Counts run={run} />
          <StatusBreakdown run={run} />
          <Problems run={run} />
        </Alert>
      )}
      {run && run.status === "failed" && (
        <Alert severity="error" sx={{ mt: 2 }} data-testid="import-result" onClose={() => setRun(null)}>
          <AlertTitle>WordPress import failed.</AlertTitle>
          <Typography variant="body2">{run.error_message || "The import could not be completed."}</Typography>
          <Counts run={run} />
        </Alert>
      )}

      <Dialog open={confirmOpen} onClose={() => !starting && setConfirmOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Import Blogs from WordPress?</DialogTitle>
        <DialogContent>
          <Box component="ul" sx={{ pl: 2.5, m: 0, color: "text.secondary", fontSize: 14, lineHeight: 1.7 }}>
            <li>WordPress Blogs will be synchronized into ECP.</li>
            <li>Published public Blogs are imported as Published.</li>
            <li>WordPress drafts, pending, scheduled or private Blogs are imported as Drafts.</li>
            <li>Membership-restricted Blogs are imported as Drafts so restricted content is not accidentally exposed.</li>
            <li>New Blogs are created, changed imported Blogs are updated and unchanged Blogs are skipped.</li>
            <li>No ECP Blog is automatically deleted, and Blogs you published or unpublished in ECP keep that status.</li>
            <li>Images are copied into ECP and may take several minutes.</li>
          </Box>
          {startError && <Alert severity="error" sx={{ mt: 2 }}>{startError}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} disabled={starting}>Cancel</Button>
          <Button variant="contained" onClick={start} disabled={starting}>
            {starting ? "Starting…" : "Start Import"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
