import React, { useEffect, useId, useRef, useState } from "react";
import { Box, Button, Checkbox, FormControlLabel, IconButton, Paper, Slider, TextField, Tooltip, Typography } from "@mui/material";
import FormatBoldRoundedIcon from "@mui/icons-material/FormatBoldRounded";
import FormatItalicRoundedIcon from "@mui/icons-material/FormatItalicRounded";
import FormatListBulletedRoundedIcon from "@mui/icons-material/FormatListBulletedRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import AdsClickRoundedIcon from "@mui/icons-material/AdsClickRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import UndoRoundedIcon from "@mui/icons-material/UndoRounded";
import RedoRoundedIcon from "@mui/icons-material/RedoRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Node } from "@tiptap/core";
import { apiClient } from "../utils/api.js";
import "./EventRichTextEditor.css";

const Image = Node.create({
  name: "eventImage", group: "block", atom: true,
  addAttributes: () => ({ src: { default: null }, alt: { default: "" }, caption: { default: "" }, width: { default: 100 }, align: { default: "center" } }),
  parseHTML: () => [
    { tag: "figure", getAttrs: element => {
      const image = element.querySelector("img");
      if (!image) return false;
      const align = ["left", "right"].find(item => element.classList.contains(`event-content-image--${item}`)) || "center";
      return { src: image.getAttribute("src"), alt: image.getAttribute("alt") || "", caption: element.querySelector("figcaption")?.textContent || "", width: Number(element.getAttribute("data-width")) || parseInt(element.style.width, 10) || 100, align };
    } },
    { tag: "img[src]", getAttrs: element => ({ src: element.getAttribute("src"), alt: element.getAttribute("alt") || "" }) },
  ],
  renderHTML: ({ node }) => {
    const { src, alt, caption, width, align } = node.attrs;
    const safeWidth = Math.max(15, Math.min(100, Number(width) || 100));
    const safeAlign = ["left", "center", "right"].includes(align) ? align : "center";
    return ["figure", { class: `event-content-image event-content-image--${safeAlign}`, "data-width": safeWidth, style: `width: ${safeWidth}%` }, ["img", { src, alt }], ...(caption ? [["figcaption", {}, caption]] : [])];
  },
});
const Video = Node.create({ name: "eventVideo", group: "block", atom: true, addAttributes: () => ({ src: { default: null }, title: { default: "Event video" } }), parseHTML: () => [{ tag: "iframe[src]" }], renderHTML: ({ HTMLAttributes }) => ["iframe", { ...HTMLAttributes, allowfullscreen: "true" }] });
const Table = Node.create({ name: "eventTable", group: "block", content: "eventRow+", parseHTML: () => [{ tag: "table" }], renderHTML: () => ["table", 0] });
const Row = Node.create({ name: "eventRow", content: "eventCell+", parseHTML: () => [{ tag: "tr" }], renderHTML: () => ["tr", 0] });
const Cell = Node.create({ name: "eventCell", content: "block+", parseHTML: () => [{ tag: "td" }, { tag: "th" }], renderHTML: () => ["td", 0] });
const Cta = Node.create({ name: "eventCta", group: "block", atom: true, addAttributes: () => ({ href: { default: null }, label: { default: "Learn more" } }), parseHTML: () => [{ tag: "a.event-cta", getAttrs: element => ({ href: element.getAttribute("href"), label: element.textContent }) }, { tag: "a.btn", getAttrs: element => ({ href: element.getAttribute("href"), label: element.textContent }) }], renderHTML: ({ node }) => ["a", { class: "event-cta", href: node.attrs.href }, node.attrs.label] });
const safeLink = value => {
  const url = String(value || "").trim();
  return /^(https?:\/\/[^\s"<>]+|mailto:[^\s"<>@]+@[^\s"<>@]+|\/(?!\/)[^\s"<>]*|#[\w-]+)$/i.test(url) ? url : "";
};
export const hasEventDescriptionContent = value => {
  const html = String(value || "");
  return /<(img|iframe|table|a\b[^>]*class=["']event-cta)/i.test(html) || Boolean(html.replace(/<[^>]*>/g, " ").replace(/&nbsp;|&#160;/gi, " ").trim());
};
const videoUrl = value => {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    if (["youtube.com", "www.youtube.com", "youtu.be"].includes(url.hostname)) {
      const id = url.hostname === "youtu.be" ? url.pathname.slice(1) : url.searchParams.get("v") || url.pathname.split("/embed/")[1];
      return /^[\w-]{11}$/.test(id || "") ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (url.hostname === "vimeo.com" && /^\/\d+$/.test(url.pathname)) return `https://player.vimeo.com/video${url.pathname}`;
  } catch { return null; }
  return null;
};

export default function EventRichTextEditor({ value, onChange, error, helperText, onEditorReady }) {
  const id = useId();
  const emitted = useRef(value || "");
  const selection = useRef({ from: 0, to: 0 });
  const fileInput = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState(null);
  const [imagePos, setImagePos] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [1, 2, 3, 4] }, link: { openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer" } } }), Image, Video, Table, Row, Cell, Cta],
    content: value || "", shouldRerenderOnTransaction: true,
    editorProps: { attributes: { role: "textbox", "aria-label": "Public event content", "aria-multiline": "true", "data-placeholder": "Add Description..." } },
    onUpdate: ({ editor: current }) => {
      const value = current.isEmpty ? "" : current.getHTML();
      emitted.current = value;
      onChange(value);
    },
    onSelectionUpdate: ({ editor: current }) => {
      if (current.view.hasFocus()) selection.current = { from: current.state.selection.from, to: current.state.selection.to };
    },
  });
  useEffect(() => { if (editor && (value || "") !== emitted.current) { emitted.current = value || ""; editor.commands.setContent(value || "", { emitUpdate: false }); } }, [editor, value]);
  useEffect(() => { if (editor) onEditorReady?.(editor); }, [editor, onEditorReady]);
  if (!editor) return null;

  const remember = () => { selection.current = { from: editor.state.selection.from, to: editor.state.selection.to }; };
  const restore = () => {
    const max = editor.state.doc.content.size;
    const from = Math.min(selection.current.from, max);
    const to = Math.min(selection.current.to, max);
    return editor.chain().focus().setTextSelection({ from, to });
  };
  const insert = content => { restore().insertContent(content).run(); setMenuOpen(false); setSearch(""); };
  const toolbar = (label, icon, action, active = false, disabled = false) => <Tooltip title={label} key={label}>
    <span><IconButton size="small" aria-label={label} aria-pressed={active} disabled={disabled}
      onMouseDown={event => { remember(); event.preventDefault(); }} onTouchStart={remember} onClick={action}
      sx={{ borderRadius: 1.5, color: active ? "primary.dark" : "text.secondary", bgcolor: active ? "rgba(27,187,179,0.17)" : "transparent", "&:hover": { bgcolor: "rgba(27,187,179,0.10)", color: "primary.dark" } }}>
      {icon}
    </IconButton></span>
  </Tooltip>;
  const format = command => restore()[command]().run();
  const openLink = (kind = "link", existing = false) => {
    if (existing) editor.chain().extendMarkRange("link").run();
    remember();
    const attrs = existing ? editor.getAttributes("link") : {};
    setDialog({ kind, existing, href: attrs.href || "", label: editor.state.doc.textBetween(selection.current.from, selection.current.to) || "", newTab: existing ? attrs.target === "_blank" : true, error: "" });
  };
  const openCta = existing => {
    remember();
    const node = existing ? editor.state.doc.nodeAt(editor.state.selection.from) : null;
    setDialog({ kind: "cta", existing, href: node?.attrs.href || "", label: node?.attrs.label || "Learn more", error: "" });
  };
  const applyDialog = () => {
    const href = safeLink(dialog?.href);
    if (!href) { setDialog(current => ({ ...current, error: "Enter an http(s), email or site link." })); return; }
    const label = dialog.label.trim() || href;
    if (dialog.kind === "cta") {
      if (dialog.existing) editor.chain().focus().setNodeSelection(selection.current.from).updateAttributes("eventCta", { href, label }).run();
      else insert({ type: "eventCta", attrs: { href, label } });
    } else {
      const marks = [{ type: "link", attrs: { href, rel: "noopener noreferrer", target: dialog.newTab && /^https?:\/\//i.test(href) ? "_blank" : null } }];
      restore().insertContent({ type: "text", text: label, marks }).run();
    }
    setDialog(null);
  };
  const removeDialogItem = () => {
    if (dialog.kind === "cta") editor.chain().focus().setNodeSelection(selection.current.from).deleteSelection().run();
    else restore().unsetLink().run();
    setDialog(null);
  };
  const uploadImage = async event => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type) || file.size > 5 * 1024 * 1024) { setUploadError("Use a JPEG, PNG, WebP or GIF smaller than 5 MB."); return; }
    setUploadError(""); setUploading(true);
    try {
      const form = new FormData(); form.append("image", file);
      const response = await apiClient.post("/events/upload-description-image/", form);
      insert({ type: "eventImage", attrs: { src: response.data.url, alt: file.name, caption: "", width: 100, align: "center" } });
    } catch (error) { setUploadError(error?.response?.data?.image || "Could not upload image."); }
    finally { setUploading(false); }
  };
  const chooseImage = () => { remember(); fileInput.current?.click(); };
  const insertBlock = type => {
    if (type === "image") { chooseImage(); setMenuOpen(false); return; }
    if (type === "cta") { openCta(false); setMenuOpen(false); return; }
    if (type === "video") { remember(); setDialog({ kind: "video", href: "", label: "", error: "" }); setMenuOpen(false); return; }
    const blocks = {
      paragraph: "<p>Write your event description here.</p>", h1: "<h1>Large section heading</h1>", h2: "<h2>Section heading</h2>", h3: "<h3>Small heading</h3>",
      list: "<ul><li>First point</li><li>Second point</li></ul>",
      takeaways: "<h3>Key Takeaways</h3><ul><li><strong>Takeaway one:</strong> Explain the main point.</li><li><strong>Takeaway two:</strong> Explain the practical impact.</li></ul>",
    };
    if (type === "table") insert({ type: "eventTable", content: [0, 1].map(() => ({ type: "eventRow", content: [0, 1].map(() => ({ type: "eventCell", content: [{ type: "paragraph" }] })) })) });
    else insert(blocks[type]);
  };
  const updateImage = attrs => {
    if (imagePos === null) return;
    editor.chain().setNodeSelection(imagePos).updateAttributes("eventImage", attrs).run();
  };
  const selectedImage = imagePos === null ? null : editor.state.doc.nodeAt(imagePos)?.type.name === "eventImage" ? editor.state.doc.nodeAt(imagePos) : null;
  const blocks = [
    ["paragraph", "¶", "Paragraph", "Normal text"], ["h1", "H1", "Heading 1", "Large heading"], ["h2", "H2", "Heading 2", "Section heading"], ["h3", "H3", "Heading 3", "Small heading"],
    ["image", "▧", "Image", "Upload image"], ["list", "•", "Bullet List", "Key points"], ["takeaways", "✓", "Key Takeaways", "Ready section"], ["cta", "↗", "Call to Action", "Link button"],
    ["table", "▦", "Table", "Rows and columns"], ["video", "▶", "Video / YouTube", "Embed video"],
  ].filter(block => `${block[2]} ${block[3]}`.toLowerCase().includes(search.toLowerCase().trim()));

  return <Box className="event-rich-field">
    <label htmlFor={id} className="event-rich-label">Public event content</label>
    <Box className={`event-rich-shell ${error ? "is-invalid" : ""}`}>
      <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={uploadImage} />
      <div className="event-rich-toolbar" role="toolbar" aria-label="Description formatting toolbar">
        {toolbar("Paragraph", <Typography component="span" sx={{ fontWeight: 700, fontSize: 14 }}>P</Typography>, () => restore().setParagraph().run(), editor.isActive("paragraph"))}
        {toolbar("Heading 2", <Typography component="span" sx={{ fontWeight: 700, fontSize: 13 }}>H2</Typography>, () => restore().toggleHeading({ level: 2 }).run(), editor.isActive("heading", { level: 2 }))}
        {toolbar("Heading 3", <Typography component="span" sx={{ fontWeight: 700, fontSize: 13 }}>H3</Typography>, () => restore().toggleHeading({ level: 3 }).run(), editor.isActive("heading", { level: 3 }))}
        <span className="event-rich-toolbar-divider" />
        {toolbar("Bold", <FormatBoldRoundedIcon fontSize="small" />, () => format("toggleBold"), editor.isActive("bold"))}
        {toolbar("Italic", <FormatItalicRoundedIcon fontSize="small" />, () => format("toggleItalic"), editor.isActive("italic"))}
        {toolbar("Bulleted list", <FormatListBulletedRoundedIcon fontSize="small" />, () => restore().toggleBulletList().run(), editor.isActive("bulletList"))}
        <span className="event-rich-toolbar-divider" />
        {toolbar("Link", <LinkRoundedIcon fontSize="small" />, () => openLink("link", editor.isActive("link")), editor.isActive("link"))}
        {toolbar(uploading ? "Uploading image" : "Image", <ImageRoundedIcon fontSize="small" />, chooseImage, false, uploading)}
        {toolbar("CTA Button", <AdsClickRoundedIcon fontSize="small" />, () => openCta(false))}
        <span className="event-rich-toolbar-spacer" />
        {toolbar("Undo", <UndoRoundedIcon fontSize="small" />, () => editor.chain().focus().undo().run(), false, !editor.can().undo())}
        {toolbar("Redo", <RedoRoundedIcon fontSize="small" />, () => editor.chain().focus().redo().run(), false, !editor.can().redo())}
      </div>
      {uploadError && <div className="event-rich-error">{uploadError}</div>}
      {dialog && <Paper elevation={6} className="event-rich-popover" role="dialog" aria-label={dialog.kind === "cta" ? "Configure CTA button" : dialog.kind === "video" ? "Embed video" : dialog.existing ? "Edit Link" : "Add Link"}>
        <div className="event-rich-popover-head"><Typography variant="subtitle1" fontWeight={700}>{dialog.kind === "cta" ? "Configure CTA Button" : dialog.kind === "video" ? "Embed Video" : dialog.existing ? "Edit Link" : "Add Link"}</Typography><IconButton size="small" aria-label="Close popup" onClick={() => setDialog(null)}><CloseRoundedIcon fontSize="small" /></IconButton></div>
        <TextField autoFocus size="small" fullWidth label={dialog.kind === "video" ? "YouTube or Vimeo URL" : dialog.kind === "cta" ? "Button URL" : "Link URL"} value={dialog.href} onChange={event => setDialog(current => ({ ...current, href: event.target.value, error: "" }))} placeholder="https://example.com" error={Boolean(dialog.error)} helperText={dialog.error || ""} />
        {dialog.kind !== "video" && <TextField size="small" fullWidth label={dialog.kind === "cta" ? "Button text" : "Display Text"} value={dialog.label} onChange={event => setDialog(current => ({ ...current, label: event.target.value }))} />}
        {dialog.kind === "link" && <FormControlLabel control={<Checkbox size="small" checked={Boolean(dialog.newTab)} onChange={event => setDialog(current => ({ ...current, newTab: event.target.checked }))} />} label="Open website links in a new tab" />}
        <div className="event-rich-popover-actions">{dialog.existing && <Button size="small" color="error" onClick={removeDialogItem}>Remove</Button>}<Button size="small" onClick={() => setDialog(null)}>Cancel</Button><Button size="small" variant="contained" onClick={() => {
          if (dialog.kind === "video") { const src = videoUrl(dialog.href); if (!src) { setDialog(current => ({ ...current, error: "Use a supported HTTPS YouTube or Vimeo URL." })); return; } insert({ type: "eventVideo", attrs: { src } }); setDialog(null); }
          else applyDialog();
        }}>{dialog.existing ? "Update" : "Insert"}</Button></div>
      </Paper>}
      {selectedImage && <Paper elevation={6} className="event-rich-popover event-rich-image-tools" aria-label="Selected image settings">
        <div className="event-rich-popover-head"><Typography variant="subtitle1" fontWeight={700}>Image settings</Typography><IconButton size="small" aria-label="Close image settings" onClick={() => setImagePos(null)}><CloseRoundedIcon fontSize="small" /></IconButton></div>
        <Box component="img" src={selectedImage.attrs.src} alt={selectedImage.attrs.alt || "Image preview"} sx={{ maxWidth: "100%", maxHeight: 140, objectFit: "contain", mx: "auto" }} />
        <div className="event-rich-image-row"><Typography variant="caption">Size</Typography>{[25, 50, 75, 100].map(width => <Button size="small" variant={Number(selectedImage.attrs.width) === width ? "contained" : "outlined"} key={width} onClick={() => updateImage({ width })}>{width}%</Button>)}</div>
        <Typography variant="caption">Custom size: {selectedImage.attrs.width}%</Typography><Slider size="small" min={15} max={100} value={Number(selectedImage.attrs.width)} onChange={(_event, width) => updateImage({ width })} aria-label="Image width" />
        <div className="event-rich-image-row"><Typography variant="caption">Align</Typography>{["left", "center", "right"].map(align => <Button size="small" key={align} variant={selectedImage.attrs.align === align ? "contained" : "outlined"} onClick={() => updateImage({ align })}>{align}</Button>)}</div>
        <TextField size="small" fullWidth label="Alt text" value={selectedImage.attrs.alt || ""} onChange={event => updateImage({ alt: event.target.value })} />
        <TextField size="small" fullWidth multiline minRows={2} label="Caption" value={selectedImage.attrs.caption || ""} onChange={event => updateImage({ caption: event.target.value })} />
        <Button size="small" color="error" onClick={() => { editor.chain().setNodeSelection(imagePos).deleteSelection().run(); setImagePos(null); }}>Remove image</Button>
      </Paper>}
      <div className="event-rich-content-wrap" onClick={event => {
        const image = event.target.closest("figure, img");
        if (image) { const pos = editor.view.posAtDOM(image.closest("figure") || image, 0); if (editor.state.doc.nodeAt(pos)?.type.name === "eventImage") { setImagePos(pos); setDialog(null); return; } }
        setImagePos(null);
        const anchor = event.target.closest("a");
        if (anchor?.classList.contains("event-cta")) { event.preventDefault(); const pos = editor.view.posAtDOM(anchor, 0); editor.chain().setNodeSelection(pos).run(); openCta(true); return; }
        if (anchor) { event.preventDefault(); editor.chain().extendMarkRange("link").run(); openLink("link", true); }
      }}>
        {editor.isEmpty && <span className="event-rich-placeholder">Add Description...</span>}
        <EditorContent editor={editor} id={id} />
      </div>
      <div className="event-rich-inserter-wrap"><Tooltip title="Add content block"><IconButton className="event-rich-plus" aria-label="Add content block" onMouseDown={event => { remember(); event.preventDefault(); }} onClick={() => setMenuOpen(open => !open)}><AddRoundedIcon /></IconButton></Tooltip>
        {menuOpen && <div className="event-rich-menu"><input autoFocus aria-label="Search content blocks" placeholder="Search" value={search} onChange={event => setSearch(event.target.value)} /><div className="event-rich-block-grid">{blocks.map(([type, icon, label, description]) => <button type="button" key={type} onMouseDown={event => event.preventDefault()} onClick={() => insertBlock(type)}><strong>{icon}</strong><span>{label}</span><small>{description}</small></button>)}</div><button type="button" className="event-rich-browse" onClick={() => setSearch("")}>Browse all</button></div>}
      </div>
    </Box>
    {helperText && <small className="event-rich-error">{helperText}</small>}
  </Box>;
}
