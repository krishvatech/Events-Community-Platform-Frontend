// Read-only list of one Form's native Mautic submissions. Submissions hold
// personal data: values are shown as text (never as HTML), nothing is cached
// by the backend, and only what identifies the contact is shown.

import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  Link,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";

import { listNewsletterFormSubmissions } from "../services/newsletterService";
import {
  CARD_BORDER,
  FORMS_PATH,
  NAVY,
  describeFormLoadError,
  formDetailsPath,
  formSubmissionPath,
  formatDateTime,
  isValidFormId,
} from "./newsletterFormShared.jsx";

const PAGE_SIZE = 25;
const wideOnly = { display: { xs: "none", md: "table-cell" } };

export default function AdminNewsletterFormSubmissionsPage() {
  const { formId } = useParams();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!isValidFormId(formId)) {
      setState({ loading: false, error: { title: "Invalid Form link.", detail: "Form links use a numeric Mautic Form ID.", retry: false }, data: null });
      return undefined;
    }
    let active = true;
    setState((current) => ({ ...current, loading: true, error: null }));
    listNewsletterFormSubmissions(formId, { page, page_size: PAGE_SIZE })
      .then((data) => active && setState({ loading: false, error: null, data }))
      .catch((err) => active && setState({ loading: false, error: describeFormLoadError(err), data: null }));
    return () => {
      active = false;
    };
  }, [formId, page, reload]);

  const data = state.data;
  const rows = Array.isArray(data?.results) ? data.results : [];
  const formName = data?.form?.name || `Form #${formId}`;

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Breadcrumbs aria-label="breadcrumb">
          <Link component={RouterLink} to="/admin/newsletter" underline="hover" color="inherit">Marketing Hub</Link>
          <Link component={RouterLink} to={FORMS_PATH} underline="hover" color="inherit">Forms</Link>
          {isValidFormId(formId) && (
            <Link component={RouterLink} to={formDetailsPath(formId)} underline="hover" color="inherit" sx={{ wordBreak: "break-word" }}>{formName}</Link>
          )}
          <Typography color="text.primary">Submissions</Typography>
        </Breadcrumbs>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ md: "center" }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 850, color: NAVY, wordBreak: "break-word" }}>Submissions — {formName}</Typography>
            <Typography color="text.secondary">Read-only, newest first. Submissions contain personal data; they are stored in Mautic only.</Typography>
          </Box>
          <Button startIcon={<ArrowBackRoundedIcon />} onClick={() => navigate(isValidFormId(formId) ? formDetailsPath(formId) : FORMS_PATH)} sx={{ textTransform: "none", alignSelf: { xs: "flex-start", md: "center" } }}>
            Back to Form
          </Button>
        </Stack>
      </Stack>

      {state.error ? (
        <Alert severity="error" action={state.error.retry ? <Button color="inherit" size="small" onClick={() => setReload((n) => n + 1)}>Retry</Button> : null}>
          <strong>{state.error.title}</strong> {state.error.detail}
        </Alert>
      ) : !state.loading && rows.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, borderColor: CARD_BORDER }}>
          <Typography sx={{ fontWeight: 850, color: NAVY }}>No submissions yet.</Typography>
          <Typography color="text.secondary">Submissions appear here once visitors submit the published Form.</Typography>
        </Paper>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: CARD_BORDER, overflow: "hidden" }}>
          <TableContainer>
            <Table aria-label="Form submissions">
              <TableHead>
                <TableRow sx={{ "& th": { fontWeight: 800, color: NAVY, bgcolor: "#F7F9FA", whiteSpace: "nowrap" } }}>
                  <TableCell>Submitted</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell sx={wideOnly}>Values</TableCell>
                  <TableCell align="right">ID</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {state.loading
                  ? Array.from({ length: 5 }).map((_, index) => (
                      <TableRow key={`skeleton-${index}`}>
                        {[0, 1, 2, 3].map((cell) => <TableCell key={cell} sx={cell === 2 ? wideOnly : undefined}><Skeleton height={24} /></TableCell>)}
                      </TableRow>
                    ))
                  : rows.map((row) => (
                      <TableRow key={row.id} hover data-submission-id={row.id} onClick={() => navigate(formSubmissionPath(formId, row.id))} sx={{ cursor: "pointer" }}>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>
                          <Link component={RouterLink} to={formSubmissionPath(formId, row.id)} onClick={(event) => event.stopPropagation()} underline="hover" sx={{ fontWeight: 700 }}>
                            {formatDateTime(row.dateSubmitted)}
                          </Link>
                        </TableCell>
                        <TableCell sx={{ wordBreak: "break-all" }}>{row.contact ? row.contact.email || `Contact #${row.contact.id}` : "—"}</TableCell>
                        <TableCell sx={{ ...wideOnly, maxWidth: 420 }}>
                          <Typography variant="body2" color="text.secondary" noWrap>
                            {(row.preview || []).map((item) => `${item.label}: ${item.value}`).join(" · ") || "—"}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">#{row.id}</TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </TableContainer>
          {data?.count > 0 && (
            <TablePagination component="div" count={data.count} page={Math.max(0, page - 1)} rowsPerPage={PAGE_SIZE} rowsPerPageOptions={[PAGE_SIZE]}
              onPageChange={(_, next) => !state.loading && setPage(next + 1)} />
          )}
        </Paper>
      )}
    </Stack>
  );
}
