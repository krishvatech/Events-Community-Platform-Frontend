// Rich text for content shown on public pages (Focus Items, Dynamic Content):
// headings, bold, italic, lists and http(s) links. TipTap's schema keeps only
// those, so the HTML it produces never runs script.

import React, { useEffect, useRef } from "react";
import { Box, IconButton, Paper, Stack, Tooltip, Typography } from "@mui/material";
import FormatBoldRoundedIcon from "@mui/icons-material/FormatBoldRounded";
import FormatItalicRoundedIcon from "@mui/icons-material/FormatItalicRounded";
import FormatListBulletedRoundedIcon from "@mui/icons-material/FormatListBulletedRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

const BORDER = "#E7ECEF";

export default function MarketingRichTextEditor({ value, onChange, disabled, error, helperText, label = "Content" }) {
  const emitted = useRef(value || "");
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [2, 3] }, codeBlock: false, link: { openOnClick: false, protocols: ["http", "https"] } })],
    content: value || "",
    editable: !disabled,
    onUpdate: ({ editor: current }) => {
      const html = current.isEmpty ? "" : current.getHTML();
      emitted.current = html;
      onChange(html);
    },
  });
  useEffect(() => {
    if (editor && (value || "") !== emitted.current) {
      emitted.current = value || "";
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [editor, value]);
  const addLink = () => {
    const url = window.prompt("Link address (https://…)", editor?.getAttributes("link")?.href || "https://");
    if (url === null || !editor) return;
    if (!url.trim()) editor.chain().focus().unsetLink().run();
    else if (/^https?:\/\//i.test(url.trim())) editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };
  const tool = (name, icon, onClick, active) => (
    <Tooltip title={name}>
      <span><IconButton size="small" aria-label={name} aria-pressed={Boolean(active)} onClick={onClick} disabled={disabled || !editor}
        color={active ? "primary" : "default"}>{icon}</IconButton></span>
    </Tooltip>
  );
  return (
    <Box>
      <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: error ? "error.main" : BORDER }}>
        <Stack direction="row" spacing={0.5} sx={{ p: 0.5, borderBottom: `1px solid ${BORDER}` }}>
          {tool("Bold", <FormatBoldRoundedIcon fontSize="small" />, () => editor.chain().focus().toggleBold().run(), editor?.isActive("bold"))}
          {tool("Italic", <FormatItalicRoundedIcon fontSize="small" />, () => editor.chain().focus().toggleItalic().run(), editor?.isActive("italic"))}
          {tool("Bulleted list", <FormatListBulletedRoundedIcon fontSize="small" />, () => editor.chain().focus().toggleBulletList().run(), editor?.isActive("bulletList"))}
          {tool("Link", <LinkRoundedIcon fontSize="small" />, addLink, editor?.isActive("link"))}
        </Stack>
        <Box sx={{ p: 1.5, minHeight: 140, "& .ProseMirror": { outline: "none", minHeight: 120 } }} aria-label={label}>
          <EditorContent editor={editor} />
        </Box>
      </Paper>
      <Typography variant="caption" color={error ? "error" : "text.secondary"}>{error || helperText}</Typography>
    </Box>
  );
}
