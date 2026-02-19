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

    // ✅ DYNAMIC SIZING BASED ON SEAT COUNT (Production-Ready for 4-40+ seats)
    // Scales container, table, radius, and seat size based on maxSeats
    // Formula: Base dimensions increase as seat count increases for proper circular arrangement
    const getTableDimensions = (seatCount) => {
        if (seatCount <= 4) return { container: 140, table: 80, radius: 60, seatSize: { empty: 32, occupied: 36 } };
        if (seatCount <= 6) return { container: 160, table: 90, radius: 70, seatSize: { empty: 30, occupied: 34 } };
        if (seatCount <= 8) return { container: 180, table: 100, radius: 80, seatSize: { empty: 28, occupied: 32 } };
        if (seatCount <= 10) return { container: 200, table: 110, radius: 90, seatSize: { empty: 26, occupied: 30 } };
        if (seatCount <= 12) return { container: 220, table: 120, radius: 100, seatSize: { empty: 24, occupied: 28 } };
        if (seatCount <= 15) return { container: 240, table: 130, radius: 110, seatSize: { empty: 22, occupied: 26 } };
        if (seatCount <= 20) return { container: 260, table: 140, radius: 120, seatSize: { empty: 20, occupied: 24 } };
        // For 20+ seats, scale dynamically based on excess seats
        const extraSeats = Math.max(0, seatCount - 20);
        const containerSize = Math.min(260 + (extraSeats * 4), 380);
        const tableSize = Math.min(140 + (extraSeats * 2), 200);
        const radiusSize = Math.min(120 + (extraSeats * 2), 170);
        const seatEmptySize = Math.max(18, 20 - Math.floor(extraSeats / 5));
        const seatOccupiedSize = Math.max(22, 24 - Math.floor(extraSeats / 5));
        return { container: containerSize, table: tableSize, radius: radiusSize, seatSize: { empty: seatEmptySize, occupied: seatOccupiedSize } };
    };

    const tableDimensions = getTableDimensions(maxSeats);

    // ✅ NEW: Check if lounge is open
    // For LOUNGE tables: apply lounge availability check
    // For BREAKOUT tables: allow join regardless of lounge status
    const isLoungeClosed = loungeOpenStatus?.status === 'CLOSED';
    const isBreakoutTable = table.category === 'BREAKOUT';
    const shouldDisableJoin = isLoungeClosed && !isBreakoutTable;
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
                borderRadius: 3,
                bgcolor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                textAlign: 'center',
                position: 'relative',
                // ✅ FIXED: All table cards have same dimensions
                // Grid handles width, we set fixed height
                height: 420,
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                overflow: 'hidden',
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

            {/* Table Visualization - Scales based on maxSeats (constrained within card) */}
            <Box
                sx={{
                    mx: 'auto',
                    my: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: 1,
                    overflow: 'visible',
                    maxHeight: 250,
                    width: '100%',
                    px: 1,
                }}
            >
                <Box
                    sx={{
                        position: 'relative',
                        width: tableDimensions.container,
                        height: tableDimensions.container,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'width 0.3s ease, height 0.3s ease',
                    }}
                >
                    {/* The Table itself - Scales dynamically */}
                    <Box
                        sx={{
                            width: tableDimensions.table,
                            height: tableDimensions.table,
                            borderRadius: 3,
                            bgcolor: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.2)',
                            transition: 'width 0.3s ease, height 0.3s ease',
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

                    {/* Seats around the table - Always display ALL configured seats */}
                    {(() => {
                        // ✅ PRODUCTION-READY: Render ALL seats based on maxSeats (4, 6, 8, 10, 12, 15, 20, 40+)
                        // Each seat is positioned evenly in a circle
                        // Get all participants by seat index
                        const participants = table.participants || {};
                        const participantsBySeat = {};
                        Object.entries(participants).forEach(([seat, participant]) => {
                            if (participant) {
                                const seatNum = Number(seat);
                                if (Number.isFinite(seatNum)) {
                                    participantsBySeat[seatNum] = participant;
                                }
                            }
                        });

                        // Create slots for ALL configured seats
                        // Each slot will be either occupied or empty
                        const slots = [];
                        for (let i = 0; i < maxSeats; i++) {
                            slots.push({
                                seatIndex: i,
                                participant: participantsBySeat[i] || null,
                            });
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
                                    maxSeats={maxSeats}
                                    radius={tableDimensions.radius}
                                    seatSize={tableDimensions.seatSize}
                                    participant={slot.participant}
                                    onParticipantClick={slot.participant ? onParticipantClick : undefined}
                                />
                            </Box>
                        ));
                    })()}
                </Box>

                {/* All seats are now displayed (no "+more" indicator needed) */}
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
                    disabled={shouldDisableJoin || isFull}
                    title={shouldDisableJoin ? 'Lounge is closed' : isFull ? 'Table is full' : 'Join this table'}
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
                        opacity: shouldDisableJoin ? 0.5 : 1,
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
                    {shouldDisableJoin
                        ? 'Lounge Closed'
                        : isFull
                            ? `Table Full (${Object.keys(table.participants || {}).length}/${maxSeats})`
                            : `Join (${Object.keys(table.participants || {}).length}/${maxSeats})`
                    }
                </Button>
            )}
        </Paper>
    );
};

export default LoungeTable;
