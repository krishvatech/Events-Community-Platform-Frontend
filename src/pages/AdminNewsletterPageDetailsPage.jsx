import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  Grid,
  IconButton,
  Link,
  Paper,
  Skeleton,
  Snackbar,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import FileCopyRoundedIcon from "@mui/icons-material/FileCopyRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import PublishRoundedIcon from "@mui/icons-material/PublishRounded";
import UnpublishedRoundedIcon from "@mui/icons-material/UnpublishedRounded";
import { Link as RouterLink, useLocation, useNavigate, useParams } from "react-router-dom";

import EmailPreviewFrame from "../components/marketing/EmailPreviewFrame.jsx";
import { AbTestSection, FamilyBanner, PageRoleChip, TranslationsSection } from "./newsletterPageFamily.jsx";
import { getNewsletterPage, getNewsletterPageUsage } from "../services/newsletterService";
import {
  CARD_BORDER,
  NAVY,
  PAGES_PATH,
  PageDeleteDialog,
  PageDuplicateDialog,
  PagePublicationDialog,
  PageStatusChip,
  REDIRECT_TYPES,
  describePageLoadError,
  formatDateTime,
  isValidPageId,
  pageDetailsPath,
  pageEditPath,
} from "./newsletterPageShared.jsx";

function Section({ title, subtitle, children }) {
  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, borderColor: CARD_BORDER, minWidth: 0 }}>
      <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 850, color: NAVY }}>{title}</Typography>
      {subtitle && <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{subtitle}</Typography>}
      {!subtitle && <Box sx={{ mb: 2 }} />}
      {children}
    </Paper>
  );
}

function Setting({ label, children }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</Typography>
      <Typography component="div" sx={{ wordBreak: "break-word", whiteSpace: "pre-wrap" }}>{children || "-"}</Typography>
    </Box>
  );
}

const campaignLink = (id) => `/admin/newsletter/builder/${encodeURIComponent(id)}`;

export default function AdminNewsletterPageDetailsPage() {
  const { pageId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [page, setPage] = useState(null);
  const [load, setLoad] = useState({ loading: true, error: null });
  const [usage, setUsage] = useState({ loading: true, data: null, error: "" });
  const [publicationOpen, setPublicationOpen] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [snack, setSnack] = useState({ open: false, severity: "success", message: "" });
  // Bumped to re-read the page after a change made from a family section.
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!isValidPageId(pageId)) {
      setLoad({ loading: false, error: { title: "Invalid landing page link.", detail: "Landing page links use a numeric Mautic page ID.", retry: false } });
      return undefined;
    }
    let active = true;
    // A refresh after a change on this page keeps the page on screen.
    setLoad((current) => (reloadKey && page?.id === pageId ? current : { loading: true, error: null }));
    getNewsletterPage(pageId)
      .then((data) => {
        if (!active) return;
        setPage(data);
        setLoad({ loading: false, error: null });
      })
      .catch((err) => active && setLoad({ loading: false, error: describePageLoadError(err) }));
    // Usage is supplementary: the page works without it.
    setUsage({ loading: true, data: null, error: "" });
    getNewsletterPageUsage(pageId)
      .then((data) => active && setUsage({ loading: false, data, error: "" }))
      .catch(() => active && setUsage({ loading: false, data: null, error: "Usage could not be loaded from Mautic." }));
    return () => {
      active = false;
    };
    // `page` only decides whether a refresh may stay on screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId, reloadKey]);

  useEffect(() => {
    const flash = location.state?.flash;
    if (!flash) return;
    setSnack({ open: true, severity: "success", message: flash });
    navigate(location.pathname, { replace: true, state: {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(page.publicUrl);
      setSnack({ open: true, severity: "success", message: "Page URL copied." });
    } catch {
      setSnack({ open: true, severity: "warning", message: "The URL could not be copied. Select it and copy it instead." });
    }
  };

  if (load.loading || load.error) {
    return (
      <Stack spacing={3}>
        <Breadcrumbs>
          <Link component={RouterLink} to={PAGES_PATH} underline="hover" color="inherit">Landing Pages</Link>
          <Typography color="text.primary">Details</Typography>
        </Breadcrumbs>
        {load.loading ? (
          <Stack spacing={2}>
            <Skeleton height={56} />
            <Skeleton variant="rectangular" height={320} sx={{ borderRadius: 2 }} />
          </Stack>
        ) : (
          <Alert
            severity="error"
            action={
              <Stack direction="row" spacing={1}>
                {load.error.retry && <Button color="inherit" size="small" onClick={() => navigate(0)}>Retry</Button>}
                <Button color="inherit" size="small" component={RouterLink} to={PAGES_PATH}>Back to Landing Pages</Button>
              </Stack>
            }
          >
            <strong>{load.error.title}</strong> {load.error.detail}
          </Alert>
        )}
      </Stack>
    );
  }

  const title = page.title || `Page #${page.id}`;
  const openFamilyPage = (id, message) => navigate(pageDetailsPath(id), { state: { flash: message } });
  const blockers = Array.isArray(page.publishBlockers) ? page.publishBlockers : [];
  const canPublish = page.editable && (page.isPublished || page.publishable);
  const redirectLabel = REDIRECT_TYPES.find((option) => option.value === page.redirectType)?.label;
  const data = usage.data;

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Breadcrumbs aria-label="breadcrumb">
          <Link component={RouterLink} to="/admin/newsletter" underline="hover" color="inherit">Marketing Hub</Link>
          <Link component={RouterLink} to={PAGES_PATH} underline="hover" color="inherit">Landing Pages</Link>
          <Typography color="text.primary" sx={{ wordBreak: "break-word" }}>{title}</Typography>
        </Breadcrumbs>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ md: "center" }}>
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography variant="h5" component="h1" sx={{ fontWeight: 850, color: NAVY, wordBreak: "break-word" }}>{title}</Typography>
              <PageStatusChip page={page} />
              <PageRoleChip page={page} />
            </Stack>
            <Typography color="text.secondary">Mautic landing page #{page.id}</Typography>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button startIcon={<ArrowBackRoundedIcon />} onClick={() => navigate(PAGES_PATH)} sx={{ textTransform: "none" }}>Back</Button>
            {page.editable && (
              <>
                <Button startIcon={<EditRoundedIcon />} variant="outlined" onClick={() => navigate(pageEditPath(page.id))} sx={{ textTransform: "none" }}>
                  Edit Page
                </Button>
                <Button startIcon={<FileCopyRoundedIcon />} variant="outlined" onClick={() => setDuplicateOpen(true)} disabled={page.htmlLocked} sx={{ textTransform: "none" }}>
                  Duplicate
                </Button>
                <Button
                  variant="contained"
                  color={page.isPublished ? "warning" : "primary"}
                  startIcon={page.isPublished ? <UnpublishedRoundedIcon /> : <PublishRoundedIcon />}
                  onClick={() => setPublicationOpen(true)}
                  disabled={!canPublish}
                  sx={{ textTransform: "none" }}
                >
                  {page.isPublished ? "Unpublish" : "Publish"}
                </Button>
                <Button color="error" variant="outlined" startIcon={<DeleteOutlineRoundedIcon />} onClick={() => setDeleteOpen(true)} sx={{ textTransform: "none" }}>
                  Delete
                </Button>
              </>
            )}
          </Stack>
        </Stack>
      </Stack>

      <FamilyBanner page={page} />

      {!page.editable && (
        <Alert severity="info">
          This is a preference-center page. It decides how contacts manage their subscriptions, so it is shown here read-only and managed in Mautic.
        </Alert>
      )}

      {page.editable && !page.isPublished && blockers.length > 0 && (
        <Alert severity="warning">
          <strong>This page cannot be published yet.</strong>
          <Box component="ul" sx={{ m: 0, mt: 0.5, pl: 2.5 }}>
            {blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
          </Box>
        </Alert>
      )}

      {page.activeContent?.length > 0 && (
        <Alert severity={page.htmlLocked ? "warning" : "info"}>
          <strong>This page's HTML runs code</strong> ({page.activeContent.join("; ")}).{" "}
          {page.htmlLocked
            ? "Only superusers can change its HTML or duplicate it. You can still edit its other settings."
            : "Only superusers can save HTML like this."}
        </Alert>
      )}

      <Section title="Page Address" subtitle="Mautic serves the page from its own public address.">
        {page.publicUrl ? (
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
            <Typography sx={{ fontFamily: "monospace", wordBreak: "break-all" }} data-testid="page-public-url">{page.publicUrl}</Typography>
            <Stack direction="row" spacing={0.5}>
              <Tooltip title="Copy URL">
                <IconButton aria-label="Copy page URL" size="small" onClick={copyUrl}><ContentCopyRoundedIcon fontSize="small" /></IconButton>
              </Tooltip>
              {page.isPublished && (
                <Tooltip title="Open live page">
                  <IconButton aria-label="Open live page" size="small" component="a" href={page.publicUrl} target="_blank" rel="noopener noreferrer">
                    <OpenInNewRoundedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
          </Stack>
        ) : (
          <Typography color="text.secondary">{`/${page.alias} — Mautic's public address is not available, so the full URL cannot be shown.`}</Typography>
        )}
        {!page.isPublished && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {page.redirectType
              ? `Unpublished: visitors are redirected (${page.redirectType}) to ${page.redirectUrl}.`
              : "Unpublished: visitors see Mautic's access-denied (403) page until it is published."}
          </Typography>
        )}
      </Section>

      <Section title="Settings">
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}><Setting label="Title">{title}</Setting></Grid>
          <Grid size={{ xs: 12, md: 6 }}><Setting label="Page URL">/{page.alias}</Setting></Grid>
          <Grid size={{ xs: 12 }}><Setting label="Meta description">{page.metaDescription}</Setting></Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}><Setting label="Language">{page.language}</Setting></Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}><Setting label="Category">{page.category?.title}</Setting></Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}><Setting label="Search engines">{page.noIndex ? "Hidden (noindex)" : "Allowed"}</Setting></Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Setting label="When unpublished">{page.redirectType ? `${redirectLabel || page.redirectType} → ${page.redirectUrl}` : "Access denied (403)"}</Setting>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}><Setting label="Visits">{String(page.hits ?? 0)}</Setting></Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}><Setting label="Unique visitors">{String(page.uniqueHits ?? 0)}</Setting></Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Setting label="Created">{formatDateTime(page.dateAdded)}{page.createdBy ? ` by ${page.createdBy}` : ""}</Setting>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Setting label="Last updated">{formatDateTime(page.dateModified || page.dateAdded)}{page.modifiedBy ? ` by ${page.modifiedBy}` : ""}</Setting>
          </Grid>
        </Grid>
      </Section>

      <Section title="Preview" subtitle="Saved version. Scripts are off and a {form=ID} token is shown as typed; open the live page to see the Form.">
        <EmailPreviewFrame html={page.customHtml} title={`Preview of ${title}`} height={520} emptyHtml="<p>This page has no content yet.</p>" />
      </Section>

      {page.editable && page.role !== "translation" && (
        <Section title="A/B Test">
          <AbTestSection
            page={page}
            onNavigate={openFamilyPage}
            onChanged={(message) => {
              setSnack({ open: true, severity: "success", message });
              setReloadKey((key) => key + 1);
            }}
          />
        </Section>
      )}

      {page.role === "main" && !page.isPreferenceCenter && (
        <Section title="Translations">
          <TranslationsSection page={page} onNavigate={openFamilyPage} />
        </Section>
      )}

      <Section title="Usage" subtitle="Read-only. Where this page is used in Mautic.">
        {usage.loading ? (
          <Typography color="text.secondary">Loading usage…</Typography>
        ) : usage.error ? (
          <Alert severity="warning">{usage.error}</Alert>
        ) : (
          <Stack spacing={1}>
            <Typography>
              <strong>Campaign "Visits a page" decisions:</strong>{" "}
              {data.campaignEvents.length ? data.campaignEvents.map((event, index) => (
                <React.Fragment key={`event-${event.id}`}>
                  {index > 0 && ", "}
                  <Link component={RouterLink} to={campaignLink(event.campaignId)}>{event.campaignName}</Link>
                  {` (#${event.campaignId}${event.campaignPublished ? "" : ", unpublished"})`}
                </React.Fragment>
              )) : "none"}
            </Typography>
            <Typography>
              <strong>Preference center of Emails:</strong>{" "}
              {data.preferenceCenterEmails.length ? data.preferenceCenterEmails.map((e) => `${e.name} (#${e.id})`).join(", ") : "none"}
            </Typography>
            <Typography>
              <strong>Point actions:</strong>{" "}
              {data.pointActions.length ? data.pointActions.map((p) => `${p.name} (#${p.id})`).join(", ") : "none"}
            </Typography>
            {(data.variantChildren > 0 || data.translationChildren > 0) && (
              <Typography>
                <strong>Managed in Mautic:</strong>{` ${data.variantChildren} A/B variant(s), ${data.translationChildren} translation(s)`}
              </Typography>
            )}
            {(data.hasHeadScript || data.hasFooterScript) && (
              <Typography color="text.secondary">
                {`This page also has ${[data.hasHeadScript && "head", data.hasFooterScript && "footer"].filter(Boolean).join(" and ")} scripts set in Mautic. They are kept as they are.`}
              </Typography>
            )}
          </Stack>
        )}
      </Section>

      <PagePublicationDialog
        page={page}
        open={publicationOpen}
        onClose={() => setPublicationOpen(false)}
        onRefresh={setPage}
        onDone={(saved, message) => {
          setPage(saved);
          setPublicationOpen(false);
          setSnack({ open: true, severity: "success", message });
        }}
      />

      <PageDuplicateDialog
        page={page}
        open={duplicateOpen}
        onClose={() => setDuplicateOpen(false)}
        onDuplicated={(copy, message) => {
          setDuplicateOpen(false);
          navigate(pageDetailsPath(copy.id), { state: { flash: message } });
        }}
      />

      <PageDeleteDialog
        page={page}
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onDeleted={(_, message) => navigate(PAGES_PATH, { state: { flash: message } })}
      />

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack((current) => ({ ...current, open: false }))} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert severity={snack.severity} onClose={() => setSnack((current) => ({ ...current, open: false }))}>{snack.message}</Alert>
      </Snackbar>
    </Stack>
  );
}
