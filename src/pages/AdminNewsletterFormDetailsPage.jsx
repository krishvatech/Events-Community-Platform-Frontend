import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  Chip,
  Grid,
  Link,
  Paper,
  Skeleton,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import PublishRoundedIcon from "@mui/icons-material/PublishRounded";
import UnpublishedRoundedIcon from "@mui/icons-material/UnpublishedRounded";
import { Link as RouterLink, useLocation, useNavigate, useParams } from "react-router-dom";

import CodeRoundedIcon from "@mui/icons-material/CodeRounded";
import InboxRoundedIcon from "@mui/icons-material/InboxRounded";
import PreviewRoundedIcon from "@mui/icons-material/PreviewRounded";
import { FormEmbedDialog, FormPreviewDialog, SubmitAddressStatus } from "./NewsletterFormPreviewEmbed.jsx";
import { getNewsletterForm, getNewsletterFormUsage } from "../services/newsletterService";
import { describeAction } from "./newsletterFormActions.js";
import {
  CARD_BORDER,
  FORMS_PATH,
  FormDeleteDialog,
  FormPublicationDialog,
  FormStatusChip,
  NAVY,
  describeFormLoadError,
  formEditPath,
  formSubmissionsPath,
  formatDateTime,
  isValidFormId,
  postActionLabel,
} from "./newsletterFormShared.jsx";

const POLICY_CHIPS = {
  prohibited: { label: "Not allowed by ECP", color: "error" },
  protected_segment: { label: "Subscription List segment", color: "warning" },
};

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

export default function AdminNewsletterFormDetailsPage() {
  const { formId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState(null);
  const [load, setLoad] = useState({ loading: true, error: null });
  const [publicationOpen, setPublicationOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [usage, setUsage] = useState({ loading: true, data: null, error: "" });
  // ?preview=1 (from the editor's "Preview saved version") opens the preview.
  const [previewOpen, setPreviewOpen] = useState(() => new URLSearchParams(location.search).get("preview") === "1");
  const [embedOpen, setEmbedOpen] = useState(false);
  const [snack, setSnack] = useState({ open: false, severity: "success", message: "" });

  useEffect(() => {
    if (!isValidFormId(formId)) {
      setLoad({ loading: false, error: { title: "Invalid Form link.", detail: "Form links use a numeric Mautic Form ID.", retry: false } });
      return undefined;
    }
    let active = true;
    setLoad({ loading: true, error: null });
    getNewsletterForm(formId)
      .then((data) => {
        if (!active) return;
        setForm(data);
        setLoad({ loading: false, error: null });
      })
      .catch((err) => active && setLoad({ loading: false, error: describeFormLoadError(err) }));
    // Usage is supplementary: the page works without it.
    if (isValidFormId(formId)) {
      setUsage({ loading: true, data: null, error: "" });
      getNewsletterFormUsage(formId)
        .then((data) => active && setUsage({ loading: false, data, error: "" }))
        .catch(() => active && setUsage({ loading: false, data: null, error: "Usage could not be loaded from Mautic." }));
    }
    return () => {
      active = false;
    };
  }, [formId]);

  useEffect(() => {
    const flash = location.state?.flash;
    if (!flash) return;
    setSnack({ open: true, severity: "success", message: flash });
    navigate(`${location.pathname}${location.search}`, { replace: true, state: {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  if (load.loading || load.error) {
    return (
      <Stack spacing={3}>
        <Breadcrumbs>
          <Link component={RouterLink} to={FORMS_PATH} underline="hover" color="inherit">Forms</Link>
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
                <Button color="inherit" size="small" component={RouterLink} to={FORMS_PATH}>Back to Forms</Button>
              </Stack>
            }
          >
            <strong>{load.error.title}</strong> {load.error.detail}
          </Alert>
        )}
      </Stack>
    );
  }

  const name = form.name || `Form #${form.id}`;
  const fields = Array.isArray(form.fields) ? form.fields : [];
  const actions = Array.isArray(form.actions) ? form.actions : [];
  const blockers = Array.isArray(form.publishBlockers) ? form.publishBlockers : [];
  const canPublish = form.isPublished || form.publishable;

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Breadcrumbs aria-label="breadcrumb">
          <Link component={RouterLink} to="/admin/newsletter" underline="hover" color="inherit">Marketing Hub</Link>
          <Link component={RouterLink} to={FORMS_PATH} underline="hover" color="inherit">Forms</Link>
          <Typography color="text.primary" sx={{ wordBreak: "break-word" }}>{name}</Typography>
        </Breadcrumbs>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ md: "center" }}>
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography variant="h5" component="h1" sx={{ fontWeight: 850, color: NAVY, wordBreak: "break-word" }}>{name}</Typography>
              <FormStatusChip published={form.isPublished} />
            </Stack>
            <Typography color="text.secondary">Mautic Form #{form.id}</Typography>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button startIcon={<ArrowBackRoundedIcon />} onClick={() => navigate(FORMS_PATH)} sx={{ textTransform: "none" }}>Back</Button>
            <Button startIcon={<EditRoundedIcon />} variant="outlined" onClick={() => navigate(formEditPath(form.id))} sx={{ textTransform: "none" }}>
              Edit Form
            </Button>
            <Button startIcon={<PreviewRoundedIcon />} variant="outlined" onClick={() => setPreviewOpen(true)} sx={{ textTransform: "none" }}>
              Preview Form
            </Button>
            <Button startIcon={<CodeRoundedIcon />} variant="outlined" onClick={() => setEmbedOpen(true)} sx={{ textTransform: "none" }}>
              Embed Form
            </Button>
            <Button startIcon={<InboxRoundedIcon />} variant="outlined" onClick={() => navigate(formSubmissionsPath(form.id))} sx={{ textTransform: "none" }}>
              Submissions{usage.data?.submissions ? ` (${usage.data.submissions.total})` : ""}
            </Button>
            <Button
              variant="contained"
              color={form.isPublished ? "warning" : "primary"}
              startIcon={form.isPublished ? <UnpublishedRoundedIcon /> : <PublishRoundedIcon />}
              onClick={() => setPublicationOpen(true)}
              disabled={!canPublish}
              sx={{ textTransform: "none" }}
            >
              {form.isPublished ? "Unpublish" : "Publish"}
            </Button>
            <Button color="error" variant="outlined" startIcon={<DeleteOutlineRoundedIcon />} onClick={() => setDeleteOpen(true)} sx={{ textTransform: "none" }}>
              Delete
            </Button>
          </Stack>
        </Stack>
      </Stack>

      {!form.isPublished && blockers.length > 0 && (
        <Alert severity="warning">
          <strong>This Form cannot be published yet.</strong>
          <Box component="ul" sx={{ m: 0, mt: 0.5, pl: 2.5 }}>
            {blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
          </Box>
        </Alert>
      )}

      <SubmitAddressStatus submitAddress={form.submitAddress} published={form.isPublished} />

      <Section title="Settings">
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}><Setting label="Name">{name}</Setting></Grid>
          <Grid size={{ xs: 12, md: 6 }}><Setting label="After submit">{postActionLabel(form.postAction)}</Setting></Grid>
          <Grid size={{ xs: 12 }}><Setting label="Description">{form.description}</Setting></Grid>
          {form.postAction !== "return" && (
            <Grid size={{ xs: 12 }}>
              <Setting label={form.postAction === "redirect" ? "Redirect URL" : "Message"}>{form.postActionProperty}</Setting>
            </Grid>
          )}
          {form.submitAddress && (
            <Grid size={{ xs: 12 }}>
              <Setting label="Submit address"><SubmitAddressStatus submitAddress={form.submitAddress} variant="text" /></Setting>
            </Grid>
          )}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}><Setting label="Alias">{form.alias}</Setting></Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Setting label="Form type">{form.formType === "standalone" ? "Standalone" : form.formType}{form.campaignSource ? " · usable as a Campaign source" : ""}</Setting>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Setting label="Created">{formatDateTime(form.dateAdded)}{form.createdBy ? ` by ${form.createdBy}` : ""}</Setting>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Setting label="Last updated">{formatDateTime(form.dateModified || form.dateAdded)}{form.modifiedBy ? ` by ${form.modifiedBy}` : ""}</Setting>
          </Grid>
        </Grid>
      </Section>

      <Section title={`Fields (${fields.length})`} subtitle="Add, change and re-order fields from Edit Form.">
        {fields.length === 0 ? (
          <Typography color="text.secondary">This Form has no fields yet.</Typography>
        ) : (
          <TableContainer>
            <Table size="small" aria-label="Form fields">
              <TableHead>
                <TableRow sx={{ "& th": { fontWeight: 800, color: NAVY, whiteSpace: "nowrap" } }}>
                  <TableCell>Label</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>Alias</TableCell>
                  <TableCell>Required</TableCell>
                  <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>Saves to</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {fields.map((field) => (
                  <TableRow key={field.id || field.alias}>
                    <TableCell sx={{ wordBreak: "break-word" }}>{field.label || "-"}</TableCell>
                    <TableCell>{field.type}</TableCell>
                    <TableCell sx={{ display: { xs: "none", sm: "table-cell" }, wordBreak: "break-all" }}>{field.alias}</TableCell>
                    <TableCell>{field.isRequired ? "Yes" : "No"}</TableCell>
                    <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                      {field.mappedField ? `${field.mappedObject || "contact"}.${field.mappedField}` : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Section>

      <Section title={`Submit Actions (${actions.length})`} subtitle="Tag and points actions can be changed from Edit Form; every other action is kept exactly as it is in Mautic.">
        {actions.length === 0 ? (
          <Typography color="text.secondary">This Form has no submit actions.</Typography>
        ) : (
          <Stack spacing={1.5}>
            {actions.map((action) => {
              const chip = POLICY_CHIPS[action.policy];
              return (
                <Stack key={action.id || action.name} direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between" alignItems={{ sm: "center" }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700, wordBreak: "break-word" }}>{action.name || action.type}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ wordBreak: "break-word" }}>{describeAction(action)} · {action.type}</Typography>
                    {action.policyReason && <Typography variant="body2" color={chip?.color === "error" ? "error" : "warning.dark"}>{action.policyReason}</Typography>}
                  </Box>
                  {chip && <Chip size="small" color={chip.color} label={chip.label} sx={{ fontWeight: 700, alignSelf: { xs: "flex-start", sm: "center" } }} />}
                </Stack>
              );
            })}
          </Stack>
        )}
      </Section>

      <Section title="Usage" subtitle="Read-only. Where this Form is used in Mautic.">
        {usage.loading ? (
          <Typography color="text.secondary">Loading usage…</Typography>
        ) : usage.error ? (
          <Alert severity="warning">{usage.error}</Alert>
        ) : (
          <Stack spacing={1}>
            <Typography>
              <strong>Campaign sources:</strong>{" "}
              {usage.data.campaignSources.length ? usage.data.campaignSources.map((c, index) => (
                <React.Fragment key={`source-${c.id}`}>
                  {index > 0 && ", "}
                  <Link component={RouterLink} to={`/admin/newsletter/builder/${encodeURIComponent(c.id)}`}>{c.name}</Link>
                  {` (#${c.id}${c.published ? "" : ", unpublished"})`}
                </React.Fragment>
              )) : "none"}
            </Typography>
            <Typography>
              <strong>Campaign decisions and conditions:</strong>{" "}
              {usage.data.campaignEvents.length ? usage.data.campaignEvents.map((e, index) => (
                <React.Fragment key={`event-${e.id}`}>
                  {index > 0 && ", "}
                  <Link component={RouterLink} to={`/admin/newsletter/builder/${encodeURIComponent(e.campaignId)}`}>{e.campaignName}</Link>
                  {` (#${e.campaignId}, ${e.type === "form.submit" ? "Submits form" : e.type === "form.field_value" ? "Form field value" : e.type})`}
                </React.Fragment>
              )) : "none"}
            </Typography>
            <Typography>
              <strong>Point actions:</strong>{" "}
              {usage.data.pointActions.length ? usage.data.pointActions.map((p) => `${p.name} (#${p.id})`).join(", ") : "none"}
            </Typography>
            <Typography>
              <strong>Stored submissions:</strong> {usage.data.submissions.total}
              {usage.data.submissions.latest ? ` · latest ${formatDateTime(`${String(usage.data.submissions.latest).replace(" ", "T")}Z`)}` : ""}
            </Typography>
          </Stack>
        )}
      </Section>

      <FormPreviewDialog formId={form.id} open={previewOpen} onClose={() => setPreviewOpen(false)} />
      <FormEmbedDialog formId={form.id} open={embedOpen} onClose={() => setEmbedOpen(false)} />

      <FormPublicationDialog
        form={form}
        open={publicationOpen}
        onClose={() => setPublicationOpen(false)}
        onRefresh={setForm}
        onDone={(saved, message) => {
          setForm(saved);
          setPublicationOpen(false);
          setSnack({ open: true, severity: "success", message });
        }}
      />

      <FormDeleteDialog
        form={form}
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onDeleted={(_, message) => navigate(FORMS_PATH, { state: { flash: message } })}
      />

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack((current) => ({ ...current, open: false }))} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert severity={snack.severity} onClose={() => setSnack((current) => ({ ...current, open: false }))}>{snack.message}</Alert>
      </Snackbar>
    </Stack>
  );
}
