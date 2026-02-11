import React from "react";
import {
  Grid,
  Card,
  CardContent,
  Stack,
  Avatar,
  Typography,
  Chip,
  IconButton,
  Box,
} from "@mui/material";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";

const ROLE_CONFIG = {
  speaker: { label: "Speaker", color: "primary" },
  moderator: { label: "Moderator", color: "secondary" },
  host: { label: "Host", color: "success" },
};

const ParticipantList = ({ participants, onEdit, onRemove }) => {
  if (!participants || participants.length === 0) {
    return (
      <Box
        sx={{
          p: 3,
          textAlign: "center",
          backgroundColor: "rgba(0, 0, 0, 0.02)",
          borderRadius: "12px",
          border: "1px dashed",
          borderColor: "divider",
        }}
      >
        <Typography color="text.secondary" variant="body2">
          No participants added yet
        </Typography>
      </Box>
    );
  }

  return (
    <Grid container spacing={2}>
      {participants.map((participant, index) => {
        const roleConfig = ROLE_CONFIG[participant.role] || ROLE_CONFIG.speaker;
        const name =
          participant.participantType === "staff"
            ? `${participant.firstName || ""} ${participant.lastName || ""}`.trim() ||
              participant.email
            : participant.guestName || "Unknown Guest";
        const email =
          participant.participantType === "staff"
            ? participant.email
            : participant.guestEmail;
        const bio = participant.bio || "";
        const bioPreview = bio.length > 80 ? `${bio.substring(0, 80)}...` : bio;

        return (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                position: "relative",
                transition: "box-shadow 0.3s",
                "&:hover": {
                  boxShadow: 3,
                },
              }}
            >
              {/* Action Buttons */}
              <Box
                sx={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  display: "flex",
                  gap: 0.5,
                  backgroundColor: "rgba(255, 255, 255, 0.9)",
                  borderRadius: "8px",
                  zIndex: 1,
                }}
              >
                <IconButton
                  size="small"
                  onClick={() => onEdit(participant, index)}
                  sx={{
                    "&:hover": {
                      backgroundColor: "primary.light",
                      color: "primary.main",
                    },
                  }}
                >
                  <EditRoundedIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => onRemove(participant, index)}
                  sx={{
                    "&:hover": {
                      backgroundColor: "error.light",
                      color: "error.main",
                    },
                  }}
                >
                  <DeleteRoundedIcon fontSize="small" />
                </IconButton>
              </Box>

              {/* Card Content */}
              <CardContent sx={{ pb: 1 }}>
                <Stack spacing={1.5} sx={{ mt: 2 }}>
                  {/* Avatar & Name */}
                  <Stack direction="row" spacing={1.5} alignItems="flex-start">
                    <Avatar
                      src={participant.imageUrl}
                      alt={name}
                      sx={{
                        width: 56,
                        height: 56,
                        flexShrink: 0,
                        backgroundColor: "primary.light",
                      }}
                    >
                      {name.charAt(0).toUpperCase()}
                    </Avatar>

                    <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontWeight: 600,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {name}
                      </Typography>

                      {email && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {email}
                        </Typography>
                      )}
                    </Stack>
                  </Stack>

                  {/* Role Badge */}
                  <Box>
                    <Chip
                      label={roleConfig.label}
                      color={roleConfig.color}
                      size="small"
                      variant="outlined"
                      sx={{ fontWeight: 500 }}
                    />
                  </Box>

                  {/* Bio Preview */}
                  {bioPreview && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        minHeight: "2.8em",
                      }}
                    >
                      {bioPreview}
                    </Typography>
                  )}

                </Stack>
              </CardContent>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
};

export default ParticipantList;
