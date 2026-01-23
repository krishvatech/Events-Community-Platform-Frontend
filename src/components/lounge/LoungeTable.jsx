import React, { useMemo, useRef, useState } from 'react';
import { Box, Paper, Typography, Button } from '@mui/material';
import LoungeSeat from './LoungeSeat';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

const LoungeTable = ({ table, onJoin, onLeave, currentUserId, myUsername, isAdmin, onUpdateIcon }) => {
    const isUserAtThisTable = Object.values(table.participants || {}).some((p) => {
        return String(p.user_id) === String(currentUserId) || p.username === myUsername;
    });
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
                )}
            </Box>

            {/* Table Visualization */}
            <Box
                sx={{
                    position: 'relative',
                    width: 140,
                    height: 140,
                    mx: 'auto',
                    my: 2,
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

                {/* Seats around the table */}
                {[...Array(table.max_seats || 4)].map((_, i) => {
                    const participant = table.participants?.[i] || table.participants?.[String(i)];
                    return (
                        <Box
                            key={i}
                            onClick={() => !participant && !isUserAtThisTable && handleJoin(i)}
                            sx={{ cursor: !participant && !isUserAtThisTable ? 'pointer' : 'default' }}
                        >
                            <LoungeSeat
                                index={i}
                                maxSeats={table.max_seats || 4}
                                participant={participant}
                            />
                        </Box>
                    );
                })}
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
                    disabled={Object.keys(table.participants || {}).length >= table.max_seats}
                    onClick={() => {
                        // Find first available seat index
                        const maxSeats = table.max_seats || 4;
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
                        '&:hover': {
                            borderColor: 'white',
                            bgcolor: 'rgba(255, 255, 255, 0.1)',
                        },
                    }}
                >
                    Join
                </Button>
            )}
        </Paper>
    );
};

export default LoungeTable;
