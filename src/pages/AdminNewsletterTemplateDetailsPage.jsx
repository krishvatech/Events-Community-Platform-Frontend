import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Link,
  Paper,
  Skeleton,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import PreviewRoundedIcon from "@mui/icons-material/PreviewRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import { Link as RouterLink, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";

import { getNewsletterTemplate } from "../services/newsletterService";
import EmailPreviewFrame from "../components/marketing/EmailPreviewFrame.jsx";
import {
  CARD_BORDER,
  NAVY,
  TEMPLATES_PATH,
  TemplateDeleteDialog,
  TemplateStatusChip,
  TemplateTestSendPanel,
  describeLoadError,
  formatDateTime,
  isValidTemplateId,
  templateDetailsPath,
  templateEditPath,
  useTemplateDuplicate,
} from "./newsletterTemplateShared.jsx";
import { AbTestSection, FamilyBanner, TemplateRoleChip, TranslationsSection } from "./newsletterTemplateFamily.jsx";

const TOKEN_RE = /\{[a-z][a-z0-9_]*(?:=[A-Za-z0-9_]+)?\}/g;

const DESIGN_STATUS = {
  in_sync: { severity: "success", text: "This Template has a visual design that matches its saved HTML. It opens in Visual Builder." },
  stale: {
    severity: "warning",
    text: "The HTML was changed after the visual design was saved (in the HTML editor or in Mautic). The current HTML is what will be sent; the Template opens in the HTML editor.",
  },
  invalid: { severity: "warning", text: "The saved visual design can no longer be opened. The Template is edited as HTML." },
  none: { severity: "info", text: "HTML-only Template. It opens in the HTML editor; it is never converted to visual blocks automatically." },
};

const Section = React.forwardRef(function Section({ title, children, ...props }, ref) {
  return (
    <Paper ref={ref} variant="outlined" component="section" aria-label={title} sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, borderColor: CARD_BORDER, minWidth: 0 }} {...props}>
      <Typography variant="h6" sx={{ fontWeight: 800, color: NAVY, mb: 2 }}>{title}</Typography>
      {children}
    </Paper>
  );
});

function Field({ label, children }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </Typography>
      <Box sx={{ mt: 0.25, wordBreak: "break-word" }}>{children}</Box>
    </Box>
  );
}

const fieldGrid = { display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" } };

export default function AdminNewsletterTemplateDetailsPage() {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [state, setState] = useState({ loading: true, template: null, error: null });
  const [attempt, setAttempt] = useState(0);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [snack, setSnack] = useState({ open: false, severity: "success", message: "" });
  const previewRef = useRef(null);
  const testSendRef = useRef(null);
  const testSendInput = useRef(null);
  const { duplicate, duplicatingId } = useTemplateDuplicate({
    onError: (message) => setSnack({ open: true, severity: "error", message }),
  });

  useEffect(() => {
    if (!isValidTemplateId(templateId)) {
      setState({ loading: false, template: null, error: { title: "Invalid Template ID.", detail: "Template links use a numeric Mautic email ID.", retry: false } });
      return undefined;
    }
    let active = true;
    setState((current) => ({ ...current, loading: true, error: null }));
    getNewsletterTemplate(templateId)
      .then((template) => active && setState({ loading: false, template, error: null }))
      .catch((err) => active && setState({ loading: false, template: null, error: describeLoadError(err) }));
    return () => {
      active = false;
    };
  }, [templateId, attempt]);

  // Feedback carried over from the page that navigated here (save, duplicate).
  useEffect(() => {
    const flash = location.state?.flash;
    if (!flash) return;
    setSnack({ open: true, severity: "success", message: flash });
    navigate(`${location.pathname}${location.search}`, { replace: true, state: {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  const scrollTo = (ref) => ref.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });

  // Deep links from the list: ?testSend=1 focuses the Test Send panel, #preview scrolls to the preview.
  useEffect(() => {
    if (!state.template) return;
    if (searchParams.get("testSend") === "1") {
      scrollTo(testSendRef);
      testSendInput.current?.focus();
    } else if (location.hash === "#preview") {
      scrollTo(previewRef);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.template]);

  const template = state.template;

  if (state.loading || state.error) {
    return (
      <Stack spacing={3}>
        <Breadcrumbs aria-label="breadcrumb">
          <Link component={RouterLink} to="/admin/newsletter" underline="hover" color="inherit">Marketing Hub</Link>
          <Link component={RouterLink} to={TEMPLATES_PATH} underline="hover" color="inherit">Templates</Link>
        </Breadcrumbs>
        {state.loading ? (
          <Stack spacing={2} aria-label="Loading Template">
            <Skeleton height={48} width="50%" />
            <Skeleton variant="rectangular" height={360} sx={{ borderRadius: 2 }} />
          </Stack>
        ) : (
          <Alert
            severity="error"
            action={
              <Stack direction="row" spacing={1}>
                {state.error.retry && <Button color="inherit" size="small" onClick={() => setAttempt((value) => value + 1)}>Retry</Button>}
                <Button color="inherit" size="small" component={RouterLink} to={TEMPLATES_PATH}>Back to Templates</Button>
              </Stack>
            }
          >
            <strong>{state.error.title}</strong> {state.error.detail}
          </Alert>
        )}
      </Stack>
    );
  }

  const name = template.name || `Template #${template.id}`;
  const design = template.visualDesign || { status: "none" };
  const designInfo = DESIGN_STATUS[design.status] || DESIGN_STATUS.none;
  const html = template.customHtml || "";
  const tokensUsed = [...new Set(`${html}\n${template.plainText || ""}\n${template.subject || ""}`.match(TOKEN_RE) || [])];

  // Opens another template of the family, or reloads this one (a winner keeps the main template's id).
  const openFamilyMember = (id, flash) => {
    if (String(id) === String(template.id)) {
      setAttempt((value) => value + 1);
      setSnack({ open: true, severity: "success", message: flash });
      return;
    }
    navigate(templateDetailsPath(id), { state: { flash } });
  };

  const handleDuplicate = async () => {
    const copy = await duplicate(template);
    if (copy?.id) {
      navigate(templateDetailsPath(copy.id), {
        state: { flash: copy.designCopied ? "Template duplicated as a draft, with its visual design." : "Template duplicated as a draft." },
      });
    }
  };

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Breadcrumbs aria-label="breadcrumb">
          <Link component={RouterLink} to="/admin/newsletter" underline="hover" color="inherit">Marketing Hub</Link>
          <Link component={RouterLink} to={TEMPLATES_PATH} underline="hover" color="inherit">Templates</Link>
          <Typography color="text.primary">{name}</Typography>
        </Breadcrumbs>
        <Stack direction={{ xs: "column", lg: "row" }} spacing={2} justifyContent="space-between" alignItems={{ lg: "center" }}>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 850, color: NAVY, wordBreak: "break-word" }}>{name}</Typography>
            <TemplateStatusChip published={template.isPublished} />
            <TemplateRoleChip template={template} />
          </Stack>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button startIcon={<ArrowBackRoundedIcon />} component={RouterLink} to={TEMPLATES_PATH} sx={{ textTransform: "none" }}>
              Back to Templates
            </Button>
            <Button startIcon={<PreviewRoundedIcon />} onClick={() => scrollTo(previewRef)} sx={{ textTransform: "none" }}>Preview</Button>
            <Button
              startIcon={duplicatingId ? <CircularProgress size={16} color="inherit" /> : <ContentCopyRoundedIcon />}
              onClick={handleDuplicate}
              disabled={Boolean(duplicatingId)}
              sx={{ textTransform: "none" }}
            >
              {duplicatingId ? "Duplicating..." : "Duplicate"}
            </Button>
            <Button
              startIcon={<SendRoundedIcon />}
              onClick={() => {
                scrollTo(testSendRef);
                testSendInput.current?.focus();
              }}
              sx={{ textTransform: "none" }}
            >
              Test Send
            </Button>
            <Button color="error" startIcon={<DeleteRoundedIcon />} onClick={() => setDeleteOpen(true)} sx={{ textTransform: "none" }}>
              Delete
            </Button>
            <Button variant="contained" startIcon={<EditRoundedIcon />} component={RouterLink} to={templateEditPath(template.id)} sx={{ textTransform: "none" }}>
              Edit Template
            </Button>
          </Stack>
        </Stack>
        <FamilyBanner template={template} />
      </Stack>

      <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "minmax(0, 5fr) minmax(0, 7fr)" }, alignItems: "start" }}>
        <Stack spacing={3} sx={{ minWidth: 0 }}>
          <Section title="General Information">
            <Box sx={fieldGrid}>
              <Field label="Template Name">{name}</Field>
              <Field label="Status"><TemplateStatusChip published={template.isPublished} /></Field>
              <Field label="Email Subject">{template.subject || <Typography color="text.secondary" component="span">No subject</Typography>}</Field>
              <Field label="Category">{template.category?.title || "Uncategorized"}</Field>
              <Field label="Theme">{template.template || "No theme / custom HTML"}</Field>
              <Field label="Mautic Email ID">#{template.id} · {template.emailType || "template"}</Field>
              <Field label="Created">{formatDateTime(template.dateAdded)}</Field>
              <Field label="Last Updated">{formatDateTime(template.dateModified || template.dateAdded)}</Field>
              <Field label="Sent / Read">{`${template.sentCount ?? 0} / ${template.readCount ?? 0}`}</Field>
            </Box>
          </Section>

          <Section title="Sender Information">
            <Box sx={fieldGrid}>
              <Field label="From Name">{template.fromName || "-"}</Field>
              <Field label="From Email">{template.fromAddress || "-"}</Field>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
              Reply-To is not managed in IMAA Connect; Mautic&apos;s own setting applies.
            </Typography>
          </Section>

          <Section title="Email Content">
            <Stack spacing={2}>
              <Box sx={fieldGrid}>
                <Field label="HTML Content">{html.trim() ? `Present (${html.length.toLocaleString()} characters)` : "No HTML content"}</Field>
                <Field label="Preheader / Preview Text">{template.preheaderText || "-"}</Field>
              </Box>
              <Field label="Personalization Tokens">
                {tokensUsed.length ? (
                  <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                    {tokensUsed.map((token) => <Chip key={token} size="small" label={token} variant="outlined" />)}
                  </Stack>
                ) : (
                  "None"
                )}
              </Field>
              <Divider />
              <Field label="Plain Text Fallback">
                {template.plainText ? (
                  <Box component="pre" sx={{ m: 0, mt: 0.5, p: 1.5, bgcolor: "#F7F9FA", borderRadius: 1, whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 14, maxHeight: 240, overflow: "auto" }}>
                    {template.plainText}
                  </Box>
                ) : (
                  "No plain-text version"
                )}
              </Field>
            </Stack>
          </Section>

          <Section title="Design Status">
            <Alert severity={designInfo.severity} variant="outlined">{designInfo.text}</Alert>
            {design.updatedAt && (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                Visual design last saved {formatDateTime(design.updatedAt)}.
              </Typography>
            )}
          </Section>
        </Stack>

        <Section title="Email Preview" ref={previewRef} id="preview">
          <EmailPreviewFrame title="Saved Newsletter Template preview" html={html} height={720} />
        </Section>
      </Box>

      {template.role !== "translation" && (
        <Section title="A/B Test">
          <AbTestSection key={`${template.id}-${attempt}`} template={template} onNavigate={openFamilyMember}
            onChanged={(message) => setSnack({ open: true, severity: "success", message })} />
        </Section>
      )}

      {template.role === "main" && (
        <Section title="Translations">
          <TranslationsSection template={template} onNavigate={openFamilyMember}
            onChanged={(saved, message) => {
              setState({ loading: false, template: saved, error: null });
              setSnack({ open: true, severity: "success", message });
            }} />
        </Section>
      )}

      <Box ref={testSendRef} id="test-send">
        <TemplateTestSendPanel template={template} inputRef={testSendInput} />
      </Box>

      <TemplateDeleteDialog
        template={template}
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onDeleted={() => {
          setDeleteOpen(false);
          navigate(TEMPLATES_PATH, { replace: true, state: { flash: "Template deleted from Mautic." } });
        }}
      />

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack((current) => ({ ...current, open: false }))} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert severity={snack.severity} onClose={() => setSnack((current) => ({ ...current, open: false }))}>{snack.message}</Alert>
      </Snackbar>
    </Stack>
  );
}
