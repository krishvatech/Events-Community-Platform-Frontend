import React from 'react';
import { Avatar, Tooltip, Box, Typography } from '@mui/material';

const LoungeSeat = ({ participant, index, maxSeats, onParticipantClick }) => {
    // Calculate position based on index and maxSeats (display count)
    const angle = (index / maxSeats) * 2 * Math.PI;
    const radius = 60; // distance from center of table
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;

    if (!participant) {
        return (
            <Box
                sx={{
                    position: 'absolute',
                    top: `calc(50% + ${y}px)`,
                    left: `calc(50% + ${x}px)`,
                    transform: 'translate(-50%, -50%)',
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    border: '2px dashed rgba(255,255,255,0.2)',
                    bgcolor: 'rgba(255,255,255,0.05)',
                }}
            />
        );
    }

    const avatarSrc =
        participant.avatar_url ||
        participant.user_image_url ||
        participant.user_image ||
        participant.avatar ||
        "";

    const displayName =
        participant.full_name ||
        participant.name ||
        participant.username ||
        "User";

    const handleClick = (event) => {
        event.stopPropagation();
        if (onParticipantClick) onParticipantClick(participant);
    };

    return (
        <Tooltip
            arrow
            placement="top"
            title={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
                    <Avatar src={avatarSrc} sx={{ width: 32, height: 32 }}>
                        {displayName?.[0]?.toUpperCase()}
                    </Avatar>
                    <Box>
                        <Typography sx={{ fontWeight: 700, fontSize: 13 }}>
                            {displayName}
                        </Typography>
                        {participant.username && (
                            <Typography sx={{ fontSize: 12, opacity: 0.8 }}>
                                @{participant.username}
                            </Typography>
                        )}
                    </Box>
                </Box>
            }
        >
            <Avatar
                src={avatarSrc}
                onClick={handleClick}
                sx={{
                    position: 'absolute',
                    top: `calc(50% + ${y}px)`,
                    left: `calc(50% + ${x}px)`,
                    transform: 'translate(-50%, -50%)',
                    width: 36,
                    height: 36,
                    border: '2px solid #5a78ff',
                    boxShadow: '0 0 10px rgba(90,120,255,0.3)',
                    cursor: onParticipantClick ? 'pointer' : 'default',
                }}
            >
                {participant.username?.[0]?.toUpperCase()}
            </Avatar>
        </Tooltip>
    );
};

export default LoungeSeat;
