import React, { useId } from "react";
import { Box, Paper, Stack, Typography } from "@mui/material";
import { colors, radii, semanticColors } from "../../styles/designTokens";

const AdminEmptyState = ({
  title,
  description,
  icon,
  action,
  compact = false,
  titleComponent = "h2",
  sx,
}) => {
  const titleId = useId();
  const descriptionId = useId();

  return (
    <Paper
      component="section"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      variant="outlined"
      sx={{
        p: compact ? 2.5 : 4,
        borderColor: semanticColors.border,
        borderRadius: `${radii.card}px`,
        bgcolor: semanticColors.surface,
        ...sx,
      }}
    >
      <Stack spacing={1.5} alignItems="flex-start">
        {icon ? (
          <Box aria-hidden="true" sx={{ display: "inline-flex", color: semanticColors.tealText }}>
            {icon}
          </Box>
        ) : null}
        <Typography id={titleId} component={titleComponent} variant="h6" sx={{ color: semanticColors.text, fontWeight: 750 }}>
          {title}
        </Typography>
        {description ? (
          <Typography id={descriptionId} color="text.secondary">
            {description}
          </Typography>
        ) : null}
        {action ? <Box sx={{ pt: 0.5 }}>{action}</Box> : null}
      </Stack>
    </Paper>
  );
};

export default AdminEmptyState;
