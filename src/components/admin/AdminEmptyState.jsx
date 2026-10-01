import React, { useId } from "react";
import { Box, Paper, Stack, Typography } from "@mui/material";
import { colors, radii } from "../../styles/designTokens";

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
        borderColor: colors.border,
        borderRadius: `${radii.card}px`,
        bgcolor: colors.white,
        ...sx,
      }}
    >
      <Stack spacing={1.5} alignItems="flex-start">
        {icon ? (
          <Box aria-hidden="true" sx={{ display: "inline-flex", color: colors.tealDark }}>
            {icon}
          </Box>
        ) : null}
        <Typography id={titleId} component={titleComponent} variant="h6" sx={{ color: colors.navy, fontWeight: 750 }}>
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
