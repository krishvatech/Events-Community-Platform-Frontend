import React, { useMemo, useRef, useState } from 'react';
import { Box, Paper, Typography, Button, IconButton } from '@mui/material';
import LoungeSeat from './LoungeSeat';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';

const LoungeTable = ({
    table,
    onJoin,
    onLeave,
    currentUserId,
    myUsername,
    isAdmin,
    onUpdateIcon,
    onEditTable,
    onDeleteTable,
    onParticipantClick,
    loungeOpenStatus, // ✅ NEW: lounge availability status
}) => {
    const isUserAtThisTable = Object.values(table.participants || {}).some((p) => {
        return String(p.user_id) === String(currentUserId) || p.username === myUsername;
    });
    const maxSeats = table.max_seats || 4;

    // ✅ NEW: Check if lounge is open
    const isLoungeClosed = loungeOpenStatus?.status === 'CLOSED';
    const isFull = Object.keys(table.participants || {}).length >= maxSeats;
    const [iconUploading, setIconUploading] = useState(false);
    const iconInputRef = useRef(null);

    const iconSrc = useMemo(() => {
        return (
            table.icon_url ||
            table.icon ||
            table.logo_url ||
            table.logo ||
            ""
        );
    }, [table]);

    const handleJoin = (seatIndex) => {
        if (onJoin) onJoin(table.id, seatIndex);
    };

    const handleIconPick = async (event) => {
        const file = event.target.files?.[0];
        if (!file || !onUpdateIcon) return;
        setIconUploading(true);
        try {
            await onUpdateIcon(table.id, file);
        } finally {
            setIconUploading(false);
            if (iconInputRef.current) {
                iconInputRef.current.value = "";
            }
        }
    };

    return (
        <Paper
            elevation={0}
            sx={{
                p: 2,
                borderRadius: 4,
                bgcolor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                textAlign: 'center',
                position: 'relative',
                minHeight: 280,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'transform 0.2s, border-color 0.2s',
                '&:hover': {
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    transform: 'translateY(-4px)',
                },
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: 'white' }}>
                    {table.name}
                </Typography>
                {isAdmin && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Button
                            size="small"
                            variant="text"
                            component="label"
                            disabled={iconUploading}
                            sx={{
                                textTransform: 'none',
                                color: 'rgba(255,255,255,0.7)',
                                minWidth: 'auto',
                            }}
                        >
                            {iconUploading ? 'Uploading...' : (iconSrc ? 'Replace logo' : 'Upload logo')}
                            <input
                                ref={iconInputRef}
                                type="file"
                                hidden
                                accept="image/*"
                                onChange={handleIconPick}
                            />
                        </Button>
                        <IconButton
                            size="small"
                            onClick={() => onEditTable && onEditTable(table)}
                            sx={{ color: 'rgba(255,255,255,0.7)' }}
                        >
                            <EditRoundedIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                            size="small"
                            onClick={() => onDeleteTable && onDeleteTable(table)}
                            sx={{ color: 'rgba(255,255,255,0.7)' }}
                        >
                            <DeleteOutlineRoundedIcon fontSize="small" />
                        </IconButton>
                    </Box>
                )}
            </Box>

            {/* Table Visualization */}
            <Box
                sx={{
                    mx: 'auto',
                    my: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Box
                    sx={{
                        position: 'relative',
                        width: 140,
                        height: 140,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    {/* The Table itself */}
                    <Box
                        sx={{
                            width: 80,
                            height: 80,
                            borderRadius: 3,
                            bgcolor: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.2)',
                        }}
                    >
                        {iconSrc ? (
                            <Box
                                component="img"
                                src={iconSrc}
                                alt={`${table.name} logo`}
                                sx={{
                                    width: 56,
                                    height: 56,
                                    objectFit: 'contain',
                                    borderRadius: 2,
                                    bgcolor: 'rgba(0,0,0,0.2)',
                                }}
                            />
                        ) : (
                            <AutoAwesomeIcon sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 32 }} />
                        )}
                    </Box>

                    {/* Seats around the table (display up to 5 without overlap) */}
                    {(() => {
                        const entries = Object.entries(table.participants || {})
                            .map(([seat, participant]) => ({
                                seat: Number(seat),
                                participant,
                            }))
                            .filter((item) => Number.isFinite(item.seat) && item.participant)
                            .sort((a, b) => a.seat - b.seat);
                        // ✅ FIXED SEAT LIMIT: Only 4 seats available (Right, Left, Top, Bottom)
                        const displayLimit = 4;
                        const displayParticipants = entries.slice(0, displayLimit);
                        const displayCount = Math.min(
                            displayLimit,
                            Math.max(maxSeats, displayParticipants.length, 1)
                        );
                        const availableSeatIndices = [];
                        for (let i = 0; i < maxSeats; i++) {
                            if (!table.participants?.[i] && !table.participants?.[String(i)]) {
                                availableSeatIndices.push(i);
                            }
                        }
                        const slots = [];
                        for (let i = 0; i < displayCount; i++) {
                            const occupant = displayParticipants[i];
                            if (occupant) {
                                slots.push({ participant: occupant.participant, seatIndex: occupant.seat });
                            } else {
                                slots.push({ participant: null, seatIndex: availableSeatIndices.shift() });
                            }
                        }

                        return slots.map((slot, i) => (
                            <Box
                                key={`seat-${i}`}
                                onClick={() =>
                                    !slot.participant &&
                                    !isUserAtThisTable &&
                                    slot.seatIndex !== undefined &&
                                    handleJoin(slot.seatIndex)
                                }
                                sx={{
                                    cursor:
                                        !slot.participant &&
                                        !isUserAtThisTable &&
                                        slot.seatIndex !== undefined
                                            ? 'pointer'
                                            : 'default',
                                }}
                            >
                                <LoungeSeat
                                    index={i}
                                    maxSeats={displayCount}
                                    participant={slot.participant}
                                    onParticipantClick={slot.participant ? onParticipantClick : undefined}
                                />
                            </Box>
                        ));
                    })()}
                </Box>

                {(() => {
                    const totalParticipants = Object.values(table.participants || {}).filter(Boolean).length;
                    // ✅ Show "+more" when there are more than 4 users (fixed seat limit)
                    const extraCount = Math.max(0, totalParticipants - 4);
                    if (extraCount <= 0) return null;
                    return (
                        <Box
                            sx={{
                                mt: 1.5,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                px: 1.5,
                                py: 0.75,
                                borderRadius: 1.5,
                                bgcolor: 'rgba(90, 120, 255, 0.15)',
                                border: '1px solid rgba(90, 120, 255, 0.3)',
                                backdropFilter: 'blur(4px)',
                                transition: 'all 0.2s ease-in-out',
                                '&:hover': {
                                    bgcolor: 'rgba(90, 120, 255, 0.25)',
                                    borderColor: 'rgba(90, 120, 255, 0.5)',
                                    boxShadow: '0 0 12px rgba(90, 120, 255, 0.2)',
                                },
                                cursor: 'default',
                            }}
                            title={`${extraCount} more participant${extraCount !== 1 ? 's' : ''} at this table`}
                        >
                            <Typography
                                sx={{
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color: 'rgba(255,255,255,0.85)',
                                    letterSpacing: '0.02em',
                                }}
                            >
                                +{extraCount} more
                            </Typography>
                        </Box>
                    );
                })()}
            </Box>

            {isUserAtThisTable ? (
                <Button
                    fullWidth
                    variant="contained"
                    color="error"
                    onClick={onLeave}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
                >
                    Leave Table
                </Button>
            ) : (
                <Button
                    fullWidth
                    variant="outlined"
                    disabled={isLoungeClosed || isFull}
                    title={isLoungeClosed ? 'Lounge is closed' : isFull ? 'Table is full' : 'Join this table'}
                    onClick={() => {
                        // Find first available seat index
                        const participants = table.participants || {};
                        for (let i = 0; i < maxSeats; i++) {
                            if (!participants[i]) {
                                handleJoin(i);
                                break;
                            }
                        }
                    }}
                    sx={{
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 700,
                        borderColor: 'rgba(255, 255, 255, 0.3)',
                        color: 'white',
                        opacity: isLoungeClosed ? 0.5 : 1,
                        '&:hover:not(:disabled)': {
                            borderColor: 'white',
                            bgcolor: 'rgba(255, 255, 255, 0.1)',
                        },
                        '&:disabled': {
                            borderColor: 'rgba(255, 255, 255, 0.2)',
                            color: 'rgba(255, 255, 255, 0.5)',
                            cursor: 'not-allowed',
                        },
                    }}
                >
                    {isLoungeClosed ? 'Lounge Closed' : 'Join'}
                </Button>
            )}
        </Paper>
    );
};

export default LoungeTable;
