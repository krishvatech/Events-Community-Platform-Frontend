import React, { useState, useEffect } from 'react';
import { Avatar, Tooltip, Box, Typography } from '@mui/material';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';
import { getToken, API_BASE } from '../../utils/api';

// Helper function to create auth headers
const authHeader = () => {
    const tok = getToken();
    return tok ? { Authorization: `Bearer ${tok}` } : {};
};

// Helper function to build API URLs
const toApiUrl = (pathOrUrl) => {
    try {
        return new URL(pathOrUrl).toString();
    } catch {
        const rel = String(pathOrUrl).replace(/^\/+/, "");
        return `${API_BASE}/${rel}`;
    }
};

const LoungeSeat = ({ participant, index, maxSeats, radius = 60, seatSize = { empty: 32, occupied: 36 }, onParticipantClick }) => {
    const [isVerified, setIsVerified] = useState(false);

    // Fetch kyc_status if not available in participant data
    useEffect(() => {
        if (!participant) return;

        // Check if kyc_status is already available in participant data
        if (participant?.kyc_status === "approved") {
            setIsVerified(true);
            return;
        }

        // Fetch from API if not available
        const userId = participant?.user_id || participant?.id;
        if (!userId) return;

        let isMounted = true;
        const fetchKycStatus = async () => {
            try {
                const headers = { accept: "application/json", ...authHeader() };
                const res = await fetch(toApiUrl(`users/${userId}/`), { headers });
                if (!res.ok) return;
                const data = await res.json().catch(() => null);
                if (!isMounted || !data) return;

                // Check kyc_status in multiple possible locations
                const kycStatus =
                    data?.kyc_status ||
                    data?.profile?.kyc_status ||
                    data?.user?.kyc_status ||
                    data?.user?.profile?.kyc_status;

                if (kycStatus === "approved") {
                    setIsVerified(true);
                }
            } catch (e) {
                // Silently fail
            }
        };

        fetchKycStatus();
        return () => { isMounted = false; };
    }, [participant]);

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