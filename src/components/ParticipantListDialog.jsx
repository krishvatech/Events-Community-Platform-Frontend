import React from 'react';
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

export default function ParticipantListDialog({ open, onClose, participants, eventTitle, loading, error }) {
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
            <DialogContent dividers>
                {loading ? (
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
                        {participants.map((reg) => (
                            <ListItem key={reg.id}>
                                <ListItemAvatar>
                                    <Avatar src={reg.user_avatar_url} alt={reg.user_name}>
                                        {reg.user_name?.[0]?.toUpperCase()}
                                    </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                    primary={
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <Typography variant="body1">
                                                {reg.user_name || "Unknown User"}
                                            </Typography>
                                            {/* KYC Badge */}
                                            {['approved', 'verified'].includes((reg.user_kyc_status || reg.kyc_status || '').toLowerCase()) && (
                                                <Tooltip title="Verified Member">
                                                    <VerifiedIcon sx={{ fontSize: 16, color: '#22d3ee' }} />
                                                </Tooltip>
                                            )}
                                            {reg.is_host && (
                                                <Chip
                                                    label="Host"
                                                    size="small"
                                                    color="primary"
                                                    sx={{ height: 20, fontSize: '0.7rem' }}
                                                />
                                            )}
                                        </Box>
                                    }
                                    secondary={reg.user_email}
                                />
                            </ListItem>
                        ))}
                    </List>
                )}
            </DialogContent>
        </Dialog>
    );
}
