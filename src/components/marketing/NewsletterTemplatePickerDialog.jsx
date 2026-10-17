import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { getNewsletterTemplate, listNewsletterTemplates } from "../../services/newsletterService";

const PAGE_SIZE = 25;

const errorMessage = (err, fallback) => {
  if (!err?.response) return "We could not reach the server. Check your connection and try again.";
  const data = err.response.data;
  return (typeof data === "string" && data) || data?.detail || fallback;
};

/**
 * Copies the content of one saved Mautic Template into a Broadcast draft.
 *
 * The Template is only read. The Broadcast receives a copy (HTML and plain
 * text; subject and preview text only where the draft's own are empty), so
 * later Template edits never change the Broadcast and vice versa.
 */
export default function NewsletterTemplatePickerDialog({ open, onClose, onApply }) {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [list, setList] = useState({ loading: false, error: "", rows: [], count: 0 });
  const [selected, setSelected] = useState({ loading: false, error: "", template: null });
  const openingId = useRef("");

  useEffect(() => {
    if (!open) return;
    setSearchInput("");
    setSearch("");
    setSelected({ loading: false, error: "", template: null });
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    setList((current) => ({ ...current, loading: true, error: "" }));
    listNewsletterTemplates({ page: 1, page_size: PAGE_SIZE, ...(search ? { search } : {}) })
      .then((data) => {
        if (!active) return;
        setList({
          loading: false,
          error: "",
          rows: Array.isArray(data?.results) ? data.results : [],
          count: Number(data?.count || 0),
        });
      })
      .catch((err) => {
        if (!active) return;
        setList({ loading: false, error: errorMessage(err, "We could not load Templates from Mautic."), rows: [], count: 0 });
      });
    return () => {
      active = false;
    };
  }, [open, search]);

  const choose = async (row) => {
    // One request per click; a second click on another row wins.
    openingId.current = row.id;
    setSelected({ loading: true, error: "", template: null });
    try {
      const template = await getNewsletterTemplate(row.id);
      if (openingId.current !== row.id) return;
      if (!String(template?.customHtml || "").trim()) {
        setSelected({ loading: false, error: "This Template has no HTML content to copy.", template: null });
        return;
      }
      setSelected({ loading: false, error: "", template });
    } catch (err) {
      if (openingId.current !== row.id) return;
      setSelected({ loading: false, error: errorMessage(err, "We could not load this Template."), template: null });
    }
  };

  const apply = () => {
    const template = selected.template;
    if (!template) return;
    onApply({
      html_content: template.customHtml,
      plain_text: template.plainText || "",
      subject: template.subject || "",
      preview_text: template.preheaderText || "",
      templateName: template.name,
      // The caller copies the design only when it is still in sync with this HTML.
      visualDesign: template.visualDesign || null,
    });
  };

  const template = selected.template;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Start from Template</DialogTitle>
      <DialogContent dividers>
        {template ? (
          <Stack spacing={2}>
            <Typography>
              Copy <strong>{template.name || `Template #${template.id}`}</strong> into this draft?
            </Typography>
            <Alert severity="warning" variant="outlined">
              The draft&apos;s content and plain text will be replaced
              {template.visualDesign?.status === "in_sync" ? ", including its visual design" : " (this Template has no visual design, so it opens as HTML)"}.
              Subject and preview text are filled only if they are empty. The Template itself is not
              changed, and later edits to it do not affect this Broadcast.
            </Alert>
            {template.subject ? (
              <Typography variant="body2" color="text.secondary">Template subject: {template.subject}</Typography>
            ) : null}
          </Stack>
        ) : (
          <Stack spacing={2}>
            <Box
              component="form"
              onSubmit={(event) => {
                event.preventDefault();
                setSearch(searchInput.trim());
              }}
            >
              <TextField
                label="Search Templates"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                size="small"
                fullWidth
              />
            </Box>
            {selected.error ? <Alert severity="error">{selected.error}</Alert> : null}
            {list.error ? <Alert severity="error">{list.error}</Alert> : null}
            {list.loading || selected.loading ? (
              <Box sx={{ display: "grid", placeItems: "center", py: 3 }}>
                <CircularProgress size={24} aria-label="Loading Templates" />
              </Box>
            ) : !list.error && list.rows.length === 0 ? (
              <Typography color="text.secondary">
                {search ? "No Templates match your search." : "No Templates exist yet."}
              </Typography>
            ) : (
              <List dense disablePadding>
                {list.rows.map((row) => (
                  <ListItemButton key={row.id} onClick={() => choose(row)} sx={{ borderRadius: 1 }}>
                    <ListItemText primary={row.name || `Template #${row.id}`} secondary={row.subject || "No subject"} />
                  </ListItemButton>
                ))}
              </List>
            )}
            {list.count > list.rows.length ? (
              <Typography variant="caption" color="text.secondary">
                Showing {list.rows.length} of {list.count}. Search to narrow the list.
              </Typography>
            ) : null}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        {template ? (
          <>
            <Button onClick={() => setSelected({ loading: false, error: "", template: null })}>Back</Button>
            <Button variant="contained" onClick={apply}>Copy into Draft</Button>
          </>
        ) : (
          <Button onClick={onClose}>Cancel</Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
