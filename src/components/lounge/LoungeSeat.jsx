import React from 'react';
import { Avatar, Tooltip, Box } from '@mui/material';

const LoungeSeat = ({ participant, index, maxSeats }) => {
    // Calculate position based on index and maxSeats
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

    return (
        <Tooltip title={participant.full_name || participant.username}>
            <Avatar
                src={avatarSrc}
                sx={{
                    position: 'absolute',
                    top: `calc(50% + ${y}px)`,
                    left: `calc(50% + ${x}px)`,
                    transform: 'translate(-50%, -50%)',
                    width: 36,
                    height: 36,
                    border: '2px solid #5a78ff',
                    boxShadow: '0 0 10px rgba(90,120,255,0.3)',
                }}
            >
                {participant.username?.[0]?.toUpperCase()}
            </Avatar>
        </Tooltip>
    );
};

export default LoungeSeat;
