import React, { useMemo } from "react";
import { Box, List, ListItem, Typography } from "@mui/material";

import { topActionSx } from "./ProfileEditButton";
import { groupExperiences, positionDuration, tenureDuration } from "../../utils/experienceGroups";

const clamp2 = {
  mt: 0.5,
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  whiteSpace: "normal",
};

const dot = {
  position: "absolute",
  left: 4,
  top: 7,
  width: 8,
  height: 8,
  borderRadius: "50%",
  bgcolor: "grey.400",
};

const connector = {
  position: "absolute",
  left: 7,
  top: 19,
  bottom: -5,
  width: 2,
  bgcolor: "grey.300",
};

const joinDot = (...parts) => parts.filter(Boolean).join(" · ");

/**
 * LinkedIn-style experience list: positions at the same organization are grouped
 * under one company header (with total tenure) and shown on a timeline.
 * Single-position organizations render as a plain one-line entry, as before.
 *
 * Props:
 *  - experiences: API experience rows, already sorted
 *  - formatRange(start, end, current): page's "Month YYYY - present" formatter
 *  - renderActions(x): optional per-position actions (edit/delete)
 *  - showDescription: show 2-line clamped description (default true)
 *  - titleSeparator: between position and org on single entries (default " · ")
 *  - actionPr: right padding (theme units, md+) reserved for the actions (default 6)
 */
export default function ExperienceList({
  experiences,
  formatRange,
  renderActions,
  showDescription = true,
  titleSeparator = " · ",
  actionPr = 6,
}) {
  const groups = useMemo(() => groupExperiences(experiences), [experiences]);
  const withActions = typeof renderActions === "function";
  const actionSx = withActions ? { pr: { xs: 0, md: actionPr }, ...topActionSx } : null;

  const rangeOf = (x) =>
    formatRange(x.start_date || x.start, x.end_date || x.end, x.currently_work_here ?? x.current);

  const description = (x) =>
    showDescription && x.description ? (
      <Typography variant="body2" color="text.secondary" sx={clamp2}>
        {x.description}
      </Typography>
    ) : null;

  return (
    <List dense disablePadding>
      {groups.map((g) => {
        if (g.positions.length === 1) {
          const x = g.positions[0];
          return (
            <ListItem
              key={x.id ?? g.key}
              disableGutters
              sx={{ py: 0.5, display: "block", ...actionSx }}
              secondaryAction={withActions ? renderActions(x) : undefined}
            >
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {x.position || "Role not specified"}
                {g.orgName ? `${titleSeparator}${g.orgName}` : ""}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {joinDot(rangeOf(x), x.location)}
              </Typography>
              {description(x)}
            </ListItem>
          );
        }

        return (
          <ListItem key={g.key} disableGutters sx={{ py: 0.75, display: "block" }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {g.orgName}
            </Typography>
            <Typography variant="caption" color="text.secondary" component="div">
              {joinDot(g.employmentType, tenureDuration(g.positions))}
            </Typography>

            <List dense disablePadding sx={{ mt: 0.5 }}>
              {g.positions.map((x, i) => (
                <ListItem
                  key={x.id ?? i}
                  disableGutters
                  sx={{ position: "relative", display: "block", py: 0.5, pl: 3, ...actionSx }}
                  secondaryAction={withActions ? renderActions(x) : undefined}
                >
                  <Box sx={dot} />
                  {i < g.positions.length - 1 && <Box sx={connector} />}
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {x.position || "Role not specified"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" component="div">
                    {joinDot(rangeOf(x), positionDuration(x))}
                  </Typography>
                  {x.location && (
                    <Typography variant="caption" color="text.secondary" component="div">
                      {x.location}
                    </Typography>
                  )}
                  {description(x)}
                </ListItem>
              ))}
            </List>
          </ListItem>
        );
      })}
    </List>
  );
}
