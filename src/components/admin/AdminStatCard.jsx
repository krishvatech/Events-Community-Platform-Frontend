import React from "react";
import { Box, Paper, Skeleton, Stack, Typography } from "@mui/material";
import { colors, radii, semanticColors } from "../../styles/designTokens";

const AdminStatCard = ({
  label,
  value,
  helper,
  icon,
  secondary,
  loading = false,
  sx,
}) => (
  <Paper
    component="section"
    aria-label={label}
    aria-busy={loading || undefined}
    variant="outlined"
    sx={{
      height: "100%",
      minHeight: 116,
      p: 2.25,
      borderColor: semanticColors.border,
      borderRadius: `${radii.card}px`,
      bgcolor: semanticColors.surface,
      ...sx,
    }}
  >
    <Stack spacing={1} height="100%">
      <Stack direction="row" spacing={1.5} alignItems="flex-start" justifyContent="space-between">
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
          {label}
        </Typography>
        {icon ? (
          <Box aria-hidden="true" sx={{ display: "inline-flex", color: semanticColors.tealText, flexShrink: 0 }}>
            {icon}
          </Box>
        ) : null}
      </Stack>

      {loading ? (
        <Skeleton aria-label={`Loading ${label}`} width="70%" height={36} />
      ) : (
        <Typography component="p" variant="h5" sx={{ color: semanticColors.text, fontWeight: 800, lineHeight: 1.25 }}>
          {value}
        </Typography>
      )}

      {(helper || secondary) ? (
        <Stack direction="row" spacing={1} alignItems="flex-end" justifyContent="space-between" sx={{ mt: "auto" }}>
          {helper ? <Typography variant="caption" color="text.secondary">{helper}</Typography> : <span />}
          {secondary}
        </Stack>
      ) : null}
    </Stack>
  </Paper>
);

export default AdminStatCard;
