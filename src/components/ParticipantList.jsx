import React, { useState } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
} from "@mui/material";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ViewAgendaIcon from "@mui/icons-material/ViewAgenda";
import ViewWeekIcon from "@mui/icons-material/ViewWeek";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const ROLE_CONFIG = {
  speaker: { label: "Speaker", color: "success" },
  moderator: { label: "Moderator", color: "warning" },
  host: { label: "Host", color: "primary" },
};

// Sortable row component for list view
const SortableParticipantRow = ({ participant, index, onEdit, onRemove, onMoveUp, onMoveDown, canMoveUp, canMoveDown, isSaving }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: index,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const roleConfig = ROLE_CONFIG[participant.role] || ROLE_CONFIG.speaker;
  const isAccountParticipant = participant.participantType === "staff" || participant.participantType === "user";
  const accountFullName = `${participant.firstName || ""} ${participant.lastName || ""}`.trim();
  const fallbackDisplayName =
    participant.name || participant.guestName || `${participant.firstName || ""} ${participant.lastName || ""}`.trim();
  const name = isAccountParticipant
    ? accountFullName || fallbackDisplayName || "Unknown Participant"
    : fallbackDisplayName || "Unknown Guest";
  const secondaryEmail = isAccountParticipant ? participant.email : participant.guestEmail;

  return (
    <TableRow ref={setNodeRef} style={style} hover sx={{ bgcolor: "background.paper" }}>
      <TableCell align="center" sx={{ width: "40px", cursor: "grab", "&:active": { cursor: "grabbing" } }} {...attributes} {...listeners}>
        <DragIndicatorIcon fontSize="small" sx={{ color: "text.secondary" }} />
      </TableCell>
      <TableCell>
        <Stack direction="row" spacing={1} alignItems="center">
          <Avatar src={participant.imageUrl} sx={{ width: 36, height: 36, bgcolor: "grey.100" }}>
            {name.charAt(0).toUpperCase()}
          </Avatar>
          <Stack spacing={0} sx={{ flex: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {name}
            </Typography>
            {secondaryEmail && (
              <Typography variant="caption" color="text.secondary">
                {secondaryEmail}
              </Typography>
            )}
          </Stack>
        </Stack>
      </TableCell>
      <TableCell sx={{ width: "120px" }}>
        <Chip
          label={roleConfig.label}
          color={roleConfig.color}
          size="small"
          variant="outlined"
          sx={{ fontWeight: 500 }}
        />
      </TableCell>
      <TableCell align="right" sx={{ width: "180px" }}>
        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
          <IconButton
            size="small"
            disabled={!canMoveUp || isSaving}
            onClick={onMoveUp}
            title="Move up"
            sx={{ transition: "opacity 0.2s" }}
          >
            <ArrowUpwardIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            disabled={!canMoveDown || isSaving}
            onClick={onMoveDown}
            title="Move down"
            sx={{ transition: "opacity 0.2s" }}
          >
            <ArrowDownwardIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={() => onEdit(participant, index)} title="Edit">
            <EditRoundedIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={() => onRemove(participant, index)} title="Delete" color="error">
            <DeleteRoundedIcon fontSize="small" />
          </IconButton>
        </Stack>
      </TableCell>
    </TableRow>
  );
};

const ParticipantList = ({ participants, onEdit, onRemove, onReorder }) => {
  const [viewMode, setViewMode] = useState("list"); // "list" or "grid"
  const [isSaving, setIsSaving] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));
  const handleMoveParticipant = (fromIndex, toIndex) => {
    const newParticipants = [...participants];
    [newParticipants[fromIndex], newParticipants[toIndex]] = [
      newParticipants[toIndex],
      newParticipants[fromIndex],
    ];
    setIsSaving(true);
    setTimeout(() => setIsSaving(false), 300);
    if (onReorder) {
      onReorder(newParticipants);
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    handleMoveParticipant(active.id, over.id);
  };

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
    <Stack spacing={2}>
      {/* View Mode Toggle */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic" }}>
          Drag to reorder • First speaker appears at top of event page
        </Typography>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(e, newMode) => {
            if (newMode !== null) setViewMode(newMode);
          }}
          size="small"
          sx={{ ml: 1 }}
        >
          <ToggleButton value="list" title="List view">
            <ViewAgendaIcon fontSize="small" />
          </ToggleButton>
          <ToggleButton value="grid" title="Grid view">
            <ViewWeekIcon fontSize="small" />
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {viewMode === "list" ? (
        // LIST VIEW - Horizontal rows with drag-and-drop
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <TableContainer component={Paper} sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider", overflow: "hidden" }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "grey.50" }}>
                  <TableCell align="center" sx={{ width: "40px" }}>
                    ≡
                  </TableCell>
                  <TableCell>Speaker</TableCell>
                  <TableCell sx={{ width: "120px" }}>Role</TableCell>
                  <TableCell align="right" sx={{ width: "180px" }}>
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <SortableContext items={participants.map((_, i) => i)} strategy={verticalListSortingStrategy}>
                  {participants.map((participant, index) => (
                    <SortableParticipantRow
                      key={index}
                      participant={participant}
                      index={index}
                      onEdit={onEdit}
                      onRemove={onRemove}
                      onMoveUp={() => handleMoveParticipant(index, index - 1)}
                      onMoveDown={() => handleMoveParticipant(index, index + 1)}
                      canMoveUp={index > 0}
                      canMoveDown={index < participants.length - 1}
                      isSaving={isSaving}
                    />
                  ))}
                </SortableContext>
              </TableBody>
            </Table>
          </TableContainer>
        </DndContext>
      ) : (
        // GRID VIEW - Card layout (original)
        <Grid container spacing={2}>
          {participants.map((participant, index) => {
            const roleConfig = ROLE_CONFIG[participant.role] || ROLE_CONFIG.speaker;
            const isAccountParticipant = participant.participantType === "staff" || participant.participantType === "user";
            const accountFullName = `${participant.firstName || ""} ${participant.lastName || ""}`.trim();
            const fallbackDisplayName =
              participant.name || participant.guestName || `${participant.firstName || ""} ${participant.lastName || ""}`.trim();
            const name = isAccountParticipant
              ? accountFullName || fallbackDisplayName || "Unknown Participant"
              : fallbackDisplayName || "Unknown Guest";
            const secondaryEmail = isAccountParticipant ? participant.email : participant.guestEmail;
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

                          {secondaryEmail && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {secondaryEmail}
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
      )}
    </Stack>
  );
};

export default ParticipantList;
