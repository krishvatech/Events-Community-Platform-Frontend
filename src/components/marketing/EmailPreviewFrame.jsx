import React, { useMemo, useState } from "react";
import { Box, FormControlLabel, Paper, Stack, Switch, ToggleButton, ToggleButtonGroup } from "@mui/material";
import DesktopWindowsRoundedIcon from "@mui/icons-material/DesktopWindowsRounded";
import SmartphoneRoundedIcon from "@mui/icons-material/SmartphoneRounded";

const VIEWPORTS = {
  desktop: { label: "Desktop", width: "100%" },
  mobile: { label: "Mobile", width: 375 },
};

const TOKEN_RE = /\{[a-z][a-z0-9_]*(?:=[A-Za-z0-9_]+)?\}/g;

/**
 * Preview-only copy of `html` with Mautic tokens in visible text marked, so
 * reviewers can see where personalization happens. Attributes (e.g.
 * href="{unsubscribe_url}") are left untouched, and the saved email is never
 * changed: this output only feeds the preview iframe.
 */
export function highlightTokensForPreview(html) {
  const source = String(html || "");
  if (!source || typeof DOMParser === "undefined") return source;
  const doc = new DOMParser().parseFromString(source, "text/html");
  const walker = doc.createTreeWalker(doc.body, 4 /* NodeFilter.SHOW_TEXT */);
  const textNodes = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const parent = node.parentNode?.nodeName;
    if (parent !== "SCRIPT" && parent !== "STYLE" && TOKEN_RE.test(node.nodeValue)) textNodes.push(node);
    TOKEN_RE.lastIndex = 0;
  }
  for (const node of textNodes) {
    const fragment = doc.createDocumentFragment();
    let last = 0;
    for (const match of node.nodeValue.matchAll(TOKEN_RE)) {
      fragment.append(node.nodeValue.slice(last, match.index));
      const mark = doc.createElement("mark");
      mark.setAttribute("data-preview-token", "");
      mark.setAttribute("style", "background:#fff3bf;color:inherit;padding:0 2px;border-radius:2px;");
      mark.textContent = match[0];
      fragment.append(mark);
      last = match.index + match[0].length;
    }
    fragment.append(node.nodeValue.slice(last));
    node.replaceWith(fragment);
  }
  return `<!DOCTYPE html>${doc.documentElement.outerHTML}`;
}

/** Sandboxed email preview with desktop/mobile widths and optional token highlighting. */
export default function EmailPreviewFrame({ html, title, height = 420, emptyHtml = "<p>No HTML content available.</p>" }) {
  const [viewport, setViewport] = useState("desktop");
  const [highlight, setHighlight] = useState(false);
  const srcDoc = useMemo(() => {
    const content = html || emptyHtml;
    return highlight ? highlightTokensForPreview(content) : content;
  }, [html, emptyHtml, highlight]);

  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={viewport}
          onChange={(_, value) => value && setViewport(value)}
          aria-label="Preview width"
        >
          <ToggleButton value="desktop" aria-label="Desktop preview" sx={{ textTransform: "none", gap: 0.5 }}>
            <DesktopWindowsRoundedIcon fontSize="small" /> {VIEWPORTS.desktop.label}
          </ToggleButton>
          <ToggleButton value="mobile" aria-label="Mobile preview" sx={{ textTransform: "none", gap: 0.5 }}>
            <SmartphoneRoundedIcon fontSize="small" /> {VIEWPORTS.mobile.label}
          </ToggleButton>
        </ToggleButtonGroup>
        <FormControlLabel
          control={<Switch size="small" checked={highlight} onChange={(event) => setHighlight(event.target.checked)} />}
          label="Highlight personalization tokens"
        />
      </Stack>
      <Paper variant="outlined" sx={{ height, overflow: "hidden", borderRadius: 2, bgcolor: "#f4f6f8" }}>
        <Box sx={{ width: VIEWPORTS[viewport].width, maxWidth: "100%", height: "100%", mx: "auto", bgcolor: "#fff" }}>
          <iframe
            title={title}
            sandbox=""
            srcDoc={srcDoc}
            data-viewport={viewport}
            style={{ width: "100%", height: "100%", border: 0, display: "block" }}
          />
        </Box>
      </Paper>
    </Stack>
  );
}
