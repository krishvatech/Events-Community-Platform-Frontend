import React from 'react';
import { Avatar, Tooltip, Box, Typography } from '@mui/material';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';

const LoungeSeat = ({ participant, index, maxSeats, radius = 60, seatSize = { empty: 32, occupied: 36 }, onParticipantClick }) => {
    // IMPORTANT FOR 400+ LIVE USERS:
    // Do not fetch /api/users/<id>/ from every seat render. The lounge-state
    // payload already contains participant metadata such as kyc_status. During
    // breakout movement, per-seat profile lookups create a request storm and
    // make Daphne kill slow /api/users/<id>/ requests.
    const kycStatus =
        participant?.kyc_status ||
        participant?.profile?.kyc_status ||
        participant?.user?.kyc_status ||
        participant?.user?.profile?.kyc_status;
    const isVerified = kycStatus === "approved";

    // ✅ PRODUCTION-READY DYNAMIC SEAT POSITIONING
    // Calculates seat positions for any table size (4, 6, 8, 10, 12, 15, 20, 40+)
    // Ensures consistent, balanced, and predictable circular arrangement
    //
    // Formula: Distribute seats evenly around a 360° circle
    // startAngle = 270° (top) for better visual balance
    // angle = startAngle + (360°/maxSeats) * index

    const calculateSeatAngle = (seatIndex, totalSeats) => {
        // Angle per seat in radians (full circle = 2π)
        const anglePerSeat = (2 * Math.PI) / totalSeats;

        // Start from top (270° = 3π/2) for balanced visual layout
        const startAngle = (3 * Math.PI) / 2;

        // Calculate angle for this specific seat
        return startAngle + (anglePerSeat * seatIndex);
    };

    // Get angle for current seat
    const angle = calculateSeatAngle(index, maxSeats);

    // Calculate position using angle and dynamic radius (passed as prop)
    // x = radius * cos(angle), y = radius * sin(angle)
    const x = angle !== null ? Math.cos(angle) * radius : 0;
    const y = angle !== null ? Math.sin(angle) * radius : 0;

    if (!participant) {
        // Empty seat - scales based on table size
        return (
            <Box
                sx={{
                    position: 'absolute',
                    top: `calc(50% + ${y}px)`,
                    left: `calc(50% + ${x}px)`,
                    transform: 'translate(-50%, -50%)',
                    width: seatSize.empty,
                    height: seatSize.empty,
                    borderRadius: '50%',
                    border: '2px dashed rgba(255,255,255,0.2)',
                    bgcolor: 'rgba(255,255,255,0.05)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                        borderColor: 'rgba(255,255,255,0.4)',
                        bgcolor: 'rgba(255,255,255,0.1)',
                    },
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

    // Occupied seat - scales based on table size
    return (
        <Tooltip
            arrow
            placement="top"
            title={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
                    <Avatar src={avatarSrc} sx={{ width: 32, height: 32 }}>
                        {displayName?.[0]?.toUpperCase()}
                    </Avatar>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: 13 }}>
                            {displayName}
                        </Typography>
                        {isVerified && (
                            <VerifiedRoundedIcon sx={{ fontSize: 14, color: '#14b8a6', flexShrink: 0 }} />
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
                    width: seatSize.occupied,
                    height: seatSize.occupied,
                    border: '2px solid #5a78ff',
                    boxShadow: '0 0 10px rgba(90,120,255,0.3)',
                    cursor: onParticipantClick ? 'pointer' : 'default',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                        boxShadow: '0 0 15px rgba(90,120,255,0.6)',
                        transform: 'translate(-50%, -50%) scale(1.1)',
                    },
                }}
            >
                {participant.username?.[0]?.toUpperCase()}
            </Avatar>
        </Tooltip>
    );
};

export default LoungeSeat;
