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

const LoungeSeat = ({ participant, index, maxSeats, onParticipantClick }) => {
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

    // ✅ FIXED SEAT POSITIONING BASED ON JOIN ORDER
    // Ensures consistent, balanced, and predictable placement
    // Seats are assigned in fixed order: RIGHT → LEFT → TOP → BOTTOM
    // This prevents overlapping and maintains visual balance
    //
    // Seat Positions:
    // - 1st user (index 0): RIGHT (0°)
    // - 2nd user (index 1): LEFT (180°) - opposite to 1st for balance
    // - 3rd user (index 2): TOP (270°)
    // - 4th user (index 3): BOTTOM (90°)
    // - 5+ users: Not placed (shown via "+more" indicator)

    const fixedSeats = [
        0,                      // 1st user: RIGHT (0°)
        Math.PI,                // 2nd user: LEFT (180°)
        (3 * Math.PI) / 2,      // 3rd user: TOP (270°)
        Math.PI / 2,            // 4th user: BOTTOM (90°)
    ];

    // Get angle from fixed seat, return 0 if beyond 4 users
    const angle = fixedSeats[index] !== undefined ? fixedSeats[index] : null;

    const radius = 60; // distance from center of table (pixels)
    // Only calculate position if angle is defined (user 1-4)
    const x = angle !== null ? Math.cos(angle) * radius : 0;
    const y = angle !== null ? Math.sin(angle) * radius : 0;

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