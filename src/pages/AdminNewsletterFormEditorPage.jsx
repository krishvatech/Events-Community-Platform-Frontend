import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  CircularProgress,
  Link,
  MenuItem,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import PreviewRoundedIcon from "@mui/icons-material/PreviewRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";

import { UnsavedChangesDialog, useUnsavedChangesGuard } from "../components/marketing/UnsavedChangesGuard.jsx";
import { createNewsletterForm, getNewsletterForm, updateNewsletterForm } from "../services/newsletterService";
import NewsletterFormActionBuilder from "./NewsletterFormActionBuilder.jsx";
import NewsletterFormFieldBuilder from "./NewsletterFormFieldBuilder.jsx";
import {
  CARD_BORDER,
  DESCRIPTION_MAX_LENGTH,
  FORMS_PATH,
  MESSAGE_MAX_LENGTH,
  NAME_MAX_LENGTH,
  NAVY,
  POST_ACTIONS,
  REDIRECT_MAX_LENGTH,
  blankForm,
  describeFormLoadError,
  draftToPayload,
  formDetailsPath,
  formToDraft,
  getErrorMessage,
  isValidFormId,
  validateFormDraft,
} from "./newsletterFormShared.jsx";

/** Server-side field errors (`errors`), limited to fields this page shows. */
const serverFieldErrors = (data) => {
  const errors = data?.errors && typeof data.errors === "object" ? data.errors : {};
  return Object.fromEntries(
    Object.entries(errors).filter(([key]) => ["name", "description", "postAction", "postActionProperty"].includes(key))
  );
};

export default function AdminNewsletterFormEditorPage() {
  const { formId } = useParams();
  const navigate = useNavigate();
  const [original, setOriginal] = useState(null);
  const [draft, setDraft] = useState(blankForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [load, setLoad] = useState({ loading: Boolean(formId), error: null });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [fieldsDirty, setFieldsDirty] = useState(false);
  const [actionsDirty, setActionsDirty] = useState(false);
  const [savedNotice, setSavedNotice] = useState("");
  const saveInFlight = useRef(false);
  const onFieldsDirty = useCallback((value) => setFieldsDirty(Boolean(value)), []);
  const onActionsDirty = useCallback((value) => setActionsDirty(Boolean(value)), []);
  const otherWorkDirty = fieldsDirty || actionsDirty;

  const isNew = !formId;
  // Unsaved basic settings, fields, field order, actions or action order all hold navigation.
  const guard = useUnsavedChangesGuard((dirty || fieldsDirty || actionsDirty) && !saving);

  useEffect(() => {
    setFieldErrors({});
    setSaveError(null);
    if (!formId) {
      setOriginal(null);
      setDraft(blankForm);
      setLoad({ loading: false, error: null });
      setDirty(false);
      return undefined;
    }
    if (!isValidFormId(formId)) {
      setLoad({ loading: false, error: { title: "Invalid Form link.", detail: "Form links use a numeric Mautic Form ID.", retry: false } });
      return undefined;
    }
    let active = true;
    setLoad({ loading: true, error: null });
    getNewsletterForm(formId)
      .then((data) => {
        if (!active) return;
        setOriginal(data);
        setDraft(formToDraft(data));
        setLoad({ loading: false, error: null });
        setDirty(false);
      })
      .catch((err) => active && setLoad({ loading: false, error: describeFormLoadError(err) }));
    return () => {
      active = false;
    };
  }, [formId]);

  const setField = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: "", ...(field === "postAction" ? { postActionProperty: "" } : {}) }));
    setDirty(true);
  };

  const changePostAction = (value) => {
    // A message and a URL are different things: never carry one into the other.
    setDraft((current) => ({
      ...current,
      postAction: value,
      postActionProperty: original && value === original.postAction ? formToDraft(original).postActionProperty : "",
    }));
    setFieldErrors((current) => ({ ...current, postAction: "", postActionProperty: "" }));
    setDirty(true);
  };

  const handleSave = async () => {
    if (saving || saveInFlight.current) return;
    const errors = validateFormDraft(draft);
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setSaveError({ message: "Fix the highlighted settings before saving." });
      return;
    }
    const payload = draftToPayload(draft, original);
    if (!isNew && Object.keys(payload).length === 0) {
      setDirty(false);
      guard.allowNavigation();
      navigate(formDetailsPath(original.id), { replace: true, state: { flash: "No changes to save." } });
      return;
    }

    saveInFlight.current = true;
    setSaving(true);
    setSaveError(null);
    try {
      const saved = isNew ? await createNewsletterForm(payload) : await updateNewsletterForm(original.id, payload);
      setDirty(false);
      if (!isNew && otherWorkDirty) {
        // Unsaved field work stays on screen: keep the page, refresh the baseline.
        setOriginal(saved);
        setDraft(formToDraft(saved));
        setSavedNotice("Form settings saved. You still have unsaved field or action changes below.");
        return;
      }
      guard.allowNavigation();
      navigate(formDetailsPath(saved.id), {
        replace: true,
        state: { flash: isNew ? "Form created in Mautic (unpublished)." : "Form settings saved." },
      });
    } catch (err) {
      const data = err?.response?.data;
      setFieldErrors((current) => ({ ...current, ...serverFieldErrors(data) }));
      setSaveError({
        message: getErrorMessage(err, "We could not save this Form."),
        candidates: Array.isArray(data?.candidates) ? data.candidates : [],
      });
      // Mautic's verified state after an unclear edit: reflect it, keep the draft.
      if (!isNew && data?.form?.id) setOriginal(data.form);
    } finally {
      saveInFlight.current = false;
      setSaving(false);
    }
  };

  const backPath = isNew ? FORMS_PATH : formDetailsPath(original?.id || formId);
  const name = original?.name || "Form";

  if (load.loading || load.error) {
    return (
      <Stack spacing={3}>
        <Breadcrumbs>
          <Link component={RouterLink} to={FORMS_PATH} underline="hover" color="inherit">Forms</Link>
          <Typography color="text.primary">Edit</Typography>
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

  const propertyIsUrl = draft.postAction === "redirect";

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Breadcrumbs aria-label="breadcrumb">
          <Link component={RouterLink} to="/admin/newsletter" underline="hover" color="inherit">Marketing Hub</Link>
          <Link component={RouterLink} to={FORMS_PATH} underline="hover" color="inherit">Forms</Link>
          {!isNew && (
            <Link component={RouterLink} to={formDetailsPath(original.id)} underline="hover" color="inherit" sx={{ wordBreak: "break-word" }}>{name}</Link>
          )}
          <Typography color="text.primary">{isNew ? "Create" : "Edit"}</Typography>
        </Breadcrumbs>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ md: "center" }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 850, color: NAVY, wordBreak: "break-word" }}>
              {isNew ? "Create Form" : `Edit Form — ${name}`}
            </Typography>
            <Typography color="text.secondary">
              {isNew
                ? "Creates a native Mautic Form. It starts unpublished; add its fields next, then publish it."
                : "Settings save together; each field saves on its own. Submit actions and submissions are kept as they are."}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button startIcon={<ArrowBackRoundedIcon />} onClick={() => navigate(backPath)} disabled={saving} sx={{ textTransform: "none" }}>
              Back
            </Button>
            {!isNew && original && (
              // Opens the details page's preview of the last saved version; the
              // unsaved-changes guard still asks first if anything is unsaved.
              <Button startIcon={<PreviewRoundedIcon />} onClick={() => navigate(`${formDetailsPath(original.id)}?preview=1`)} disabled={saving}
                sx={{ textTransform: "none" }}>
                Preview saved version
              </Button>
            )}
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveRoundedIcon />}
              onClick={handleSave}
              disabled={saving}
              sx={{ textTransform: "none" }}
            >
              {isNew ? "Create Form" : "Save Settings"}
            </Button>
          </Stack>
        </Stack>
      </Stack>

      {saveError && (
        <Alert severity="error" onClose={() => setSaveError(null)}>
          {saveError.message}
          {saveError.candidates?.length > 0 && (
            <Box component="ul" sx={{ m: 0, mt: 0.5, pl: 2.5 }}>
              {saveError.candidates.map((candidate) => (
                <li key={candidate.id}>
                  <Link component={RouterLink} to={formDetailsPath(candidate.id)}>
                    Form #{candidate.id}: {candidate.name}
                  </Link>{" "}
                  ({candidate.isPublished ? "published" : "unpublished"})
                </li>
              ))}
            </Box>
          )}
        </Alert>
      )}

      <Paper
        component="form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          handleSave();
        }}
        variant="outlined"
        sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, borderColor: CARD_BORDER }}
      >
        <Stack spacing={2.5} sx={{ maxWidth: 760 }}>
          <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 850, color: NAVY }}>Basic Settings</Typography>
          <TextField
            label="Form name"
            value={draft.name}
            onChange={(event) => setField("name", event.target.value)}
            required
            fullWidth
            error={Boolean(fieldErrors.name)}
            helperText={fieldErrors.name || "Shown to admins in Mautic and IMAA Connect."}
            slotProps={{ htmlInput: { maxLength: NAME_MAX_LENGTH } }}
          />
          <TextField
            label="Description"
            value={draft.description}
            onChange={(event) => setField("description", event.target.value)}
            fullWidth
            multiline
            minRows={2}
            error={Boolean(fieldErrors.description)}
            helperText={fieldErrors.description || "Optional internal note."}
            slotProps={{ htmlInput: { maxLength: DESCRIPTION_MAX_LENGTH } }}
          />
          <TextField
            select
            label="After submit"
            value={draft.postAction}
            onChange={(event) => changePostAction(event.target.value)}
            fullWidth
            error={Boolean(fieldErrors.postAction)}
            helperText={fieldErrors.postAction || POST_ACTIONS.find((option) => option.value === draft.postAction)?.help}
          >
            {POST_ACTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
            ))}
          </TextField>
          {draft.postAction !== "return" && (
            <TextField
              label={propertyIsUrl ? "Redirect URL" : "Message after submit"}
              value={draft.postActionProperty}
              onChange={(event) => setField("postActionProperty", event.target.value)}
              required
              fullWidth
              multiline={!propertyIsUrl}
              minRows={propertyIsUrl ? undefined : 3}
              type={propertyIsUrl ? "url" : "text"}
              placeholder={propertyIsUrl ? "https://www.example.com/thank-you" : "Thank you, we will be in touch."}
              error={Boolean(fieldErrors.postActionProperty)}
              helperText={fieldErrors.postActionProperty || (propertyIsUrl ? "A full http:// or https:// address." : "")}
              slotProps={{ htmlInput: { maxLength: propertyIsUrl ? REDIRECT_MAX_LENGTH : MESSAGE_MAX_LENGTH } }}
            />
          )}
          {isNew && (
            <Alert severity="info" variant="outlined">
              The Form is created unpublished with no fields. After creating it, add its fields and a submit button, then publish it.
            </Alert>
          )}
        </Stack>
      </Paper>

      {savedNotice && <Alert severity="success" onClose={() => setSavedNotice("")}>{savedNotice}</Alert>}

      {!isNew && original && (
        <NewsletterFormFieldBuilder form={original} onFormChange={setOriginal} onDirtyChange={onFieldsDirty} />
      )}

      {!isNew && original && (
        <NewsletterFormActionBuilder form={original} onFormChange={setOriginal} onDirtyChange={onActionsDirty} />
      )}

      <UnsavedChangesDialog guard={guard} />
    </Stack>
  );
}
