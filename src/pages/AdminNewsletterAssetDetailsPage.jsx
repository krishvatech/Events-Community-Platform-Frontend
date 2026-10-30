import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Link,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import { Link as RouterLink, useLocation, useNavigate, useParams } from "react-router-dom";

import { LineGraph } from "../components/marketing/ReportGraphs.jsx";
import { saveBlob } from "../components/marketing/saveBlob";
import { downloadNewsletterAssetFile, getNewsletterAsset, getNewsletterAssetDownloads } from "../services/newsletterService";
import {
  ASSETS_PATH,
  AssetDeleteDialog,
  AssetStatusChip,
  CARD_BORDER,
  NAVY,
  assetEditPath,
  formatBytes,
  formatDateTime,
  getErrorMessage,
  isValidAssetId,
} from "./newsletterAssetShared.jsx";

const DOWNLOADS_PER_PAGE = 25;
const SOURCES = { email: "Email", page: "Landing page", form: "Form", campaign: "Campaign", focus: "Focus item" };

function Card({ title, action, children }) {
  return (
    <Paper variant="outlined" component="section" aria-label={title} sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 2, borderColor: CARD_BORDER, minWidth: 0 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
        <Typography component="h2" sx={{ fontWeight: 850, color: NAVY }}>{title}</Typography>
        {action}
      </Stack>
      {children}
    </Paper>
  );
}

function Fact({ label, children }) {
  return (
    <Stack direction="row" spacing={2} sx={{ py: 0.75, borderBottom: "1px solid", borderColor: CARD_BORDER, "&:last-child": { borderBottom: 0 } }}>
      <Typography variant="body2" color="text.secondary" sx={{ width: 130, flexShrink: 0 }}>{label}</Typography>
      <Typography variant="body2" component="div" sx={{ minWidth: 0, wordBreak: "break-word" }}>{children}</Typography>
    </Stack>
  );
}

function CopyRow({ label, value, onCopied }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      onCopied(`${label} copied.`);
    } catch {
      onCopied("Copy is not available here; select the text instead.");
    }
  };
  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
      <Box component="code" sx={{ flex: 1, minWidth: 0, p: 1, bgcolor: "#F7F9FA", borderRadius: 1, fontSize: 13, overflowWrap: "anywhere" }}>{value}</Box>
      <Tooltip title={`Copy ${label.toLowerCase()}`}>
        <IconButton aria-label={`Copy ${label.toLowerCase()}`} onClick={copy} size="small"><ContentCopyRoundedIcon fontSize="small" /></IconButton>
      </Tooltip>
    </Stack>
  );
}

export default function AdminNewsletterAssetDetailsPage() {
  const { assetId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [asset, setAsset] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [downloads, setDownloads] = useState(null);
  const [downloadsError, setDownloadsError] = useState("");
  const [days, setDays] = useState(30);
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [snack, setSnack] = useState("");

  useEffect(() => {
    const flash = location.state?.flash;
    if (!flash) return;
    setSnack(flash);
    navigate(location.pathname, { replace: true, state: {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (!isValidAssetId(assetId)) throw Object.assign(new Error("bad id"), { notFound: true });
        const data = await getNewsletterAsset(assetId);
        if (active) setAsset(data);
      } catch (err) {
        if (active) setLoadError(err?.notFound || err?.response?.status === 404 ? "That asset does not exist." : getErrorMessage(err, "We could not load the asset."));
      }
    })();
    return () => { active = false; };
  }, [assetId]);

  const loadDownloads = useCallback(async () => {
    if (!isValidAssetId(assetId)) return;
    setDownloadsError("");
    try {
      setDownloads(await getNewsletterAssetDownloads(assetId, { days, page: page + 1, page_size: DOWNLOADS_PER_PAGE }));
    } catch (err) {
      setDownloadsError(getErrorMessage(err, "Download history could not be loaded."));
    }
  }, [assetId, days, page]);

  useEffect(() => {
    loadDownloads();
  }, [loadDownloads]);

  const downloadFile = async () => {
    setBusy(true);
    try {
      saveBlob(await downloadNewsletterAssetFile(asset.id), asset.originalFileName || `asset-${asset.id}`);
    } catch (err) {
      setSnack(getErrorMessage(err, "The file could not be downloaded."));
    } finally {
      setBusy(false);
    }
  };

  if (loadError) {
    return (
      <Stack spacing={2}>
        <Alert severity="error">{loadError}</Alert>
        <Button component={RouterLink} to={ASSETS_PATH} startIcon={<ArrowBackRoundedIcon />} sx={{ alignSelf: "flex-start", textTransform: "none" }}>Back to Assets</Button>
      </Stack>
    );
  }
  if (!asset) return <Stack alignItems="center" sx={{ py: 8 }}><CircularProgress aria-label="Loading asset" /></Stack>;

  const remote = asset.storageLocation === "remote";
  const totals = downloads?.totals || {};
  const series = downloads?.daily || [];
  const graph = {
    label: `Downloads, last ${days} days`,
    labels: series.map((point) => point.date.slice(5)),
    datasets: [{ label: "Downloads", data: series.map((point) => point.downloads) }],
  };
  const recordedTotal = Number(totals.recorded || 0);

  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
        <Box sx={{ minWidth: 0 }}>
          <Button component={RouterLink} to={ASSETS_PATH} startIcon={<ArrowBackRoundedIcon />} size="small" sx={{ textTransform: "none", mb: 1 }}>Back to Assets</Button>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 850, color: NAVY, wordBreak: "break-word" }}>{asset.title}</Typography>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
            <AssetStatusChip published={asset.isPublished} />
            {asset.category?.title && <Typography variant="body2" color="text.secondary">{asset.category.title}</Typography>}
          </Stack>
        </Box>
        <Stack direction="row" spacing={1} alignItems="flex-start" flexWrap="wrap" useFlexGap>
          {!remote && (
            <Tooltip title="Download the stored file (not counted as a download)">
              <span>
                <Button variant="outlined" startIcon={<DownloadRoundedIcon />} onClick={downloadFile} disabled={busy} sx={{ textTransform: "none", whiteSpace: "nowrap" }}>Download</Button>
              </span>
            </Tooltip>
          )}
          <Button variant="contained" startIcon={<EditRoundedIcon />} onClick={() => navigate(assetEditPath(asset.id))} sx={{ textTransform: "none" }}>Edit</Button>
          <Tooltip title="Delete"><IconButton aria-label="Delete asset" color="error" onClick={() => setDeleting(true)}><DeleteOutlineRoundedIcon /></IconButton></Tooltip>
        </Stack>
      </Stack>

      {!asset.isPublished && (
        <Alert severity="info" variant="outlined">This asset is unpublished: contacts who open its link get an error until you publish it.</Alert>
      )}

      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "minmax(0, 1fr) minmax(0, 1fr)" } }}>
        <Card title="File">
          <Fact label={remote ? "Link" : "File name"}>{remote ? <Link href={asset.remotePath} target="_blank" rel="noopener noreferrer">{asset.remotePath}</Link> : asset.originalFileName || "—"}</Fact>
          <Fact label="Type">{(asset.extension || "—").toUpperCase()}{asset.mime ? ` · ${asset.mime}` : ""}</Fact>
          <Fact label="Size">{formatBytes(asset.size)}</Fact>
          <Fact label="Stored">{remote ? "Linked (hosted elsewhere)" : "In Mautic"}</Fact>
          <Fact label="Language">{asset.language || "—"}</Fact>
          {asset.description && <Fact label="Description">{asset.description}</Fact>}
          <Fact label="Created">{`${formatDateTime(asset.dateAdded)}${asset.createdByUser ? ` by ${asset.createdByUser}` : ""}`}</Fact>
          <Fact label="Updated">{formatDateTime(asset.dateModified)}</Fact>
        </Card>

        <Card title="Share">
          <Stack spacing={2}>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>Download link</Typography>
              <CopyRow label="Link" value={asset.downloadUrl} onCopied={setSnack} />
              <Typography variant="caption" color="text.secondary">Use anywhere. Downloads are tracked; contacts are recognised when they come from your emails.</Typography>
            </Box>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>Email and landing page token</Typography>
              <CopyRow label="Token" value={asset.token} onCopied={setSnack} />
              <Typography variant="caption" color="text.secondary">Paste it as a link address in an email or landing page; Mautic replaces it with a tracked link for each contact.</Typography>
            </Box>
          </Stack>
        </Card>
      </Box>

      <Card
        title="Download history"
        action={(
          <ToggleButtonGroup size="small" exclusive value={days} onChange={(_, value) => { if (value) { setDays(value); setPage(0); } }} aria-label="Download period">
            {[7, 30, 90].map((value) => <ToggleButton key={value} value={value} sx={{ textTransform: "none" }}>{`${value} days`}</ToggleButton>)}
          </ToggleButtonGroup>
        )}
      >
        {downloadsError && <Alert severity="error" sx={{ mb: 2 }}>{downloadsError}</Alert>}
        <Stack direction="row" spacing={3} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
          {[["Downloads", totals.downloads], ["Unique contacts", totals.unique], ["Failed attempts", totals.failed]].map(([label, value]) => (
            <Box key={label} aria-label={label}>
              {/* A figure, not a heading. */}
              <Typography variant="h5" component="p" sx={{ fontWeight: 850, color: NAVY }}>{Number(value || 0).toLocaleString()}</Typography>
              <Typography variant="caption" color="text.secondary">{label}</Typography>
            </Box>
          ))}
        </Stack>
        {series.some((point) => point.downloads) ? <LineGraph graph={graph} /> : <Typography variant="body2" color="text.secondary">{`No downloads in the last ${days} days.`}</Typography>}

        <Typography component="h3" sx={{ fontWeight: 800, color: NAVY, mt: 3, mb: 1 }}>Recent downloads</Typography>
        <TableContainer>
          <Table size="small" aria-label="Recent downloads">
            <TableHead>
              <TableRow>
                {["When", "Contact", "From", "Result"].map((label) => <TableCell key={label} sx={{ fontWeight: 800, color: NAVY, whiteSpace: "nowrap" }}>{label}</TableCell>)}
              </TableRow>
            </TableHead>
            <TableBody>
              {(downloads?.recent || []).length === 0 ? (
                <TableRow><TableCell colSpan={4}><Typography variant="body2" color="text.secondary">No downloads yet.</Typography></TableCell></TableRow>
              ) : downloads.recent.map((row, index) => (
                <TableRow key={`${row.date}-${index}`}>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDateTime(row.date)}</TableCell>
                  <TableCell sx={{ minWidth: 160, overflowWrap: "anywhere" }}>
                    {row.contactId ? (
                      <Link component={RouterLink} to={`/admin/newsletter/contacts/${row.contactId}`} underline="hover">
                        {/* Mautic creates an anonymous contact for a visitor it does not know yet. */}
                        {row.contactName || row.contactEmail || `Anonymous visitor #${row.contactId}`}
                      </Link>
                    ) : "Anonymous visitor"}
                  </TableCell>
                  <TableCell sx={{ minWidth: 120 }}>{SOURCES[row.source] ? `${SOURCES[row.source]}${row.sourceId ? ` #${row.sourceId}` : ""}` : row.referer ? "Website" : "Direct"}</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{row.code === 200 ? "Downloaded" : `Failed (${row.code})`}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        {recordedTotal > DOWNLOADS_PER_PAGE && (
          <TablePagination component="div" count={recordedTotal} page={page} rowsPerPage={DOWNLOADS_PER_PAGE} rowsPerPageOptions={[DOWNLOADS_PER_PAGE]}
            onPageChange={(_, next) => setPage(next)} />
        )}
      </Card>

      <AssetDeleteDialog asset={asset} open={deleting} onClose={() => setDeleting(false)}
        onDeleted={(_, message) => navigate(ASSETS_PATH, { state: { flash: message } })} />
      <Snackbar open={Boolean(snack)} autoHideDuration={4000} onClose={() => setSnack("")} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert severity="info" onClose={() => setSnack("")}>{snack}</Alert>
      </Snackbar>
    </Stack>
  );
}
