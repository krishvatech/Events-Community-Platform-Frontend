import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";

import {
  createNewsletterAsset,
  getNewsletterAsset,
  getNewsletterAssetMetadata,
  updateNewsletterAsset,
} from "../services/newsletterService";
import {
  ASSETS_PATH,
  CARD_BORDER,
  DESCRIPTION_MAX_LENGTH,
  NAVY,
  TITLE_MAX_LENGTH,
  assetFormData,
  assetPath,
  assetToDraft,
  blankAsset,
  formatBytes,
  getErrorMessage,
  isValidAssetId,
  titleFromFileName,
  validateAssetDraft,
} from "./newsletterAssetShared.jsx";

function Section({ title, help, children }) {
  return (
    <Paper variant="outlined" component="section" aria-label={title} sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 2, borderColor: CARD_BORDER }}>
      <Typography component="h2" sx={{ fontWeight: 850, color: NAVY }}>{title}</Typography>
      {help && <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{help}</Typography>}
      <Box sx={{ mt: help ? 0 : 2 }}>{children}</Box>
    </Paper>
  );
}

export default function AdminNewsletterAssetEditorPage() {
  const { assetId } = useParams();
  const navigate = useNavigate();
  const editing = assetId !== undefined;
  const fileInput = useRef(null);
  const [asset, setAsset] = useState(null);
  const [draft, setDraft] = useState(blankAsset);
  const [meta, setMeta] = useState(null);
  const [source, setSource] = useState("upload");
  const [file, setFile] = useState(null);
  const [remoteUrl, setRemoteUrl] = useState("");
  const [replace, setReplace] = useState(!editing);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setLoadError("");
      try {
        if (editing && !isValidAssetId(assetId)) throw Object.assign(new Error("bad id"), { notFound: true });
        const [metadata, existing] = await Promise.all([getNewsletterAssetMetadata(), editing ? getNewsletterAsset(assetId) : Promise.resolve(null)]);
        if (!active) return;
        setMeta(metadata);
        if (existing) {
          setAsset(existing);
          setDraft(assetToDraft(existing));
          setSource(existing.storageLocation === "remote" ? "remote" : "upload");
        }
      } catch (err) {
        if (active) setLoadError(err?.notFound || err?.response?.status === 404 ? "That asset does not exist." : getErrorMessage(err, "We could not load the asset."));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [editing, assetId]);

  const set = (patch) => setDraft((current) => ({ ...current, ...patch }));

  const chooseFile = (chosen) => {
    setFile(chosen || null);
    // A new asset takes its title from the file name unless one was typed.
    if (chosen && !draft.title.trim()) set({ title: titleFromFileName(chosen.name).slice(0, TITLE_MAX_LENGTH) });
  };

  const sending = replace || !editing;
  const problem = validateAssetDraft(draft, {
    source,
    file: sending && source === "upload" ? file : null,
    remoteUrl: sending && source === "remote" ? remoteUrl : "",
    creating: !editing || (replace && editing),
    config: meta,
  });

  const save = async () => {
    if (problem) {
      setSaveError(problem);
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      const payload = assetFormData(draft, {
        file: sending && source === "upload" ? file : null,
        remoteUrl: sending && source === "remote" ? remoteUrl : "",
      });
      const saved = editing ? await updateNewsletterAsset(assetId, payload) : await createNewsletterAsset(payload);
      navigate(assetPath(saved.id), { state: { flash: editing ? "Asset saved." : "Asset added." } });
    } catch (err) {
      setSaveError(getErrorMessage(err, "The asset could not be saved."));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Stack alignItems="center" sx={{ py: 8 }}><CircularProgress aria-label="Loading asset" /></Stack>;
  if (loadError) {
    return (
      <Stack spacing={2}>
        <Alert severity="error">{loadError}</Alert>
        <Button component={RouterLink} to={ASSETS_PATH} startIcon={<ArrowBackRoundedIcon />} sx={{ alignSelf: "flex-start", textTransform: "none" }}>Back to Assets</Button>
      </Stack>
    );
  }

  const allowed = (meta?.allowedExtensions || []).map((item) => `.${item}`).join(", ");
  const maxMb = Number(meta?.maxSizeMb || 6);

  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
        <Box sx={{ minWidth: 0 }}>
          <Button component={RouterLink} to={editing ? assetPath(assetId) : ASSETS_PATH} startIcon={<ArrowBackRoundedIcon />} size="small" sx={{ textTransform: "none", mb: 1 }}>
            {editing ? "Back to asset" : "Back to Assets"}
          </Button>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 850, color: NAVY, wordBreak: "break-word" }}>
            {editing ? `Edit ${asset?.title || "asset"}` : "Add Asset"}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="flex-start">
          <Button onClick={() => navigate(editing ? assetPath(assetId) : ASSETS_PATH)} disabled={saving} sx={{ textTransform: "none" }}>Cancel</Button>
          <Button variant="contained" startIcon={<SaveRoundedIcon />} onClick={save} disabled={saving} sx={{ textTransform: "none", whiteSpace: "nowrap" }}>
            {saving ? "Saving…" : editing ? "Save Asset" : "Add Asset"}
          </Button>
        </Stack>
      </Stack>

      {saveError && <Alert severity="error" onClose={() => setSaveError("")}>{saveError}</Alert>}

      <Section title="File" help={editing ? "Keep the current file, or replace it with a new upload or link." : "Upload a file to Mautic, or link to a file hosted elsewhere."}>
        <Stack spacing={2}>
          {editing && (
            <Stack spacing={1}>
              <Typography variant="body2">
                {asset?.storageLocation === "remote" ? `Current link: ${asset.remotePath}` : `Current file: ${asset?.originalFileName || "—"} (${formatBytes(asset?.size)})`}
              </Typography>
              <FormControlLabel control={<Switch checked={replace} onChange={(event) => setReplace(event.target.checked)} />} label="Replace the file" />
            </Stack>
          )}
          {sending && (
            <>
              <ToggleButtonGroup exclusive size="small" value={source} onChange={(_, value) => value && setSource(value)} aria-label="File source">
                <ToggleButton value="upload" sx={{ textTransform: "none" }}>Upload a file</ToggleButton>
                <ToggleButton value="remote" sx={{ textTransform: "none" }}>Link to a file</ToggleButton>
              </ToggleButtonGroup>
              {source === "upload" ? (
                <Box
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => { event.preventDefault(); chooseFile(event.dataTransfer.files?.[0]); }}
                  sx={{ border: "2px dashed", borderColor: CARD_BORDER, borderRadius: 2, p: 3, textAlign: "center" }}
                >
                  <CloudUploadRoundedIcon color="action" />
                  <Typography sx={{ mt: 1, wordBreak: "break-word" }}>{file ? `${file.name} (${formatBytes(file.size)})` : "Drop a file here, or"}</Typography>
                  <Button variant="outlined" size="small" onClick={() => fileInput.current?.click()} sx={{ mt: 1, textTransform: "none" }}>
                    {file ? "Choose another file" : "Choose a file"}
                  </Button>
                  <input ref={fileInput} type="file" hidden aria-label="Asset file" accept={allowed}
                    onChange={(event) => chooseFile(event.target.files?.[0])} />
                  <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 1 }}>{`${allowed} · up to ${maxMb} MB`}</Typography>
                </Box>
              ) : (
                <TextField label="Link to the file" value={remoteUrl} onChange={(event) => setRemoteUrl(event.target.value)} placeholder="https://"
                  helperText="A public https:// address of the file itself (links that redirect are refused). Downloads are tracked, then redirected there." />
              )}
            </>
          )}
        </Stack>
      </Section>

      <Section title="Details">
        <Stack spacing={2}>
          <TextField label="Title" required value={draft.title} onChange={(event) => set({ title: event.target.value })} inputProps={{ maxLength: TITLE_MAX_LENGTH }} />
          <TextField label="Description" value={draft.description} onChange={(event) => set({ description: event.target.value })} multiline minRows={2}
            inputProps={{ maxLength: DESCRIPTION_MAX_LENGTH }} />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField select label="Category" value={draft.category} onChange={(event) => set({ category: event.target.value })} sx={{ minWidth: 220 }}>
              <MenuItem value="">No category</MenuItem>
              {(meta?.categories || []).map((category) => <MenuItem key={category.id} value={String(category.id)}>{category.title}</MenuItem>)}
            </TextField>
            <TextField label="Language" value={draft.language} onChange={(event) => set({ language: event.target.value })} helperText="e.g. en, fr_FR" sx={{ maxWidth: 200 }} />
          </Stack>
        </Stack>
      </Section>

      <Section title="Publishing" help="Unpublished assets cannot be downloaded by contacts.">
        <Stack spacing={2}>
          <FormControlLabel control={<Switch checked={draft.isPublished} onChange={(event) => set({ isPublished: event.target.checked })} />} label="Published" />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField type="datetime-local" label="Publish from (UTC)" value={draft.publishUp} onChange={(event) => set({ publishUp: event.target.value })} InputLabelProps={{ shrink: true }} />
            <TextField type="datetime-local" label="Unpublish at (UTC)" value={draft.publishDown} onChange={(event) => set({ publishDown: event.target.value })} InputLabelProps={{ shrink: true }} />
          </Stack>
          {(source === "upload" && (sending || asset?.storageLocation !== "remote")) && (
            <FormControlLabel control={<Switch checked={draft.disallow} onChange={(event) => set({ disallow: event.target.checked })} />}
              label="Ask search engines not to index this file" />
          )}
        </Stack>
      </Section>
    </Stack>
  );
}
