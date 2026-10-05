import * as React from "react";
import {
  Box,
  Button,
  ButtonBase,
  Chip,
  IconButton,
  Skeleton,
  Tooltip,
  Typography,
} from "@mui/material";
import EditNoteRoundedIcon from "@mui/icons-material/EditNoteRounded";
import { colors, focus, radii, shadows, semanticColors } from "../styles/designTokens";

const clamp = {
  display: "-webkit-box",
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

function normalizeRole(group) {
  const raw =
    group?.current_user_role ??
    group?.membership_role ??
    group?.member_role ??
    group?.role ??
    group?.membership?.role ??
    group?.current_user_membership?.role ??
    "";
  const value = typeof raw === "string" ? raw : raw?.name || raw?.role || raw?.title || "";
  const role = String(value).toLowerCase();

  if (role.includes("owner")) return "Owner";
  if (role.includes("admin")) return "Admin";
  if (role.includes("moderator") || role === "mod") return "Moderator";
  return "";
}

function membershipLabel(group) {
  if (group?.is_member) return "Member";

  const raw =
    group?.membership_status ??
    group?.status ??
    group?.membership?.status ??
    group?.current_user_membership?.status ??
    "";
  const status = String(raw).toLowerCase();

  if (["pending", "requested", "request"].includes(status)) return "Pending";
  if (["joined", "active", "approved", "member"].includes(status)) return "Member";
  return "";
}

const focusVisible = {
  outline: `${focus.width}px solid ${focus.color}`,
  outlineOffset: focus.offset,
};

export function CommunityGroupCard({
  group,
  imageUrl,
  logoUrl,
  onJoin,
  onOpen,
  onEdit,
  hideJoin = false,
  canEdit = false,
}) {
  const visibility = String(group?.visibility || "").toLowerCase();
  const joinPolicy = String(group?.join_policy || "").toLowerCase();
  const status = String(group?.membership_status || "").toLowerCase();
  const isPrivate = visibility === "private";
  const isApproval =
    visibility === "public" && ["public_approval", "approval"].includes(joinPolicy);
  const isInviteOnly = joinPolicy === "invite";
  const pending = status === "pending";
  const joined = status === "joined" || Boolean(group?.is_member);
  const memberStatus = membershipLabel(group);
  const role = normalizeRole(group);
  const members = group?.member_count ?? group?.members_count ?? group?.members?.length ?? 0;
  const posts = group?.post_count ?? group?.posts_count ?? 0;
  const activity = group?.weekly_activity ?? group?.activity_count ?? null;
  const headline = group?.short_description || "";
  const description = group?.description || group?.desc || group?.topic || "";
  const category = group?.category || "";
  const subcategory = group?.subcategory || "";
  const owner = group?.owner_name || group?.created_by_name || "";
  const groupName = group?.name || "Group";

  const actionLabel = joined
    ? "Open Group"
    : pending
      ? "Request pending"
      : isInviteOnly
        ? "Invite Only"
        : isApproval
          ? "Request to Join"
          : "Join";
  const showOpenAction = hideJoin || joined;

  return (
    <Box
      component="article"
      sx={{
        height: "100%",
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        bgcolor: semanticColors.surface,
        border: `1px solid ${semanticColors.border}`,
        borderRadius: `${radii.card}px`,
        boxShadow: shadows.sm,
        transition: "border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease",
        "&:hover": {
          borderColor: semanticColors.borderHover,
          boxShadow: shadows.md,
          transform: "translateY(-1px)",
        },
      }}
    >
      <ButtonBase
        onClick={() => onOpen?.(group)}
        aria-label={`Open ${groupName}`}
        sx={{
          position: "relative",
          width: "100%",
          aspectRatio: "16 / 9",
          display: "block",
          overflow: "hidden",
          bgcolor: semanticColors.surfaceCool,
          "&.Mui-focusVisible": focusVisible,
        }}
      >
        {imageUrl ? (
          <Box
            component="img"
            src={imageUrl}
            alt={`${groupName} cover`}
            loading="lazy"
            sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <Typography
            aria-hidden="true"
            sx={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              color: semanticColors.textMeta,
              fontFamily: "serif",
              fontSize: 48,
              fontWeight: 700,
            }}
          >
            {groupName.trim().charAt(0).toUpperCase() || "G"}
          </Typography>
        )}

        {logoUrl && (
          <Box
            sx={{
              position: "absolute",
              left: 16,
              bottom: 12,
              width: 48,
              height: 48,
              overflow: "hidden",
              bgcolor: semanticColors.surface,
              border: `3px solid ${semanticColors.surface}`,
              borderRadius: "50%",
              boxShadow: shadows.md,
            }}
          >
            <Box
              component="img"
              src={logoUrl}
              alt={`${groupName} logo`}
              sx={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </Box>
        )}
      </ButtonBase>

      <Box sx={{ p: 2, flexGrow: 1, display: "flex", flexDirection: "column", gap: 1 }}>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, alignItems: "center" }}>
          <Chip size="small" variant="outlined" label={isPrivate ? "Private" : "Public"} sx={{ borderRadius: `${radii.tag}px` }} />
          {memberStatus && (
            <Chip
              size="small"
              color={memberStatus === "Pending" ? "warning" : "success"}
              variant="outlined"
              label={memberStatus}
              sx={{ borderRadius: `${radii.tag}px` }}
            />
          )}
          {!memberStatus && isApproval && (
            <Chip size="small" color="warning" variant="outlined" label="Approval required" sx={{ borderRadius: `${radii.tag}px` }} />
          )}
          {!memberStatus && isInviteOnly && (
            <Chip size="small" variant="outlined" label="Invite only" sx={{ borderRadius: `${radii.tag}px` }} />
          )}
          {role && (
            <Chip size="small" color="primary" variant="outlined" label={role} sx={{ borderRadius: `${radii.tag}px` }} />
          )}
        </Box>

        {(category || subcategory) && (
          <Typography variant="caption" sx={{ color: semanticColors.tealText, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            {[category, subcategory].filter(Boolean).join(" · ")}
          </Typography>
        )}

        <ButtonBase
          onClick={() => onOpen?.(group)}
          sx={{ alignSelf: "stretch", justifyContent: "flex-start", borderRadius: `${radii.field}px`, textAlign: "left", "&.Mui-focusVisible": focusVisible }}
        >
          <Typography
            component="h3"
            sx={{ minWidth: 0, color: semanticColors.text, fontSize: 17, fontWeight: 800, lineHeight: 1.3, overflowWrap: "anywhere", ...clamp, WebkitLineClamp: 2 }}
          >
            {groupName}
          </Typography>
        </ButtonBase>

        {owner && <Typography variant="caption" sx={{ color: semanticColors.textBody }}>by {owner}</Typography>}
        {headline && (
          <Typography variant="body2" sx={{ color: semanticColors.text, fontWeight: 600, lineHeight: 1.5, ...clamp, WebkitLineClamp: 2 }}>
            {headline}
          </Typography>
        )}
        {description && (
          <Typography variant="body2" sx={{ color: semanticColors.textBody, lineHeight: 1.55, ...clamp, WebkitLineClamp: 2 }}>
            {description}
          </Typography>
        )}

        <Typography variant="caption" sx={{ mt: "auto", pt: 0.5, color: semanticColors.textBody }}>
          {members} {members === 1 ? "member" : "members"}
          {posts > 0 ? ` · ${posts} ${posts === 1 ? "post" : "posts"}` : ""}
          {activity != null ? ` · ${activity}/week` : ""}
        </Typography>

        {group?.parent_group && (
          <Typography variant="caption" sx={{ color: semanticColors.textBody }}>
            Subgroup of <strong>{group.parent_group.name}</strong>
          </Typography>
        )}
      </Box>

      <Box sx={{ minHeight: 56, px: 2, py: 1, display: "flex", gap: 1, alignItems: "center", borderTop: `1px solid ${semanticColors.border}` }}>
        {canEdit && (
          <Tooltip title="Edit group">
            <IconButton
              size="small"
              aria-label={`Edit ${groupName}`}
              onClick={() => onEdit?.(group)}
              sx={{ minWidth: 40, minHeight: 40, color: semanticColors.textBody }}
            >
              <EditNoteRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}

        {showOpenAction ? (
          <Button size="small" onClick={() => onOpen?.(group)} sx={{ ml: "auto", minHeight: 40, textTransform: "none", fontWeight: 700 }}>
            Open Group
          </Button>
        ) : (
          <Button
            size="small"
            variant={isApproval ? "outlined" : "contained"}
            disabled={pending || joined}
            onClick={() => onJoin?.(group)}
            sx={{ ml: "auto", minHeight: 40, textTransform: "none", fontWeight: 700 }}
          >
            {actionLabel}
          </Button>
        )}
      </Box>
    </Box>
  );
}

export function CommunityGroupCardSkeleton() {
  return (
    <Box
      aria-hidden="true"
      sx={{ height: "100%", overflow: "hidden", bgcolor: semanticColors.surface, border: `1px solid ${semanticColors.border}`, borderRadius: `${radii.card}px`, boxShadow: shadows.sm }}
    >
      <Skeleton variant="rectangular" sx={{ width: "100%", aspectRatio: "16 / 9" }} />
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: "flex", gap: 1, mb: 1.5 }}>
          <Skeleton variant="rounded" width={58} height={24} />
          <Skeleton variant="rounded" width={76} height={24} />
        </Box>
        <Skeleton variant="text" width="72%" height={28} />
        <Skeleton variant="text" width="45%" />
        <Skeleton variant="text" width="96%" />
        <Skeleton variant="text" width="82%" />
        <Skeleton variant="text" width="35%" sx={{ mt: 1 }} />
      </Box>
      <Box sx={{ px: 2, py: 1.5, borderTop: `1px solid ${semanticColors.border}` }}>
        <Skeleton variant="rounded" width={104} height={32} sx={{ ml: "auto" }} />
      </Box>
    </Box>
  );
}
