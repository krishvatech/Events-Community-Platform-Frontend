import React, { useState } from 'react';
import {
    Dialog,
    Box,
    Typography,
    Button,
    Alert,
    Card,
    CardContent,
    Divider,
    Slider,
    Switch,
    FormControlLabel,
    CircularProgress,
    IconButton,
    Tooltip,
    LinearProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import InterestTagManager from './InterestTagManager';
import CollapsibleMatchingCriteria from './CollapsibleMatchingCriteria';

export default function SpeedNetworkingSettingsDialog({
    open,
    onClose,
    eventId,
    session,
    criteriaConfig,
    setCriteriaConfig,
    criteriaDirty,
    setCriteriaDirty,
    handleSaveCriteria,
    handleNormalizeWeights,
    fetchMatchPreview,
    matchPreview,
    loadingPreview,
    savingCriteria
}) {
    const [selectedSection, setSelectedSection] = useState('criteria');

    if (!session?.id || !criteriaConfig) {
        return null;
    }

    const sections = [
        { id: 'criteria', label: 'Matching Criteria', icon: '⚙️' },
        { id: 'advanced', label: 'Advanced Settings', icon: '🔧' },
        { id: 'preview', label: 'Match Preview', icon: '👁️' },
        { id: 'tags', label: 'Interest Tags', icon: '🏷️' }
    ];

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="lg"
            fullWidth
            PaperProps={{
                sx: {
                    bgcolor: 'rgba(9,20,33,0.98)',
                    border: { xs: 'none', sm: '1px solid rgba(255,255,255,0.1)' },
                    backdropFilter: 'blur(10px)',
                    maxWidth: { xs: '100%', sm: '900px' },
                    width: { xs: '100%', sm: 'auto' },
                    margin: { xs: 0, sm: 'auto' },
                    borderRadius: { xs: 0, sm: 2 },
                    maxHeight: { xs: '100vh', sm: '90vh' }
                }
            }}
        >
            {/* Header */}
            <Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 2,
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                position: 'sticky',
                top: 0,
                zIndex: 10,
                bgcolor: 'rgba(9,20,33,0.98)',
                backdropFilter: 'blur(10px)'
            }}>
                <Box>
                    <Typography sx={{
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: 18
                    }}>
                        Speed Networking Settings
                    </Typography>
                    <Typography sx={{
                        color: 'rgba(255,255,255,0.6)',
                        fontSize: 12,
                        mt: 0.5
                    }}>
                        Session Active • Changes apply to future matches
                    </Typography>
                </Box>
                <IconButton
                    onClick={onClose}
                    sx={{ color: 'rgba(255,255,255,0.7)' }}
                >
                    <CloseIcon />
                </IconButton>
            </Box>

            {/* Status Message */}
            <Box sx={{ p: 2, pt: 1.5, pb: 1 }}>
                <Alert severity={criteriaDirty ? 'warning' : 'info'} sx={{
                    bgcolor: criteriaDirty ? 'rgba(245,158,11,0.1)' : 'rgba(59,130,246,0.1)',
                    borderColor: criteriaDirty ? 'rgba(245,158,11,0.3)' : 'rgba(59,130,246,0.3)',
                    border: '1px solid'
                }}>
                    <Typography sx={{ fontSize: 12, color: '#fff' }}>
                        {criteriaDirty
                            ? '💡 You have unsaved changes. Click Save Changes to apply them.'
                            : '✓ Changes apply to future matches. Active matches stay connected.'}
                    </Typography>
                </Alert>
            </Box>

            {/* Main Content - Two Column Layout on Desktop */}
            <Box sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '200px 1fr' },
                gap: 0,
                flex: 1,
                overflow: 'hidden',
                minHeight: { xs: 'auto', sm: '400px' },
                maxHeight: { xs: 'calc(100vh - 180px)', sm: 'calc(90vh - 180px)' }
            }}>
                {/* Section Navigation (Desktop Only) */}
                <Box sx={{
                    display: { xs: 'none', md: 'flex' },
                    flexDirection: 'column',
                    gap: 0.5,
                    p: 1.5,
                    borderRight: '1px solid rgba(255,255,255,0.1)',
                    overflow: 'auto',
                    '&::-webkit-scrollbar': { width: 6 },
                    '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
                    '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 3 }
                }}>
                    {sections.map(section => (
                        <Button
                            key={section.id}
                            onClick={() => setSelectedSection(section.id)}
                            sx={{
                                justifyContent: 'flex-start',
                                p: 1.5,
                                borderRadius: 1,
                                textTransform: 'none',
                                fontSize: 13,
                                fontWeight: selectedSection === section.id ? 600 : 500,
                                color: selectedSection === section.id ? '#fff' : 'rgba(255,255,255,0.6)',
                                bgcolor: selectedSection === section.id ? 'rgba(90,120,255,0.2)' : 'transparent',
                                border: selectedSection === section.id ? '1px solid rgba(90,120,255,0.4)' : '1px solid transparent',
                                '&:hover': {
                                    bgcolor: 'rgba(90,120,255,0.15)'
                                }
                            }}
                        >
                            <span style={{ marginRight: 8 }}>{section.icon}</span>
                            {section.label}
                        </Button>
                    ))}
                </Box>

                {/* Mobile Section Tabs */}
                <Box sx={{
                    display: { xs: 'flex', md: 'none' },
                    overflowX: 'auto',
                    gap: 1,
                    p: 1.5,
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    '&::-webkit-scrollbar': { height: 4 },
                    '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
                    '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2 }
                }}>
                    {sections.map(section => (
                        <Button
                            key={section.id}
                            onClick={() => setSelectedSection(section.id)}
                            size="small"
                            sx={{
                                whiteSpace: 'nowrap',
                                flex: '0 0 auto',
                                textTransform: 'none',
                                fontSize: 12,
                                fontWeight: selectedSection === section.id ? 600 : 500,
                                color: selectedSection === section.id ? '#fff' : 'rgba(255,255,255,0.6)',
                                bgcolor: selectedSection === section.id ? 'rgba(90,120,255,0.2)' : 'transparent',
                                border: selectedSection === section.id ? '1px solid rgba(90,120,255,0.4)' : '1px solid transparent',
                                p: 0.75,
                                '&:hover': {
                                    bgcolor: 'rgba(90,120,255,0.15)'
                                }
                            }}
                        >
                            {section.icon} {section.label}
                        </Button>
                    ))}
                </Box>

                {/* Content Area */}
                <Box sx={{
                    overflow: 'auto',
                    p: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    '&::-webkit-scrollbar': { width: 8 },
                    '&::-webkit-scrollbar-track': { bgcolor: 'rgba(255,255,255,0.04)' },
                    '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.24)', borderRadius: 4 }
                }}>
                    {/* Matching Criteria Section */}
                    {selectedSection === 'criteria' && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <CollapsibleMatchingCriteria
                                config={criteriaConfig}
                                onUpdate={(newConfig) => {
                                    setCriteriaConfig(newConfig);
                                    setCriteriaDirty(true);
                                }}
                            />
                        </Box>
                    )}

                    {/* Advanced Settings Section */}
                    {selectedSection === 'advanced' && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Box>
                                <Typography sx={{
                                    color: '#fff',
                                    fontWeight: 600,
                                    fontSize: 14,
                                    mb: 1.5,
                                    textTransform: 'uppercase',
                                    letterSpacing: 0.5
                                }}>
                                    Advanced Settings
                                </Typography>

                                {/* Serendipity Factor */}
                                <Card sx={{
                                    bgcolor: 'rgba(255,255,255,0.05)',
                                    borderRadius: 2,
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    mb: 2
                                }}>
                                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                                        <Box sx={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            mb: 2
                                        }}>
                                            <Typography sx={{
                                                color: '#fff',
                                                fontWeight: 600,
                                                fontSize: 14
                                            }}>
                                                Serendipity Factor
                                            </Typography>
                                            <Tooltip title="Add randomness to encourage surprising connections">
                                                <Typography sx={{
                                                    color: 'rgba(255,255,255,0.5)',
                                                    fontSize: 11,
                                                    cursor: 'help'
                                                }}>
                                                    ?
                                                </Typography>
                                            </Tooltip>
                                        </Box>
                                        <Box>
                                            <Box sx={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                mb: 1
                                            }}>
                                                <Typography sx={{
                                                    color: 'rgba(255,255,255,0.7)',
                                                    fontSize: 12
                                                }}>
                                                    Random Element Weight
                                                </Typography>
                                                <Typography sx={{
                                                    color: '#fff',
                                                    fontSize: 12,
                                                    fontWeight: 500
                                                }}>
                                                    {Math.round((criteriaConfig?.random_factor || 0) * 100)}%
                                                </Typography>
                                            </Box>
                                            <Slider
                                                value={(criteriaConfig?.random_factor || 0) * 100}
                                                onChange={(e, newValue) => {
                                                    const newConfig = { ...criteriaConfig };
                                                    newConfig.random_factor = newValue / 100;
                                                    setCriteriaConfig(newConfig);
                                                    setCriteriaDirty(true);
                                                }}
                                                min={0}
                                                max={30}
                                                step={1}
                                                sx={{
                                                    color: '#f59e0b',
                                                    '& .MuiSlider-track': { bgcolor: '#f59e0b' }
                                                }}
                                            />
                                            <Typography sx={{
                                                color: 'rgba(255,255,255,0.5)',
                                                fontSize: 11,
                                                mt: 1
                                            }}>
                                                Recommended: 5-15% for organic matching
                                            </Typography>
                                        </Box>
                                    </CardContent>
                                </Card>

                                {/* Prioritize New Users */}
                                <Card sx={{
                                    bgcolor: 'rgba(255,255,255,0.05)',
                                    borderRadius: 2,
                                    border: '1px solid rgba(255,255,255,0.1)'
                                }}>
                                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={criteriaConfig?.prefer_new_users !== false}
                                                    onChange={(e) => {
                                                        const newConfig = { ...criteriaConfig };
                                                        newConfig.prefer_new_users = e.target.checked;
                                                        setCriteriaConfig(newConfig);
                                                        setCriteriaDirty(true);
                                                    }}
                                                    size="small"
                                                />
                                            }
                                            label={
                                                <Box>
                                                    <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>
                                                        Prioritize New Users
                                                    </Typography>
                                                    <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>
                                                        Match users who recently joined first
                                                    </Typography>
                                                </Box>
                                            }
                                            sx={{ color: 'rgba(255,255,255,0.7)', width: '100%' }}
                                        />
                                    </CardContent>
                                </Card>
                            </Box>
                        </Box>
                    )}

                    {/* Match Preview Section */}
                    {selectedSection === 'preview' && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {(matchPreview || loadingPreview) ? (
                                <Card sx={{
                                    bgcolor: 'rgba(90,120,255,0.1)',
                                    borderRadius: 2,
                                    border: '1px solid rgba(90,120,255,0.3)'
                                }}>
                                    <CardContent>
                                        <Box sx={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            mb: 2
                                        }}>
                                            <Typography sx={{
                                                color: '#fff',
                                                fontWeight: 600,
                                                fontSize: 14
                                            }}>
                                                Match Preview
                                            </Typography>
                                            <IconButton
                                                size="small"
                                                onClick={fetchMatchPreview}
                                                disabled={loadingPreview}
                                            >
                                                {loadingPreview ? (
                                                    <CircularProgress size={20} />
                                                ) : (
                                                    <RefreshIcon sx={{ color: '#5a78ff', fontSize: 18 }} />
                                                )}
                                            </IconButton>
                                        </Box>

                                        {loadingPreview ? (
                                            <Box sx={{ textAlign: 'center', py: 4 }}>
                                                <CircularProgress size={32} />
                                                <Typography sx={{
                                                    color: 'rgba(255,255,255,0.7)',
                                                    fontSize: 12,
                                                    mt: 2
                                                }}>
                                                    Calculating preview...
                                                </Typography>
                                            </Box>
                                        ) : matchPreview?.total_waiting < 2 ? (
                                            <Typography sx={{
                                                color: 'rgba(255,255,255,0.7)',
                                                fontSize: 13,
                                                textAlign: 'center',
                                                py: 4
                                            }}>
                                                Need at least 2 users in queue to preview matches
                                            </Typography>
                                        ) : (
                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                {/* Waiting Users */}
                                                <Box>
                                                    <Typography sx={{
                                                        color: 'rgba(255,255,255,0.7)',
                                                        fontSize: 12,
                                                        mb: 1
                                                    }}>
                                                        Waiting Users: <span style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>{matchPreview.total_waiting}</span>
                                                    </Typography>
                                                </Box>

                                                {/* Potential Pairs */}
                                                <Box>
                                                    <Typography sx={{
                                                        color: 'rgba(255,255,255,0.7)',
                                                        fontSize: 12,
                                                        mb: 1
                                                    }}>
                                                        Potential Pairs: <span style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>{matchPreview.potential_pairs}</span>
                                                    </Typography>
                                                </Box>

                                                <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', my: 1 }} />

                                                {/* Match Rate */}
                                                <Box>
                                                    <Box sx={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        mb: 1
                                                    }}>
                                                        <Typography sx={{
                                                            color: 'rgba(255,255,255,0.7)',
                                                            fontSize: 12
                                                        }}>
                                                            Matchable Pairs
                                                        </Typography>
                                                        <Typography sx={{
                                                            color: '#22c55e',
                                                            fontSize: 12,
                                                            fontWeight: 600
                                                        }}>
                                                            {matchPreview.matchable_pairs}/{matchPreview.potential_pairs} ({matchPreview.match_rate}%)
                                                        </Typography>
                                                    </Box>
                                                    <LinearProgress
                                                        variant="determinate"
                                                        value={matchPreview.match_rate}
                                                        sx={{
                                                            bgcolor: 'rgba(255,255,255,0.1)',
                                                            '& .MuiLinearProgress-bar': {
                                                                bgcolor: matchPreview.match_rate > 75 ? '#22c55e' : matchPreview.match_rate > 50 ? '#f59e0b' : '#ef4444'
                                                            }
                                                        }}
                                                    />
                                                </Box>

                                                {/* Avg Score */}
                                                <Box>
                                                    <Box sx={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        mb: 1
                                                    }}>
                                                        <Typography sx={{
                                                            color: 'rgba(255,255,255,0.7)',
                                                            fontSize: 12
                                                        }}>
                                                            Avg Match Quality
                                                        </Typography>
                                                        <Typography sx={{
                                                            color: '#fff',
                                                            fontSize: 12,
                                                            fontWeight: 600
                                                        }}>
                                                            {matchPreview.avg_score}%
                                                        </Typography>
                                                    </Box>
                                                    <LinearProgress
                                                        variant="determinate"
                                                        value={matchPreview.avg_score}
                                                        sx={{
                                                            bgcolor: 'rgba(255,255,255,0.1)',
                                                            '& .MuiLinearProgress-bar': {
                                                                bgcolor: '#5a78ff'
                                                            }
                                                        }}
                                                    />
                                                </Box>

                                                <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', my: 1 }} />

                                                {/* Score Distribution */}
                                                <Box>
                                                    <Typography sx={{
                                                        color: 'rgba(255,255,255,0.7)',
                                                        fontSize: 12,
                                                        mb: 1.5
                                                    }}>
                                                        Score Distribution
                                                    </Typography>
                                                    <Box sx={{
                                                        display: 'grid',
                                                        gridTemplateColumns: 'repeat(4, 1fr)',
                                                        gap: 1
                                                    }}>
                                                        {[
                                                            { label: '0-25', value: matchPreview.score_distribution['0-25'] },
                                                            { label: '26-50', value: matchPreview.score_distribution['26-50'] },
                                                            { label: '51-75', value: matchPreview.score_distribution['51-75'] },
                                                            { label: '76-100', value: matchPreview.score_distribution['76-100'] }
                                                        ].map(({ label, value }) => (
                                                            <Box key={label} sx={{
                                                                textAlign: 'center',
                                                                p: 1,
                                                                bgcolor: 'rgba(255,255,255,0.05)',
                                                                borderRadius: 1,
                                                                border: '1px solid rgba(255,255,255,0.1)'
                                                            }}>
                                                                <Typography sx={{
                                                                    color: 'rgba(255,255,255,0.7)',
                                                                    fontSize: 10
                                                                }}>
                                                                    {label}
                                                                </Typography>
                                                                <Typography sx={{
                                                                    color: '#fff',
                                                                    fontWeight: 600,
                                                                    fontSize: 14,
                                                                    mt: 0.5
                                                                }}>
                                                                    {value}
                                                                </Typography>
                                                            </Box>
                                                        ))}
                                                    </Box>
                                                </Box>
                                            </Box>
                                        )}
                                    </CardContent>
                                </Card>
                            ) : (
                                <Box sx={{ textAlign: 'center', py: 4 }}>
                                    <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
                                        Match preview will appear here
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                    )}

                    {/* Interest Tags Section */}
                    {selectedSection === 'tags' && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <InterestTagManager
                                eventId={eventId}
                                sessionId={session?.id}
                                session={session}
                            />
                        </Box>
                    )}
                </Box>
            </Box>

            {/* Sticky Footer */}
            <Box sx={{
                display: 'flex',
                gap: 1,
                p: 2,
                borderTop: '1px solid rgba(255,255,255,0.1)',
                bgcolor: 'rgba(9,20,33,0.98)',
                backdropFilter: 'blur(10px)',
                position: 'sticky',
                bottom: 0,
                justifyContent: 'flex-end'
            }}>
                <Button
                    variant="outlined"
                    onClick={handleNormalizeWeights}
                    sx={{
                        color: '#5a78ff',
                        borderColor: '#5a78ff',
                        textTransform: 'none',
                        fontWeight: 600,
                        '&:hover': { bgcolor: 'rgba(90,120,255,0.1)' }
                    }}
                >
                    Normalize Weights
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSaveCriteria}
                    disabled={savingCriteria}
                    sx={{
                        bgcolor: '#22c55e',
                        color: '#000',
                        textTransform: 'none',
                        fontWeight: 600,
                        '&:hover': { bgcolor: '#16a34a' }
                    }}
                >
                    {savingCriteria ? (
                        <>
                            <CircularProgress size={18} sx={{ mr: 1 }} />
                            Saving...
                        </>
                    ) : (
                        criteriaDirty ? 'Save Changes' : 'Save'
                    )}
                </Button>
            </Box>
        </Dialog>
    );
}
