// One native Mautic submission, read-only. Values render as text only.

import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  Chip,
  Link,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Typography,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";

import { getNewsletterFormSubmission } from "../services/newsletterService";
import {
  CARD_BORDER,
  FORMS_PATH,
  NAVY,
  describeFormLoadError,
  formDetailsPath,
  formSubmissionsPath,
  formatDateTime,
  isValidFormId,
} from "./newsletterFormShared.jsx";

export default function AdminNewsletterFormSubmissionDetailPage() {
  const { formId, submissionId } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, error: null, data: null });

  useEffect(() => {
    if (!isValidFormId(formId) || !isValidFormId(submissionId)) {
      setState({ loading: false, error: { title: "Invalid submission link.", detail: "Submission links use numeric Mautic IDs.", retry: false }, data: null });
      return undefined;
    }
    let active = true;
    getNewsletterFormSubmission(formId, submissionId)
      .then((data) => active && setState({ loading: false, error: null, data }))
      .catch((err) => {
        if (!active) return;
        const error = describeFormLoadError(err);
        setState({ loading: false, error: err?.response?.status === 404 ? { ...error, title: "Submission not found.", detail: "It does not exist for this Form." } : error, data: null });
      });
    return () => {
      active = false;
    };
  }, [formId, submissionId]);

  const data = state.data;
  const formName = data?.form?.name || `Form #${formId}`;
  const back = isValidFormId(formId) ? formSubmissionsPath(formId) : FORMS_PATH;

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Breadcrumbs aria-label="breadcrumb">
          <Link component={RouterLink} to={FORMS_PATH} underline="hover" color="inherit">Forms</Link>
          {isValidFormId(formId) && <Link component={RouterLink} to={formDetailsPath(formId)} underline="hover" color="inherit" sx={{ wordBreak: "break-word" }}>{formName}</Link>}
          {isValidFormId(formId) && <Link component={RouterLink} to={back} underline="hover" color="inherit">Submissions</Link>}
          <Typography color="text.primary">#{submissionId}</Typography>
        </Breadcrumbs>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ md: "center" }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 850, color: NAVY }}>Submission #{submissionId}</Typography>
            <Typography color="text.secondary">{data ? `Submitted ${formatDateTime(data.dateSubmitted)}` : " "}</Typography>
          </Box>
          <Button startIcon={<ArrowBackRoundedIcon />} onClick={() => navigate(back)} sx={{ textTransform: "none", alignSelf: { xs: "flex-start", md: "center" } }}>
            Back to Submissions
          </Button>
        </Stack>
      </Stack>

      {state.loading ? (
        <Skeleton variant="rectangular" height={240} sx={{ borderRadius: 2 }} />
      ) : state.error ? (
        <Alert severity="error"><strong>{state.error.title}</strong> {state.error.detail}</Alert>
      ) : (
        <>
          <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, borderColor: CARD_BORDER }}>
            <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 850, color: NAVY, mb: 1 }}>Contact</Typography>
            {data.contact ? (
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Typography sx={{ wordBreak: "break-all" }}>{data.contact.email || "(no email)"}</Typography>
                <Link component={RouterLink} to={`/admin/newsletter/contacts/${encodeURIComponent(data.contact.id)}`}>Mautic contact #{data.contact.id}</Link>
              </Stack>
            ) : (
              <Typography color="text.secondary">No contact is linked to this submission.</Typography>
            )}
          </Paper>
          <Paper variant="outlined" sx={{ borderRadius: 2, borderColor: CARD_BORDER, overflow: "hidden" }}>
            <TableContainer>
              <Table aria-label="Submitted values">
                <TableBody>
                  {data.values.map((item) => (
                    <TableRow key={item.alias}>
                      <TableCell component="th" scope="row" sx={{ fontWeight: 700, color: NAVY, width: { xs: "38%", md: "30%" }, overflowWrap: "break-word", hyphens: "auto" }}>
                        {item.label}
                        {item.removedField && <Chip size="small" label="Field removed" sx={{ ml: 1 }} />}
                      </TableCell>
                      <TableCell sx={{ wordBreak: "break-word", whiteSpace: "pre-wrap" }}>
                        {item.masked ? <Typography color="text.secondary" component="span">Hidden for privacy</Typography> : item.value || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
      )}
    </Stack>
  );
}
