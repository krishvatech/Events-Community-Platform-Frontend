import React, { useRef, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    Avatar,
    IconButton,
    Typography,
    Box,
    CircularProgress,
    Chip,
    Tooltip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import VerifiedIcon from '@mui/icons-material/Verified';
import LaunchIcon from '@mui/icons-material/Launch';
import { Link as RouterLink } from "react-router-dom";

const ROLE_CHIP_PROPS = {
    host: { label: "Host", color: "primary" },
    speaker: { label: "Speaker", color: "success" },
    moderator: { label: "Moderator", color: "secondary" },
};

export default function ParticipantListDialog({
    open,
    onClose,
    participants,
    eventTitle,
    loading,
    error,
    hiddenRolesCount = 0,
    totalRegisteredCount = 0,
    loadingMore = false,
    hasMore = false,
    onLoadMore = null,
}) {
    const contentRef = useRef(null);

    useEffect(() => {
        if (!open || !contentRef.current) return;

        const handleScroll = () => {
            const element = contentRef.current;
            if (!element) return;

            // Detect scroll near bottom (within 100px)
            const isNearBottom =
                element.scrollHeight - (element.scrollTop + element.clientHeight) < 100;

            if (isNearBottom && hasMore && !loadingMore && !loading && onLoadMore) {
                onLoadMore();
            }
        };

        const element = contentRef.current;
        element.addEventListener('scroll', handleScroll);
        return () => element.removeEventListener('scroll', handleScroll);
    }, [open, hasMore, loadingMore, loading, onLoadMore]);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ m: 0, p: 2, pr: 6 }}>
                Participants - {eventTitle}
                <IconButton
                    aria-label="close"
                    onClick={onClose}
                    sx={{
                        position: 'absolute',
                        right: 8,
                        top: 8,
                        color: (theme) => theme.palette.grey[500],
                    }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers ref={contentRef} sx={{ overflowY: 'auto', maxHeight: '60vh', height: '60vh' }}>
                {loading && participants.length === 0 ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : error ? (
                    <Box sx={{ p: 2, textAlign: 'center' }}>
                        <Typography color="error">{error}</Typography>
                    </Box>
                ) : participants.length === 0 ? (
                    <Box sx={{ p: 2, textAlign: 'center' }}>
                        <Typography color="text.secondary">No participants registered yet.</Typography>
                    </Box>
                ) : (
                    <List>
                        {hiddenRolesCount > 0 && (
                            <Box sx={{ px: 2, pb: 1 }}>
                                <Typography variant="caption" color="text.secondary">
                                    Some organizer roles are hidden for this event.
                                    {totalRegisteredCount > participants.length ? ` Showing ${participants.length} of ${totalRegisteredCount} registered.` : ""}
                                </Typography>
                            </Box>
                        )}
                        {participants.map((reg) => (
                            <ListItem
                                key={reg.registration_id || reg.user_id || reg.display_name}
                                secondaryAction={
                                    reg.is_profile_clickable ? (
                                        <Tooltip title="Open profile">
                                            <IconButton
                                                edge="end"
                                                aria-label={`Open ${reg.display_name || "participant"} profile`}
                                                component={RouterLink}
                                                to={reg.profile_url}
                                                sx={{ color: "text.secondary" }}
                                            >
                                                <LaunchIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    ) : null
                                }
                            >
                                <ListItemAvatar>
                                    <Avatar
                                        src={reg.avatar_url}
                                        alt={reg.display_name}
                                        component={reg.is_profile_clickable ? RouterLink : "div"}
                                        to={reg.is_profile_clickable ? reg.profile_url : undefined}
                                        sx={reg.is_profile_clickable ? { cursor: "pointer" } : undefined}
                                    >
                                        {reg.display_name?.[0]?.toUpperCase()}
                                    </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                    primary={
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <Typography
                                                variant="body1"
                                                component={reg.is_profile_clickable ? RouterLink : "span"}
                                                to={reg.is_profile_clickable ? reg.profile_url : undefined}
                                                sx={reg.is_profile_clickable ? {
                                                    color: "inherit",
                                                    textDecoration: "none",
                                                    "&:hover": { textDecoration: "underline" },
                                                } : undefined}
                                            >
                                                {reg.display_name || "Unknown User"}
                                            </Typography>
                                            {['approved', 'verified'].includes((reg.kyc_status || '').toLowerCase()) && (
                                                <Tooltip title="Verified Member">
                                                    <VerifiedIcon sx={{ fontSize: 16, color: '#22d3ee' }} />
                                                </Tooltip>
                                            )}
                                            {reg.primary_role && !reg.is_hidden_from_public_role_display && (
                                                <Chip
                                                    label={ROLE_CHIP_PROPS[reg.primary_role]?.label || reg.role_labels?.[0] || "Participant"}
                                                    size="small"
                                                    color={ROLE_CHIP_PROPS[reg.primary_role]?.color || "default"}
                                                    sx={{ height: 20, fontSize: '0.7rem' }}
                                                />
                                            )}
                                        </Box>
                                    }
                                    secondary={reg.email || reg.user_email || ""}
                                />
                            </ListItem>
                        ))}
                        {loadingMore && (
                            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                                <CircularProgress size={24} />
                            </Box>
                        )}
                    </List>
                )}
            </DialogContent>
        </Dialog>
    );
}
