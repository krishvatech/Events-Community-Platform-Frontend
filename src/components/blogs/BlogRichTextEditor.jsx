import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  TextField,
  Tooltip,
} from "@mui/material";
import FormatBoldRoundedIcon from "@mui/icons-material/FormatBoldRounded";
import FormatItalicRoundedIcon from "@mui/icons-material/FormatItalicRounded";
import FormatListBulletedRoundedIcon from "@mui/icons-material/FormatListBulletedRounded";
import FormatListNumberedRoundedIcon from "@mui/icons-material/FormatListNumberedRounded";
import FormatQuoteRoundedIcon from "@mui/icons-material/FormatQuoteRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import LinkOffRoundedIcon from "@mui/icons-material/LinkOffRounded";
import UndoRoundedIcon from "@mui/icons-material/UndoRounded";
import RedoRoundedIcon from "@mui/icons-material/RedoRounded";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

const EMPTY_DOC = "<p></p>";
const normalizeOut = (html) => (html === EMPTY_DOC ? "" : html);
const SAFE_LINK = /^(https?:\/\/|mailto:|\/|#)/i;

/**
 * Visual article editor (TipTap). Loaded lazily so the reader pages never pay
 * for it. Emits HTML through `onChange`; the reader sanitises on render.
 */
export default function BlogRichTextEditor({ value, onChange, disabled = false, labelledBy }) {
  const lastEmitted = useRef(value || "");
  const [linkDialog, setLinkDialog] = useState(null); // { href }

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        code: false,
        codeBlock: false,
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: "https",
          HTMLAttributes: { rel: "noopener noreferrer", target: null },
        },
      }),
    ],
    content: value || "",
    editable: !disabled,
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-multiline": "true",
        ...(labelledBy ? { "aria-labelledby": labelledBy } : {}),
      },
    },
    onUpdate: ({ editor: current }) => {
      const html = normalizeOut(current.getHTML());
      lastEmitted.current = html;
      onChange(html);
    },
  });

  // Apply external value changes (e.g. switching back from HTML mode).
  useEffect(() => {
    if (!editor) return;
    const incoming = value || "";
    if (incoming !== lastEmitted.current) {
      lastEmitted.current = incoming;
      editor.commands.setContent(incoming, { emitUpdate: false });
    }
  }, [editor, value]);

  useEffect(() => {
    if (editor) editor.setEditable(!disabled);
  }, [editor, disabled]);

  if (!editor) return null;

  const tool = (label, icon, onClick, active = false, isDisabled = false) => (
    <Tooltip title={label} key={label}>
      <span>
        <IconButton
          size="small"
          aria-label={label}
          aria-pressed={active}
          onClick={onClick}
          disabled={disabled || isDisabled}
          sx={{ borderRadius: 1, color: active ? "primary.main" : "text.secondary", bgcolor: active ? "action.selected" : "transparent" }}
        >
          {icon}
        </IconButton>
      </span>
    </Tooltip>
  );

  const textTool = (label, text, onClick, active) => (
    <Button
      key={label}
      size="small"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      disabled={disabled}
      sx={{ minWidth: 36, fontWeight: 800, textTransform: "none", color: active ? "primary.main" : "text.secondary", bgcolor: active ? "action.selected" : "transparent" }}
    >
      {text}
    </Button>
  );

  const chain = () => editor.chain().focus();

  const applyLink = () => {
    const href = (linkDialog?.href || "").trim();
    setLinkDialog(null);
    if (!href) {
      chain().extendMarkRange("link").unsetLink().run();
      return;
    }
    if (!SAFE_LINK.test(href)) return;
    chain().extendMarkRange("link").setLink({ href }).run();
  };

  const linkHref = (linkDialog?.href || "").trim();
  const linkInvalid = Boolean(linkHref) && !SAFE_LINK.test(linkHref);

  return (
    <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, bgcolor: "#fff" }}>
      <Box
        role="toolbar"
        aria-label="Formatting"
        sx={{ display: "flex", flexWrap: "wrap", gap: 0.25, p: 0.5, borderBottom: "1px solid", borderColor: "divider" }}
      >
        {textTool("Paragraph", "P", () => chain().setParagraph().run(), editor.isActive("paragraph"))}
        {textTool("Heading 2", "H2", () => chain().toggleHeading({ level: 2 }).run(), editor.isActive("heading", { level: 2 }))}
        {textTool("Heading 3", "H3", () => chain().toggleHeading({ level: 3 }).run(), editor.isActive("heading", { level: 3 }))}
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
        {tool("Bold", <FormatBoldRoundedIcon fontSize="small" />, () => chain().toggleBold().run(), editor.isActive("bold"))}
        {tool("Italic", <FormatItalicRoundedIcon fontSize="small" />, () => chain().toggleItalic().run(), editor.isActive("italic"))}
        {tool("Bulleted list", <FormatListBulletedRoundedIcon fontSize="small" />, () => chain().toggleBulletList().run(), editor.isActive("bulletList"))}
        {tool("Numbered list", <FormatListNumberedRoundedIcon fontSize="small" />, () => chain().toggleOrderedList().run(), editor.isActive("orderedList"))}
        {tool("Quote", <FormatQuoteRoundedIcon fontSize="small" />, () => chain().toggleBlockquote().run(), editor.isActive("blockquote"))}
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
        {tool("Add link", <LinkRoundedIcon fontSize="small" />, () => setLinkDialog({ href: editor.getAttributes("link").href || "" }), editor.isActive("link"))}
        {tool("Remove link", <LinkOffRoundedIcon fontSize="small" />, () => chain().unsetLink().run(), false, !editor.isActive("link"))}
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
        {tool("Undo", <UndoRoundedIcon fontSize="small" />, () => chain().undo().run(), false, !editor.can().undo())}
        {tool("Redo", <RedoRoundedIcon fontSize="small" />, () => chain().redo().run(), false, !editor.can().redo())}
      </Box>

      <Box
        sx={{
          px: 2,
          py: 1,
          minHeight: 280,
          "& .ProseMirror": { minHeight: 260, outline: "none", lineHeight: 1.7 },
          "& .ProseMirror:focus-visible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: 4 },
          "& .ProseMirror h2": { fontSize: 24, fontWeight: 800 },
          "& .ProseMirror h3": { fontSize: 20, fontWeight: 800 },
          "& .ProseMirror blockquote": { borderLeft: "4px solid #0A9396", m: 0, pl: 2, color: "text.secondary" },
          "& .ProseMirror a": { color: "#0A9396", textDecoration: "underline" },
          "& .ProseMirror ul, & .ProseMirror ol": { pl: 3 },
          "& .ProseMirror ul": { listStyleType: "disc" },
          "& .ProseMirror ol": { listStyleType: "decimal" },
          "& .ProseMirror p": { my: 1 },
        }}
      >
        <EditorContent editor={editor} />
      </Box>

      <Dialog open={Boolean(linkDialog)} onClose={() => setLinkDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Link</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            margin="dense"
            label="URL"
            placeholder="https://example.com"
            value={linkDialog?.href || ""}
            onChange={(e) => setLinkDialog({ href: e.target.value })}
            error={linkInvalid}
            helperText={linkInvalid ? "Use an http(s), mailto: or site-relative link." : "Leave empty to remove the link."}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !linkInvalid) {
                e.preventDefault();
                applyLink();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLinkDialog(null)}>Cancel</Button>
          <Button variant="contained" onClick={applyLink} disabled={linkInvalid}>
            Apply
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
