import React, { Suspense, lazy, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormHelperText,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { hasComplexBlogHtml } from "../../utils/blogContent";

const BlogRichTextEditor = lazy(() => import("./BlogRichTextEditor.jsx"));

/**
 * Article body editor with a Visual (TipTap) mode and a raw HTML mode.
 * Content the visual editor cannot round-trip (images, tables, figures,
 * classes, inline styles...) opens in HTML mode so nothing is silently lost.
 */
export default function BlogContentEditor({ value, onChange, disabled, error, id = "blog-content" }) {
  const [mode, setMode] = useState(() => (hasComplexBlogHtml(value) ? "html" : "visual"));
  const [confirmVisual, setConfirmVisual] = useState(false);
  const labelId = `${id}-label`;

  const changeMode = (_e, next) => {
    if (!next || next === mode) return;
    if (next === "visual" && hasComplexBlogHtml(value)) {
      setConfirmVisual(true);
      return;
    }
    setMode(next);
  };

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1, gap: 1, flexWrap: "wrap" }}>
        <Typography id={labelId} component="label" sx={{ fontWeight: 700 }}>
          Content
        </Typography>
        <ToggleButtonGroup size="small" exclusive value={mode} onChange={changeMode} aria-label="Editor mode">
          <ToggleButton value="visual" sx={{ textTransform: "none", px: 1.5 }}>Visual</ToggleButton>
          <ToggleButton value="html" sx={{ textTransform: "none", px: 1.5 }}>HTML</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {mode === "visual" ? (
        <Suspense
          fallback={
            <Box sx={{ display: "flex", justifyContent: "center", py: 6, border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
              <CircularProgress size={24} aria-label="Loading editor" />
            </Box>
          }
        >
          <BlogRichTextEditor value={value} onChange={onChange} disabled={disabled} labelledBy={labelId} />
        </Suspense>
      ) : (
        <>
          {hasComplexBlogHtml(value) && (
            <Alert severity="info" sx={{ mb: 1 }}>
              This content contains formatting (such as images, tables or custom markup) that the visual
              editor cannot preserve, so it is shown as HTML.
            </Alert>
          )}
          <TextField
            fullWidth
            multiline
            minRows={14}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            inputProps={{ "aria-labelledby": labelId, spellCheck: false }}
            InputProps={{ sx: { fontFamily: "monospace", fontSize: 13, bgcolor: "#fff" } }}
          />
        </>
      )}
      <FormHelperText error={Boolean(error)}>
        {error || "Required before publishing. Scripts and unsafe markup are removed when the article is displayed."}
      </FormHelperText>

      <Dialog open={confirmVisual} onClose={() => setConfirmVisual(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Switch to the visual editor?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Images, tables and custom formatting in this article may be removed if you edit it in the visual
            editor. Stay in HTML mode to keep them.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmVisual(false)}>Stay in HTML</Button>
          <Button
            color="warning"
            onClick={() => {
              setConfirmVisual(false);
              setMode("visual");
            }}
          >
            Switch anyway
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
