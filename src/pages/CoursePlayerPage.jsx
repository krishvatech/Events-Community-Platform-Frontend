// src/pages/CoursePlayerPage.jsx
// Custom in-platform course player — section-based layout matching the LMS UX.
// Sidebar lists sections; main area shows all modules of the active section
// as a scrollable vertical page (same as Moodle's course/view.php).

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  IconButton,
  LinearProgress,
  Skeleton,
  Snackbar,
  Tooltip,
  Typography,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import OndemandVideoRoundedIcon from "@mui/icons-material/OndemandVideoRounded";
import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";
import QuizRoundedIcon from "@mui/icons-material/QuizRounded";
import ArticleRoundedIcon from "@mui/icons-material/ArticleRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import FolderRoundedIcon from "@mui/icons-material/FolderRounded";
import AssignmentRoundedIcon from "@mui/icons-material/AssignmentRounded";
import ForumRoundedIcon from "@mui/icons-material/ForumRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import DoneRoundedIcon from "@mui/icons-material/DoneRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

const RAW_BASE = (import.meta.env.VITE_API_BASE_URL || "").trim();
const API_BASE = RAW_BASE.endsWith("/") ? RAW_BASE.slice(0, -1) : RAW_BASE;
const PROGRESS_POLL_MS = 60_000;

function decodeEntities(str) {
  if (!str) return str;
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function authHeaders() {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...authHeaders(), ...options.headers },
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

// ── Module icon ───────────────────────────────────────────────────────────────
function ModuleIcon({ modtype, mimetype, sx = {} }) {
  const base = { fontSize: 20, ...sx };
  if (modtype === "quiz") return <QuizRoundedIcon sx={base} />;
  if (modtype === "assign") return <AssignmentRoundedIcon sx={base} />;
  if (modtype === "forum") return <ForumRoundedIcon sx={base} />;
  if (modtype === "url") return <LinkRoundedIcon sx={base} />;
  if (modtype === "folder") return <FolderRoundedIcon sx={base} />;
  if (modtype === "resource") {
    if (mimetype?.startsWith("video/")) return <OndemandVideoRoundedIcon sx={base} />;
    if (mimetype === "application/pdf") return <PictureAsPdfRoundedIcon sx={base} />;
  }
  return <ArticleRoundedIcon sx={base} />;
}

// ── Icon color per modtype ────────────────────────────────────────────────────
function moduleColor(modtype, mimetype) {
  if (modtype === "assign") return "#ec4899";
  if (modtype === "quiz") return "#8b5cf6";
  if (modtype === "forum") return "#f59e0b";
  if (modtype === "resource" && mimetype?.startsWith("video/")) return "#1bbbb3";
  if (modtype === "resource" && mimetype === "application/pdf") return "#ef4444";
  return "#6b7280";
}

// ── Top bar ───────────────────────────────────────────────────────────────────
function PlayerTopBar({ course, progress, completed, refreshing, onRefresh }) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        px: 2,
        py: 1.25,
        bgcolor: "#ffffff",
        color: "#111827",
        borderBottom: "1px solid #e5e7eb",
        boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.08)",
        flexShrink: 0,
        flexWrap: "wrap",
      }}
    >
      <Tooltip title="Back to My Courses">
        <IconButton
          component="a"
          href="/account/courses"
          size="small"
          sx={{ color: "#9ca3af", "&:hover": { color: "#111827" } }}
        >
          <ArrowBackRoundedIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="subtitle1" fontWeight={600} noWrap sx={{ color: "#111827", lineHeight: 1.3 }}>
          {decodeEntities(course?.full_name) || "Loading…"}
        </Typography>
        {course?.category_name && (
          <Chip
            label={decodeEntities(course.category_name)}
            size="small"
            sx={{ mt: 0.25, bgcolor: "#1bbbb322", color: "#1bbbb3", height: 18, fontSize: 11 }}
          />
        )}
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 160 }}>
        {completed ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "#34d399" }}>
            <CheckCircleRoundedIcon fontSize="small" />
            <Typography variant="caption" fontWeight={600}>Completed</Typography>
          </Box>
        ) : (
          <>
            <Box sx={{ flex: 1, minWidth: 80 }}>
              <LinearProgress
                variant="determinate"
                value={progress || 0}
                sx={{
                  height: 6, borderRadius: 3, bgcolor: "#e5e7eb",
                  "& .MuiLinearProgress-bar": { bgcolor: "#1bbbb3", borderRadius: 3 },
                }}
              />
            </Box>
            <Typography variant="caption" sx={{ color: "#9ca3af", whiteSpace: "nowrap" }}>
              {Math.round(progress || 0)}%
            </Typography>
          </>
        )}
      </Box>

      <Tooltip title="Refresh progress">
        <IconButton
          size="small"
          onClick={onRefresh}
          disabled={refreshing}
          sx={{ color: "#9ca3af", "&:hover": { color: "#111827" } }}
        >
          {refreshing
            ? <CircularProgress size={16} sx={{ color: "#1bbbb3" }} />
            : <RefreshRoundedIcon fontSize="small" />}
        </IconButton>
      </Tooltip>
    </Box>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function CourseSidebar({ sections, activeSectionId, activeModuleId, onSelectSection, onSelectModule, loading }) {
  const [openSections, setOpenSections] = useState({});

  // Auto-open the active section
  useEffect(() => {
    if (activeSectionId != null) {
      setOpenSections((prev) => ({ ...prev, [activeSectionId]: true }));
    }
  }, [activeSectionId]);

  const toggle = (id) => setOpenSections((p) => ({ ...p, [id]: !p[id] }));

  if (loading) {
    return (
      <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} height={40} sx={{ bgcolor: "#e5e7eb", borderRadius: 1 }} />
        ))}
      </Box>
    );
  }

  return (
    <Box sx={{ overflowY: "auto", flex: 1, py: 1 }}>
      {(sections || []).map((section) => {
        const mods = (section.modules || []);
        const isActive = section.id === activeSectionId;
        const isOpen = openSections[section.id] !== false;
        const completed = mods.filter((m) => m.completed).length;
        const total = mods.length;

        return (
          <Box key={section.id}>
            {/* Section header */}
            <Box
              onClick={() => { onSelectSection(section); toggle(section.id); }}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                px: 2,
                py: 1,
                cursor: "pointer",
                bgcolor: isActive && !activeModuleId ? "#1bbbb318" : "transparent",
                borderLeft: isActive && !activeModuleId ? "3px solid #1bbbb3" : "3px solid transparent",
                "&:hover": { bgcolor: isActive && !activeModuleId ? "#1bbbb318" : "#f3f4f6" },
              }}
            >
              {isOpen
                ? <ExpandMoreRoundedIcon sx={{ fontSize: 16, color: "#6b7280", flexShrink: 0 }} />
                : <ChevronRightRoundedIcon sx={{ fontSize: 16, color: "#6b7280", flexShrink: 0 }} />}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="caption"
                  fontWeight={700}
                  sx={{
                    color: isActive ? "#1bbbb3" : "#374151",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    display: "block",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {decodeEntities(section.name) || `Section ${section.position + 1}`}
                </Typography>
                {total > 0 && (
                  <Typography variant="caption" sx={{ color: "#6b7280", fontSize: 10 }}>
                    {completed}/{total} completed
                  </Typography>
                )}
              </Box>
            </Box>

            {/* Module list */}
            <Collapse in={isOpen}>
              {mods.map((mod) => {
                const isModActive = mod.moodle_module_id === activeModuleId;
                return (
                  <Box
                    key={mod.id}
                    onClick={() => { onSelectModule(section, mod); }}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      pl: 3.5,
                      pr: 2,
                      py: 0.75,
                      cursor: "pointer",
                      bgcolor: isModActive ? "#1bbbb318" : "transparent",
                      borderLeft: isModActive ? "3px solid #1bbbb3" : "3px solid transparent",
                      "&:hover": { bgcolor: isModActive ? "#1bbbb318" : "#f3f4f6" },
                    }}
                  >
                    <Box sx={{ color: mod.completed ? "#34d399" : moduleColor(mod.modtype, mod.content_mimetype), flexShrink: 0 }}>
                      {mod.completed
                        ? <CheckCircleRoundedIcon sx={{ fontSize: 16 }} />
                        : <ModuleIcon modtype={mod.modtype} mimetype={mod.content_mimetype} sx={{ fontSize: 16 }} />}
                    </Box>
                    <Typography
                      variant="body2"
                      sx={{
                        color: isModActive ? "#1bbbb3" : mod.completed ? "#9ca3af" : "#374151",
                        fontSize: 12,
                        fontWeight: isModActive ? 600 : 400,
                        flex: 1,
                        minWidth: 0,
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      {decodeEntities(mod.name)}
                    </Typography>
                    {!mod.visible && <LockRoundedIcon sx={{ fontSize: 12, color: "#9ca3af", flexShrink: 0 }} />}
                  </Box>
                );
              })}
            </Collapse>
            <Divider sx={{ borderColor: "#e5e7eb", my: 0.5 }} />
          </Box>
        );
      })}
    </Box>
  );
}

// ── Full-screen in-platform module detail viewer ──────────────────────────────
function ModuleLaunchModal({ courseId, module, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!module) return;
    let cancelled = false;
    setLoading(true);
    setDetail(null);
    setError(null);
    apiFetch(`/courses/${courseId}/modules/${module.moodle_module_id}/detail/`)
      .then((d) => { if (!cancelled) { setDetail(d); setLoading(false); } })
      .catch(() => { if (!cancelled) { setError(true); setLoading(false); } });
    return () => { cancelled = true; };
  }, [courseId, module]);

  if (!module) return null;
  const { name, module_url, modtype, content_mimetype } = module;
  const color = moduleColor(modtype, content_mimetype);

  // Format unix timestamp
  const fmtDate = (ts) => ts ? new Date(ts * 1000).toLocaleDateString(undefined, { dateStyle: "medium" }) : null;

  return (
    <Box sx={{ position: "fixed", inset: 0, zIndex: 1300, display: "flex", flexDirection: "column", bgcolor: "#f9fafb" }}>
      {/* Top bar */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2, py: 1, bgcolor: "#ffffff", borderBottom: "1px solid #e5e7eb", flexShrink: 0 }}>
        <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: `${color}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <ModuleIcon modtype={modtype} mimetype={content_mimetype} sx={{ fontSize: 18, color }} />
        </Box>
        <Typography variant="subtitle2" fontWeight={600} sx={{ flex: 1, minWidth: 0, color: "#111827" }} noWrap>
          {decodeEntities(name)}
        </Typography>
        {module_url && (
          <Tooltip title="Open in LMS">
            <IconButton component="a" href={module_url} target="_blank" rel="noopener noreferrer" size="small" sx={{ color: "#9ca3af", "&:hover": { color: "#111827" } }}>
              <OpenInNewRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title="Close">
          <IconButton size="small" onClick={onClose} sx={{ color: "#9ca3af", "&:hover": { color: "#111827" } }}>
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflowY: "auto", p: 3, display: "flex", justifyContent: "center" }}>
        <Box sx={{ width: "100%", maxWidth: 860 }}>
          {loading && (
            <Box sx={{ display: "flex", justifyContent: "center", pt: 8 }}>
              <CircularProgress sx={{ color: "#1bbbb3" }} />
            </Box>
          )}

          {!loading && (error || !detail) && (
            <Box sx={{ textAlign: "center", pt: 6 }}>
              <Typography sx={{ color: "#6b7280", mb: 2 }}>Could not load content.</Typography>
              {module_url && (
                <Button variant="outlined" endIcon={<OpenInNewRoundedIcon />} href={module_url} target="_blank" rel="noopener noreferrer" sx={{ textTransform: "none" }}>
                  Open in LMS
                </Button>
              )}
            </Box>
          )}

          {!loading && detail && (
            <Box>
              {/* Assignment */}
              {modtype === "assign" && (
                <Box>
                  <Typography variant="h6" fontWeight={700} sx={{ color: "#111827", mb: 2, pb: 1.5, borderBottom: "1px solid #e5e7eb" }}>
                    {decodeEntities(detail.name)}
                  </Typography>

                  {/* Meta row */}
                  <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 2.5 }}>
                    {detail.allowsubmissionsfromdate > 0 && (
                      <Chip label={`Opens: ${fmtDate(detail.allowsubmissionsfromdate)}`} size="small" sx={{ bgcolor: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0" }} />
                    )}
                    {detail.duedate > 0 && (
                      <Chip label={`Due: ${fmtDate(detail.duedate)}`} size="small" sx={{ bgcolor: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" }} />
                    )}
                    {detail.nosubmissions === 1 && (
                      <Chip label="No submission required" size="small" sx={{ bgcolor: "#f0f9ff", color: "#0369a1", border: "1px solid #bae6fd" }} />
                    )}
                  </Box>

                  {/* Intro HTML */}
                  {detail.intro && (
                    <Box
                      sx={{
                        bgcolor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 2, p: 3,
                        fontSize: 14, color: "#374151", lineHeight: 1.8,
                        "& img": { maxWidth: "100%", height: "auto", borderRadius: 1, my: 1 },
                        "& p": { margin: "0 0 10px 0" },
                        "& ol, & ul": { pl: 3, mb: 1 },
                        "& a": { color: "#1bbbb3" },
                      }}
                      dangerouslySetInnerHTML={{ __html: detail.intro }}
                    />
                  )}

                  {/* Submit button */}
                  {module_url && (
                    <Box sx={{ mt: 3 }}>
                      <Button
                        variant="contained"
                        endIcon={<OpenInNewRoundedIcon />}
                        href={module_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ bgcolor: "#ec4899", "&:hover": { bgcolor: "#db2777" }, textTransform: "none" }}
                      >
                        Submit Assignment in LMS
                      </Button>
                    </Box>
                  )}
                </Box>
              )}

              {/* Quiz */}
              {modtype === "quiz" && (
                <Box>
                  <Typography variant="h6" fontWeight={700} sx={{ color: "#111827", mb: 2, pb: 1.5, borderBottom: "1px solid #e5e7eb" }}>
                    {decodeEntities(detail.name)}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 2.5 }}>
                    {detail.timelimit > 0 && <Chip label={`Time limit: ${Math.round(detail.timelimit / 60)} min`} size="small" sx={{ bgcolor: "#faf5ff", color: "#7c3aed", border: "1px solid #e9d5ff" }} />}
                    {detail.timeopen > 0 && <Chip label={`Opens: ${fmtDate(detail.timeopen)}`} size="small" sx={{ bgcolor: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0" }} />}
                    {detail.timeclose > 0 && <Chip label={`Closes: ${fmtDate(detail.timeclose)}`} size="small" sx={{ bgcolor: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" }} />}
                  </Box>
                  {detail.intro && (
                    <Box sx={{ bgcolor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 2, p: 3, fontSize: 14, color: "#374151", lineHeight: 1.8, "& img": { maxWidth: "100%" }, "& p": { margin: "0 0 10px 0" } }}
                      dangerouslySetInnerHTML={{ __html: detail.intro }}
                    />
                  )}
                  {module_url && (
                    <Box sx={{ mt: 3 }}>
                      <Button variant="contained" endIcon={<OpenInNewRoundedIcon />} href={module_url} target="_blank" rel="noopener noreferrer" sx={{ bgcolor: "#8b5cf6", "&:hover": { bgcolor: "#7c3aed" }, textTransform: "none" }}>
                        Start Quiz in LMS
                      </Button>
                    </Box>
                  )}
                </Box>
              )}

              {/* URL / Folder / Other — show name + open button */}
              {!["assign", "quiz"].includes(modtype) && (
                <Box sx={{ textAlign: "center", pt: 4 }}>
                  <Typography variant="h6" fontWeight={600} sx={{ color: "#111827", mb: 3 }}>{decodeEntities(detail.name)}</Typography>
                  {module_url && (
                    <Button variant="contained" endIcon={<OpenInNewRoundedIcon />} href={module_url} target="_blank" rel="noopener noreferrer"
                      sx={{ bgcolor: color, "&:hover": { filter: "brightness(0.9)" }, textTransform: "none" }}>
                      Open in LMS
                    </Button>
                  )}
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}

// ── Single module card (full content) ─────────────────────────────────────────
function ModuleCard({ module, moduleRef, onMarkDone, onOpenInPlatform }) {
  const { modtype, name, is_video, is_pdf, content_url, content_mimetype, module_url, visible, completed, completion } = module;
  const color = moduleColor(modtype, content_mimetype);
  const [marking, setMarking] = useState(false);

  const handleMarkDone = async () => {
    setMarking(true);
    await onMarkDone?.(module);
    setMarking(false);
  };

  // Open interactive modules (assign/quiz/url/folder/page/forum) in the platform modal
  const openBtn = (label, btnColor) => module_url ? (
    <Button
      size="small"
      variant="contained"
      onClick={() => onOpenInPlatform?.(module)}
      sx={{ bgcolor: btnColor, "&:hover": { filter: "brightness(0.9)" }, textTransform: "none", fontSize: 12 }}
    >
      {label}
    </Button>
  ) : null;

  return (
    <Box
      ref={moduleRef}
      sx={{
        mb: 2,
        borderRadius: 2,
        border: "1px solid #e5e7eb",
        bgcolor: "#ffffff",
        overflow: "hidden",
      }}
    >
      {/* ── Video ── */}
      {modtype === "resource" && is_video && content_url && (
        <Box sx={{ bgcolor: "#000", lineHeight: 0 }}>
          <video
            controls
            style={{ width: "100%", maxHeight: 480, display: "block", objectFit: "contain", backgroundColor: "#000" }}
          >
            <source src={content_url} type={content_mimetype || "video/mp4"} />
          </video>
        </Box>
      )}

      {/* ── PDF (download link — browser PDF embed often breaks in flex layouts) ── */}
      {modtype === "resource" && is_pdf && content_url && (
        <Box sx={{ bgcolor: "#f9fafb", p: 3, display: "flex", alignItems: "center", gap: 2, borderBottom: "1px solid #e5e7eb" }}>
          <PictureAsPdfRoundedIcon sx={{ fontSize: 40, color: "#ef4444" }} />
          <Box>
            <Typography variant="body2" sx={{ color: "#111827", fontWeight: 600, mb: 0.5 }}>
              {decodeEntities(name)}
            </Typography>
            <Button
              size="small"
              variant="contained"
              endIcon={<OpenInNewRoundedIcon fontSize="small" />}
              href={content_url}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ bgcolor: "#ef4444", "&:hover": { bgcolor: "#dc2626" }, textTransform: "none", fontSize: 12 }}
            >
              Open PDF
            </Button>
          </Box>
        </Box>
      )}

      {/* ── External URL ── */}
      {modtype === "url" && (
        <Box sx={{ bgcolor: "#f9fafb", p: 3, display: "flex", alignItems: "center", gap: 2, borderBottom: "1px solid #e5e7eb" }}>
          <LinkRoundedIcon sx={{ fontSize: 40, color: "#3b82f6" }} />
          <Box>
            <Typography variant="body2" sx={{ color: "#111827", fontWeight: 600, mb: 0.5 }}>{decodeEntities(name)}</Typography>
            {openBtn("Open Link", "#3b82f6")}
          </Box>
        </Box>
      )}

      {/* ── Quiz ── */}
      {modtype === "quiz" && (
        <Box sx={{ bgcolor: "#f9fafb", p: 3, display: "flex", alignItems: "center", gap: 2, borderBottom: "1px solid #e5e7eb" }}>
          <QuizRoundedIcon sx={{ fontSize: 40, color: "#8b5cf6" }} />
          <Box>
            <Typography variant="body2" sx={{ color: "#111827", fontWeight: 600, mb: 0.5 }}>{decodeEntities(name)}</Typography>
            {openBtn("Start Quiz", "#8b5cf6")}
          </Box>
        </Box>
      )}

      {/* ── Assignment ── */}
      {modtype === "assign" && (
        <Box sx={{ bgcolor: "#f9fafb", p: 3, display: "flex", alignItems: "center", gap: 2, borderBottom: "1px solid #e5e7eb" }}>
          <AssignmentRoundedIcon sx={{ fontSize: 40, color: "#ec4899" }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" sx={{ color: "#111827", fontWeight: 600, mb: 0.5 }}>{decodeEntities(name)}</Typography>
            {openBtn("Open Assignment", "#ec4899")}
          </Box>
        </Box>
      )}

      {/* ── Folder ── */}
      {modtype === "folder" && (
        <Box sx={{ bgcolor: "#f9fafb", p: 3, display: "flex", alignItems: "center", gap: 2, borderBottom: "1px solid #e5e7eb" }}>
          <FolderRoundedIcon sx={{ fontSize: 40, color: "#f59e0b" }} />
          <Box>
            <Typography variant="body2" sx={{ color: "#111827", fontWeight: 600, mb: 0.5 }}>{decodeEntities(name)}</Typography>
            {openBtn("Open Folder", "#f59e0b")}
          </Box>
        </Box>
      )}

      {/* ── Other (forum, page, etc.) ── */}
      {!["resource", "url", "quiz", "assign", "folder"].includes(modtype) && module_url && (
        <Box sx={{ bgcolor: "#f9fafb", p: 3, display: "flex", alignItems: "center", gap: 2, borderBottom: "1px solid #e5e7eb" }}>
          <ModuleIcon modtype={modtype} mimetype={content_mimetype} sx={{ fontSize: 40, color: "#6b7280" }} />
          <Box>
            <Typography variant="body2" sx={{ color: "#111827", fontWeight: 600, mb: 0.5 }}>{decodeEntities(name)}</Typography>
            {openBtn("Open", "#6b7280")}
          </Box>
        </Box>
      )}

      {/* ── Lock restriction notice ── */}
      {!visible && (
        <Box sx={{ px: 3, py: 1.5, display: "flex", alignItems: "center", gap: 1, bgcolor: "#fff7ed", borderTop: is_video || is_pdf ? "1px solid #fed7aa" : "none" }}>
          <LockRoundedIcon sx={{ fontSize: 16, color: "#f97316" }} />
          <Typography variant="caption" sx={{ color: "#9a3412" }}>
            Not available — requires enrollment in a specific group or completing prerequisites.
          </Typography>
        </Box>
      )}

      {/* ── Footer: title + Mark as done ── */}
      <Box
        sx={{
          px: 2,
          py: 1.25,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          borderTop: "1px solid #e5e7eb",
        }}
      >
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 1.5,
            bgcolor: `${color}22`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <ModuleIcon modtype={modtype} mimetype={content_mimetype} sx={{ fontSize: 18, color }} />
        </Box>
        {(modtype === "resource") && (
          <Typography
            variant="body2"
            sx={{
              flex: 1,
              minWidth: 0,
              color: "#6b7280",
              fontSize: 13,
              fontWeight: 500,
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 1,
              WebkitBoxOrient: "vertical",
            }}
          >
            {decodeEntities(name)}
          </Typography>
        )}
        {modtype !== "resource" && <Box sx={{ flex: 1 }} />}

        {/* Mark as done — only for modules with manual completion */}
        {completion === 1 && (
          completed ? (
            <Chip
              icon={<DoneRoundedIcon sx={{ fontSize: 14 }} />}
              label="Done"
              size="small"
              sx={{ bgcolor: "#34d39922", color: "#34d399", border: "1px solid #34d39944", height: 26, fontSize: 11 }}
            />
          ) : (
            <Button
              size="small"
              variant="outlined"
              disabled={marking}
              onClick={handleMarkDone}
              sx={{
                textTransform: "none",
                fontSize: 12,
                color: "#9ca3af",
                borderColor: "#e5e7eb",
                whiteSpace: "nowrap",
                "&:hover": { borderColor: "#1bbbb3", color: "#1bbbb3" },
              }}
            >
              {marking ? <CircularProgress size={12} /> : "Mark as done"}
            </Button>
          )
        )}
      </Box>
    </Box>
  );
}

// ── Section view (main scrollable area) ──────────────────────────────────────
function SectionView({ section, activeModule, moduleRefs, onMarkDone, onOpenInPlatform, loading }) {
  if (loading) {
    return (
      <Box sx={{ p: 3, display: "flex", flexDirection: "column", gap: 2 }}>
        {[1, 2, 3].map((i) => (
          <Box key={i} sx={{ borderRadius: 2, border: "1px solid #e5e7eb", overflow: "hidden" }}>
            <Skeleton variant="rectangular" height={200} sx={{ bgcolor: "#f3f4f6" }} />
            <Box sx={{ p: 2 }}>
              <Skeleton height={20} width="60%" sx={{ bgcolor: "#f3f4f6" }} />
            </Box>
          </Box>
        ))}
      </Box>
    );
  }

  if (!section) {
    return (
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
        <SchoolRoundedIcon sx={{ fontSize: 64, color: "#d1d5db" }} />
        <Typography sx={{ color: "#6b7280" }}>Select a section to begin</Typography>
      </Box>
    );
  }

  // Single-module focused view (when a specific module is clicked in the sidebar)
  if (activeModule) {
    return (
      <Box sx={{ p: 3, maxWidth: 860, mx: "auto" }}>
        {/* Breadcrumb */}
        <Typography variant="caption" sx={{ color: "#6b7280", mb: 2, display: "block" }}>
          {decodeEntities(section.name)} › {decodeEntities(activeModule.name)}
        </Typography>
        <ModuleCard
          module={activeModule}
          moduleRef={moduleRefs.current[activeModule.moodle_module_id]}
          onMarkDone={onMarkDone}
          onOpenInPlatform={onOpenInPlatform}
        />
      </Box>
    );
  }

  // All-modules view (when a section header is clicked)
  const mods = (section.modules || []);

  return (
    <Box sx={{ p: 3 }}>
      {/* Section heading */}
      <Typography
        variant="h6"
        fontWeight={700}
        sx={{ color: "#111827", mb: 2, pb: 1.5, borderBottom: "1px solid #e5e7eb" }}
      >
        {decodeEntities(section.name) || `Section ${section.position + 1}`}
      </Typography>

      {/* Section summary HTML (instructor info, welcome text, schedule, etc.) */}
      {section.summary?.trim() && (
        <Box
          sx={{
            mb: 2.5,
            p: 2,
            bgcolor: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: 2,
            fontSize: 14,
            color: "#374151",
            lineHeight: 1.7,
            "& img": { maxWidth: "100%", height: "auto", borderRadius: 1 },
            "& p": { margin: "0 0 8px 0" },
            "& strong": { color: "#111827" },
          }}
          dangerouslySetInnerHTML={{ __html: section.summary }}
        />
      )}

      {mods.length === 0 ? null : (
        mods.map((mod) => (
          <ModuleCard
            key={mod.id}
            module={mod}
            moduleRef={moduleRefs.current[mod.moodle_module_id]}
            onMarkDone={onMarkDone}
            onOpenInPlatform={onOpenInPlatform}
          />
        ))
      )}
    </Box>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CoursePlayerPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [sections, setSections] = useState([]);
  const [activeSection, setActiveSection] = useState(null);
  const [activeModule, setActiveModule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [snack, setSnack] = useState(null);
  const [launchModal, setLaunchModal] = useState({ open: false, module: null });

  const mainRef = useRef(null);
  const moduleRefs = useRef({});

  // ── Load course detail ──────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const detail = await apiFetch(`/courses/${courseId}/detail/`);
        if (cancelled) return;
        setCourse(detail);
        setProgress(detail.progress || 0);
        setCompleted(detail.completed || false);
      } catch {
        if (!cancelled) setError("Failed to load course. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [courseId]);

  // ── Load course content ─────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function loadContent() {
      setContentLoading(true);
      try {
        const data = await apiFetch(`/courses/${courseId}/content/`);
        if (cancelled) return;
        // Keep sections that have either modules or a non-empty summary (regardless of visibility)
        const secs = (data.sections || []).filter(
          (s) => s.modules?.length > 0 || s.summary?.trim()
        );
        setSections(secs);
        // Auto-select first section with a video/pdf/url module
        const firstWithContent = secs.find((s) =>
          (s.modules || []).some((m) => m.is_video || m.is_pdf || m.modtype === "url")
        ) || secs[0];
        if (firstWithContent) {
          setActiveSection(firstWithContent);
          const firstMod = (firstWithContent.modules || []).find(
            (m) => m.is_video || m.is_pdf || m.modtype === "url"
          ) || firstWithContent.modules?.[0];
          if (firstMod) setActiveModule(firstMod);
        }
      } catch {
        if (!cancelled) setSnack("Could not load course content.");
      } finally {
        if (!cancelled) setContentLoading(false);
      }
    }
    loadContent();
    return () => { cancelled = true; };
  }, [courseId]);

  // ── Poll progress ───────────────────────────────────────────────────────────
  const refreshProgress = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      await apiFetch("/courses/my-courses/refresh/", { method: "POST" });
      const detail = await apiFetch(`/courses/${courseId}/detail/`);
      setProgress(detail.progress || 0);
      setCompleted(detail.completed || false);
      if (!silent) setSnack("Progress updated.");
    } catch {
      if (!silent) setSnack("Could not refresh progress.");
    } finally {
      if (!silent) setRefreshing(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (loading) return;
    const timer = setInterval(() => refreshProgress(true), PROGRESS_POLL_MS);
    return () => clearInterval(timer);
  }, [loading, refreshProgress]);

  // ── Select section header → show all modules, clear active module ──────────
  const handleSelectSection = useCallback((section) => {
    setActiveSection(section);
    setActiveModule(null);
    setTimeout(() => { if (mainRef.current) mainRef.current.scrollTop = 0; }, 50);
  }, []);

  // ── Select specific module → show single focused view ───────────────────────
  const handleSelectModule = useCallback((section, mod) => {
    setActiveSection(section);
    setActiveModule(mod);
    setTimeout(() => { if (mainRef.current) mainRef.current.scrollTop = 0; }, 50);
  }, []);

  // ── Open module in full-screen platform native viewer ───────────────────────
  const handleOpenInPlatform = useCallback((module) => {
    if (!module) return;
    setLaunchModal({ open: true, module });
  }, []);

  // ── Mark module as done ─────────────────────────────────────────────────────
  const handleMarkDone = useCallback(async (module) => {
    try {
      await apiFetch(`/courses/${courseId}/modules/${module.moodle_module_id}/complete/`, { method: "POST" });
      // Optimistically update the module in sections state
      setSections((prev) =>
        prev.map((sec) => ({
          ...sec,
          modules: (sec.modules || []).map((m) =>
            m.moodle_module_id === module.moodle_module_id ? { ...m, completed: true } : m
          ),
        }))
      );
      if (activeSection) {
        setActiveSection((prev) => ({
          ...prev,
          modules: (prev.modules || []).map((m) =>
            m.moodle_module_id === module.moodle_module_id ? { ...m, completed: true } : m
          ),
        }));
      }
      if (activeModule?.moodle_module_id === module.moodle_module_id) {
        setActiveModule((prev) => ({ ...prev, completed: true }));
      }
      setSnack("Marked as done!");
    } catch {
      setSnack("Could not mark as done — please try in the LMS.");
    }
  }, [courseId, activeSection]);

  // ── Loading / error states ──────────────────────────────────────────────────
  if (loading) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", height: "100vh", bgcolor: "#ffffff" }}>
        <Box sx={{ px: 2, py: 1.5, bgcolor: "#ffffff", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 2 }}>
          <Skeleton variant="circular" width={32} height={32} sx={{ bgcolor: "#f3f4f6" }} />
          <Skeleton variant="text" width={260} height={24} sx={{ bgcolor: "#f3f4f6" }} />
          <Box sx={{ flex: 1 }} />
          <Skeleton variant="rectangular" width={140} height={8} sx={{ bgcolor: "#f3f4f6", borderRadius: 2 }} />
        </Box>
        <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "#f9fafb" }}>
          <CircularProgress size={40} sx={{ color: "#1bbbb3" }} />
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", height: "100vh", bgcolor: "#ffffff", alignItems: "center", justifyContent: "center", gap: 2, px: 3 }}>
        <Alert severity="error" sx={{ maxWidth: 480 }}>{error}</Alert>
        <Button variant="outlined" onClick={() => navigate("/account/courses")} startIcon={<ArrowBackRoundedIcon />}>
          Back to Courses
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", bgcolor: "#f9fafb" }}>
      {/* Top bar */}
      <PlayerTopBar
        course={course}
        progress={progress}
        completed={completed}
        refreshing={refreshing}
        onRefresh={() => refreshProgress(false)}
      />

      {/* Body */}
      <Box sx={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* Sidebar */}
        <Box
          sx={{
            width: 280,
            flexShrink: 0,
            bgcolor: "#ffffff",
            borderRight: "1px solid #e5e7eb",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <Box sx={{ px: 2, py: 1.25, borderBottom: "1px solid #e5e7eb" }}>
            <Typography variant="caption" fontWeight={700} sx={{ color: "#374151", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Course Content
            </Typography>
          </Box>
          <CourseSidebar
            sections={sections}
            activeSectionId={activeSection?.id}
            activeModuleId={activeModule?.moodle_module_id}
            onSelectSection={handleSelectSection}
            onSelectModule={handleSelectModule}
            loading={contentLoading}
          />
        </Box>

        {/* Main scrollable section view */}
        <Box ref={mainRef} sx={{ flex: 1, overflowY: "auto", bgcolor: "#f3f4f6" }}>
          <SectionView
            section={activeSection}
            activeModule={activeModule}
            moduleRefs={moduleRefs}
            onMarkDone={handleMarkDone}
            onOpenInPlatform={handleOpenInPlatform}
            loading={contentLoading}
          />
        </Box>
      </Box>

      <Snackbar
        open={!!snack}
        autoHideDuration={3500}
        onClose={() => setSnack(null)}
        message={snack}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />

      {/* Full-screen in-platform module detail viewer */}
      {launchModal.open && (
        <ModuleLaunchModal
          courseId={courseId}
          module={launchModal.module}
          onClose={() => setLaunchModal({ open: false, module: null })}
        />
      )}
    </Box>
  );
}
