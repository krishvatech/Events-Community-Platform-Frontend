import React, { Suspense, forwardRef, lazy, useImperativeHandle, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import CodeRoundedIcon from "@mui/icons-material/CodeRounded";
import DashboardCustomizeRoundedIcon from "@mui/icons-material/DashboardCustomizeRounded";

import { compileNewsletterEmailMjml } from "../../services/newsletterService";
import { readDesign, validateDesignUrls } from "./marketingEmailDesign";
import { findUnknownFieldTokens } from "./marketingEmailTokens";

const MarketingEmailVisualEditor = lazy(() => import("./MarketingEmailVisualEditor.jsx"));

export const MODE_VISUAL = "visual";
export const MODE_HTML = "html";

/** The mode an email opens in: visual only when its saved design still produced its HTML. */
export function initialEmailEditorMode({ isNew, visualDesign }) {
  if (isNew) return MODE_VISUAL;
  return visualDesign?.status === "in_sync" && readDesign(visualDesign.design).ok ? MODE_VISUAL : MODE_HTML;
}

/** The saved design's editor content, or null when there is none it can reopen. */
export function savedDesignContent(visualDesign) {
  const result = readDesign(visualDesign?.design);
  return result.ok ? result.content : null;
}

const SWITCH_PROMPTS = {
  resume: {
    title: "Return to the visual design?",
    body: "Changes made in the HTML editor are not carried into the visual design. When you save in Visual Builder, the visual design replaces them.",
    confirm: "Return to Visual Builder",
  },
  restore: {
    title: "Restore the last visual design?",
    body: "This email's HTML was changed after its visual design was saved. If you save in Visual Builder, the restored design replaces the current HTML.",
    confirm: "Restore Visual Design",
  },
  start: {
    title: "Start a new visual design?",
    body: "This email has no visual design that can be reopened. Visual Builder starts from a new layout, and saving it replaces this email's current HTML.",
    confirm: "Start Visual Design",
  },
};

const errorText = (err, fallback) =>
  err?.response?.data?.detail || (err?.response ? fallback : err?.message) || fallback;

/**
 * Visual Builder / HTML Editor switch for one Marketing email (a Template or
 * a Broadcast). The HTML editor itself is the caller's `htmlEditor` node; the
 * visual side is the isolated MarketingEmailVisualEditor.
 *
 * `itemKey` identifies the email ("template:18", "broadcast:<uuid>", ...):
 * a new key always starts from that email's own saved design.
 */
const MarketingEmailContentEditor = forwardRef(function MarketingEmailContentEditor(
  {
    itemKey,
    isNew = false,
    visualDesign,
    mode,
    onModeChange,
    readOnly = false,
    tokens = [],
    // False while the Mautic token list is still loading: the editor rewrites
    // merge-tag chip labels from it on mount, so it must not start without it.
    tokensReady = true,
    onDesignChange,
    onHtmlFromDesign,
    htmlEditor,
    height = 640,
  },
  ref
) {
  const editorRef = useRef(null);
  const saved = useMemo(() => savedDesignContent(visualDesign), [visualDesign]);
  const status = visualDesign?.status || "none";
  // Content to (re)mount the editor with for this item; `nonce` forces a remount.
  const [override, setOverride] = useState({ itemKey, nonce: 0, content: undefined });
  const active = override.itemKey === itemKey ? override : { itemKey, nonce: 0, content: undefined };
  const [prompt, setPrompt] = useState("");
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState("");
  const [latest, setLatest] = useState(null);
  // What the editor opened with, per mount: compared synchronously, because
  // the editor reports typing only after a short delay.
  const baseline = useRef({ designKey: null, json: "" });

  const initialContent = active.content !== undefined ? active.content : saved;
  const designKey = `${itemKey}:${active.nonce}`;
  const content = latest?.designKey === designKey ? latest.content : null;
  const urlProblems = useMemo(() => (content ? validateDesignUrls(content) : []), [content]);
  const unknownTokens = useMemo(
    () => (content && tokens.length ? findUnknownFieldTokens(content, tokens) : []),
    [content, tokens]
  );

  const remountWith = (nextContent) =>
    setOverride({ itemKey, nonce: active.nonce + 1, content: nextContent });

  useImperativeHandle(ref, () => ({
    /** The design + MJML to save, or null in HTML mode. Throws while the editor is not ready. */
    collect: async () => {
      if (mode !== MODE_VISUAL) return null;
      const editor = editorRef.current;
      if (!editor?.isReady()) throw new Error("The visual editor is still loading. Try again in a moment.");
      const design = editor.getDesign();
      const mjml = await editor.toMjml();
      return { design, mjml };
    },
    /** True when the live design differs from what this editor mount opened with. */
    hasUnsavedDesignChanges: () => {
      if (mode !== MODE_VISUAL || baseline.current.designKey !== designKey) return false;
      const current = editorRef.current?.getContent?.();
      return Boolean(current) && JSON.stringify(current) !== baseline.current.json;
    },
    /** Opens `nextContent` in Visual Builder (e.g. a design copied from a Template). */
    loadDesign: (nextContent) => {
      setError("");
      remountWith(nextContent);
      onModeChange(MODE_VISUAL);
    },
  }));

  const requestVisual = () => {
    setError("");
    if (active.content !== undefined) return setPrompt("resume");
    if (status === "in_sync" && saved) return onModeChange(MODE_VISUAL);
    return setPrompt(saved && status === "stale" ? "restore" : "start");
  };

  const confirmVisual = () => {
    const kind = prompt;
    setPrompt("");
    if (kind === "restore") remountWith(saved);
    else if (kind === "start") remountWith(null);
    onModeChange(MODE_VISUAL);
  };

  const switchToHtml = async () => {
    const editor = editorRef.current;
    if (!editor?.isReady()) return;
    setSwitching(true);
    setError("");
    try {
      const current = editor.getContent();
      const { html } = await compileNewsletterEmailMjml(await editor.toMjml());
      onHtmlFromDesign(html);
      // Kept so a return to Visual Builder resumes this design, not the saved one.
      remountWith(current);
      onModeChange(MODE_HTML);
    } catch (err) {
      setError(errorText(err, "The visual design could not be converted to HTML."));
    } finally {
      setSwitching(false);
    }
  };

  const handleMode = (_, next) => {
    if (!next || next === mode || readOnly || switching) return;
    if (next === MODE_HTML) switchToHtml();
    else requestVisual();
  };

  const visual = mode === MODE_VISUAL && !readOnly;
  const promptCopy = SWITCH_PROMPTS[prompt];

  return (
    <Stack spacing={2}>
      {!readOnly && (
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
          <ToggleButtonGroup exclusive size="small" value={visual ? MODE_VISUAL : MODE_HTML} onChange={handleMode} aria-label="Email editor mode">
            <ToggleButton value={MODE_VISUAL} aria-label="Visual Builder" disabled={switching} sx={{ textTransform: "none", gap: 0.75 }}>
              <DashboardCustomizeRoundedIcon fontSize="small" /> Visual Builder
            </ToggleButton>
            <ToggleButton value={MODE_HTML} aria-label="HTML Editor" disabled={switching} sx={{ textTransform: "none", gap: 0.75 }}>
              <CodeRoundedIcon fontSize="small" /> HTML Editor
            </ToggleButton>
          </ToggleButtonGroup>
          {switching && <CircularProgress size={18} aria-label="Converting design to HTML" />}
        </Stack>
      )}
      {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
      {!visual && status === "stale" && (
        <Alert severity="warning">
          This email&apos;s HTML was changed after its visual design was saved (in the HTML editor or in Mautic).
          The current HTML is what will be sent. You can restore the last visual design from Visual Builder.
        </Alert>
      )}
      {!visual && status === "invalid" && (
        <Alert severity="warning">The saved visual design can no longer be opened, so this email is edited as HTML.</Alert>
      )}
      {!visual && !readOnly && status === "in_sync" && active.content === undefined && (
        <Alert severity="info">
          This email has a visual design. Saving changes made here in HTML keeps the HTML and marks the visual design out of date.
        </Alert>
      )}
      {visual ? (
        <>
          {urlProblems.length > 0 && (
            <Alert severity="warning">
              <Typography variant="body2" sx={{ fontWeight: 700 }}>Check these links and images before sending:</Typography>
              {urlProblems.map((problem) => (
                <Typography key={problem} variant="body2">{problem}</Typography>
              ))}
            </Alert>
          )}
          {unknownTokens.length > 0 && (
            <Alert severity="warning">
              Mautic does not know these fields and will send them as empty text: {unknownTokens.join(", ")}
            </Alert>
          )}
          {!tokensReady ? (
            <Box sx={{ minHeight: height, display: "grid", placeItems: "center" }}>
              <CircularProgress aria-label="Loading Mautic tokens" />
            </Box>
          ) : (
          <Suspense
            fallback={
              <Box sx={{ minHeight: height, display: "grid", placeItems: "center" }}>
                <CircularProgress aria-label="Loading visual editor" />
              </Box>
            }
          >
            <MarketingEmailVisualEditor
              ref={editorRef}
              designKey={designKey}
              initialContent={initialContent}
              tokens={tokens}
              height={height}
              onChange={(next, meta) => {
                setLatest({ designKey, content: next });
                onDesignChange?.(next, meta);
              }}
              onReady={(next) => {
                baseline.current = { designKey, json: JSON.stringify(next) };
                setLatest({ designKey, content: next });
              }}
            />
          </Suspense>
          )}
        </>
      ) : (
        htmlEditor
      )}
      <Dialog open={Boolean(promptCopy)} onClose={() => setPrompt("")} maxWidth="xs" fullWidth>
        <DialogTitle>{promptCopy?.title}</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">{promptCopy?.body}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPrompt("")}>Stay in HTML Editor</Button>
          <Button variant="contained" onClick={confirmVisual}>{promptCopy?.confirm}</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
});

export default MarketingEmailContentEditor;
