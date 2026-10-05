import React from "react";
import { Box, Paper, Skeleton, Stack, TableContainer, Typography } from "@mui/material";
import { colors, radii, semanticColors } from "../../styles/designTokens";

const DefaultLoadingState = ({ label, rows }) => (
  <Stack role="status" aria-label={label} spacing={1} sx={{ p: 2 }}>
    {Array.from({ length: rows }).map((_, index) => (
      <Skeleton key={index} variant="rounded" height={44} />
    ))}
  </Stack>
);

const DefaultEmptyState = ({ title, description }) => (
  <Box sx={{ px: 3, py: 5, textAlign: "center" }}>
    <Typography sx={{ color: semanticColors.text, fontWeight: 700 }}>{title}</Typography>
    {description ? <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{description}</Typography> : null}
  </Box>
);

const AdminTableShell = ({
  children,
  loading = false,
  loadingSlot,
  loadingLabel = "Loading table data",
  loadingRows = 5,
  empty = false,
  emptySlot,
  emptyTitle = "No results",
  emptyDescription,
  pagination,
  minWidth,
  sx,
}) => (
  <Paper
    variant="outlined"
    aria-busy={loading || undefined}
    sx={{
      borderColor: semanticColors.border,
      borderRadius: `${radii.card}px`,
      bgcolor: semanticColors.surface,
      overflow: "visible",
      ...sx,
    }}
  >
    <TableContainer
      sx={{
        width: "100%",
        maxWidth: "100%",
        overflowX: "auto",
        borderRadius: `${radii.card}px`,
        "& .MuiTable-root": minWidth ? { minWidth } : undefined,
        "& .MuiTableHead-root .MuiTableCell-root": {
          bgcolor: semanticColors.surfaceCool,
          color: semanticColors.text,
          fontWeight: 700,
          whiteSpace: "nowrap",
          borderBottomColor: semanticColors.border,
        },
        "& .MuiTableBody-root .MuiTableCell-root": {
          borderBottomColor: semanticColors.border,
        },
        "& .MuiTableBody-root .MuiTableRow-root:last-of-type .MuiTableCell-root": {
          borderBottom: pagination ? undefined : 0,
        },
      }}
    >
      {loading
        ? (loadingSlot || <DefaultLoadingState label={loadingLabel} rows={loadingRows} />)
        : empty
          ? (emptySlot || <DefaultEmptyState title={emptyTitle} description={emptyDescription} />)
          : children}
    </TableContainer>

    {pagination ? (
      <Box sx={{ borderTop: `1px solid ${semanticColors.border}` }}>
        {pagination}
      </Box>
    ) : null}
  </Paper>
);

export default AdminTableShell;
