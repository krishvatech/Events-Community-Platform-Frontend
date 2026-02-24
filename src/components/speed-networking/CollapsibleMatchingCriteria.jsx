import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    FormControlLabel,
    Checkbox,
    Slider,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Collapse,
    Button,
    Stack,
    Divider
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import AddIcon from '@mui/icons-material/Add';

export default function CollapsibleMatchingCriteria({
    config = {},
    onUpdate = () => {},
    onOpenInterestManager = () => {}
}) {
    const [localConfig, setLocalConfig] = useState(config);
    const [expandedCriteria, setExpandedCriteria] = useState({});

    useEffect(() => {
        setLocalConfig(config);
    }, [config]);

    // Initialize expanded state for enabled criteria
    useEffect(() => {
        const newExpanded = {};
        Object.entries(localConfig).forEach(([key, value]) => {
            if (key !== 'interests' && value?.enabled) {
                newExpanded[key] = true;
            }
        });
        setExpandedCriteria(newExpanded);
    }, []);

    const handleCriterionToggle = (criterion, enabled) => {
        const newConfig = { ...localConfig };
        newConfig[criterion] = {
            ...newConfig[criterion],
            enabled
        };
        setLocalConfig(newConfig);
        setExpandedCriteria({
            ...expandedCriteria,
            [criterion]: enabled
        });
        onUpdate(newConfig);
    };

    const handleToggleExpand = (criterion) => {
        setExpandedCriteria({
            ...expandedCriteria,
            [criterion]: !expandedCriteria[criterion]
        });
    };

    const handleThresholdChange = (criterion, threshold) => {
        const newConfig = { ...localConfig };
        newConfig[criterion] = {
            ...newConfig[criterion],
            threshold
        };
        setLocalConfig(newConfig);
        onUpdate(newConfig);
    };

    const handleMatchModeChange = (criterion, matchMode) => {
        const newConfig = { ...localConfig };
        newConfig[criterion] = {
            ...newConfig[criterion],
            match_mode: matchMode
        };
        setLocalConfig(newConfig);
        onUpdate(newConfig);
    };

    const regularCriteria = ['skill', 'location', 'experience', 'education'];

    const matchModeOptions = {
        skill: [
            { label: '🔄 Complementary (seek ↔ offer)', value: 'complementary' },
            { label: '🤝 Similar (same interests)', value: 'similar' },
            { label: '↔️ Both (complementary then similar)', value: 'both' }
        ],
        location: [
            { label: '📍 Exact City', value: 'exact_city' },
            { label: '🗺️ Radius', value: 'radius' },
            { label: '🌍 Timezone', value: 'timezone' }
        ],
        experience: [
            { label: '🤝 Peer', value: 'peer' },
            { label: '🎓 Mentorship', value: 'mentorship' },
            { label: '🔄 Mixed', value: 'mixed' }
        ],
        education: [
            { label: '📚 Same Level', value: 'same_level' },
            { label: '🎯 Complementary Fields', value: 'complementary_fields' },
            { label: '📊 Hierarchical', value: 'hierarchical' }
        ]
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography sx={{
                color: '#fff',
                fontWeight: 600,
                fontSize: 14,
                mb: 1,
                textTransform: 'uppercase',
                letterSpacing: 0.5
            }}>
                Matching Criteria Configuration
            </Typography>

            {/* Regular Criteria Cards */}
            {regularCriteria.map((criterion) => {
                const criteriaConfig = localConfig[criterion] || {};
                const isExpanded = expandedCriteria[criterion];
                const isEnabled = criteriaConfig.enabled || false;
                const options = matchModeOptions[criterion] || [];

                return (
                    <Card
                        key={criterion}
                        sx={{
                            bgcolor: 'rgba(255,255,255,0.05)',
                            borderRadius: 1.5,
                            border: isEnabled
                                ? '1px solid rgba(90,120,255,0.4)'
                                : '1px solid rgba(255,255,255,0.1)',
                            transition: 'all 0.2s ease',
                            cursor: 'pointer'
                        }}
                    >
                        <CardContent sx={{ pb: isExpanded ? 2 : 2 }}>
                            {/* Header Row */}
                            <Box sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 2
                            }}>
                                <Box sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.5,
                                    flex: 1
                                }}>
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={isEnabled}
                                                onChange={(e) => {
                                                    e.stopPropagation();
                                                    handleCriterionToggle(criterion, e.target.checked);
                                                }}
                                                size="small"
                                                sx={{
                                                    color: 'rgba(255,255,255,0.5)',
                                                    '&.Mui-checked': {
                                                        color: '#5a78ff'
                                                    }
                                                }}
                                            />
                                        }
                                        label={
                                            <Typography sx={{
                                                color: '#fff',
                                                fontWeight: 600,
                                                fontSize: 14,
                                                textTransform: 'capitalize',
                                                ml: 0.5
                                            }}>
                                                {criterion}
                                            </Typography>
                                        }
                                        sx={{ m: 0 }}
                                    />
                                </Box>

                                {/* Expand/Collapse Button */}
                                {isEnabled && (
                                    <Box
                                        onClick={() => handleToggleExpand(criterion)}
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            cursor: 'pointer',
                                            color: '#5a78ff',
                                            transition: 'all 0.2s ease',
                                            p: 0.5,
                                            '&:hover': {
                                                bgcolor: 'rgba(90,120,255,0.1)',
                                                borderRadius: 1
                                            }
                                        }}
                                    >
                                        {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                    </Box>
                                )}
                            </Box>

                            {/* Collapsible Content */}
                            <Collapse in={isEnabled && isExpanded} timeout="auto" unmountOnExit>
                                <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                    <Stack spacing={2.5}>
                                        {/* Threshold Slider */}
                                        <Box>
                                            <Box sx={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                mb: 1.5
                                            }}>
                                                <Typography sx={{
                                                    color: 'rgba(255,255,255,0.8)',
                                                    fontSize: 13,
                                                    fontWeight: 500
                                                }}>
                                                    Threshold
                                                </Typography>
                                                <Typography sx={{
                                                    color: '#5a78ff',
                                                    fontSize: 14,
                                                    fontWeight: 600
                                                }}>
                                                    {criteriaConfig.threshold || 50}%
                                                </Typography>
                                            </Box>
                                            <Slider
                                                value={criteriaConfig.threshold || 50}
                                                onChange={(e, newValue) => handleThresholdChange(criterion, newValue)}
                                                min={0}
                                                max={100}
                                                step={5}
                                                marks={[
                                                    { value: 0, label: '0%' },
                                                    { value: 50, label: '50%' },
                                                    { value: 100, label: '100%' }
                                                ]}
                                                sx={{
                                                    color: '#5a78ff',
                                                    '& .MuiSlider-track': {
                                                        bgcolor: '#5a78ff'
                                                    },
                                                    '& .MuiSlider-mark': {
                                                        bgcolor: 'rgba(255,255,255,0.3)'
                                                    },
                                                    '& .MuiSlider-markLabel': {
                                                        color: 'rgba(255,255,255,0.5)',
                                                        fontSize: 11
                                                    }
                                                }}
                                            />
                                        </Box>

                                        {/* Match Mode Dropdown (for interest-based) */}
                                        {options.length > 0 && (
                                            <FormControl fullWidth size="small">
                                                <InputLabel sx={{
                                                    color: 'rgba(255,255,255,0.7) !important',
                                                    fontSize: 13
                                                }}>
                                                    Match Mode
                                                </InputLabel>
                                                <Select
                                                    value={criteriaConfig.match_mode || ''}
                                                    onChange={(e) => handleMatchModeChange(criterion, e.target.value)}
                                                    label="Match Mode"
                                                    sx={{
                                                        color: '#fff',
                                                        fontSize: 13,
                                                        '& .MuiOutlinedInput-notchedOutline': {
                                                            borderColor: 'rgba(255,255,255,0.2)'
                                                        },
                                                        '&:hover .MuiOutlinedInput-notchedOutline': {
                                                            borderColor: 'rgba(255,255,255,0.3)'
                                                        },
                                                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                            borderColor: '#5a78ff'
                                                        }
                                                    }}
                                                >
                                                    {options.map((opt) => (
                                                        <MenuItem key={opt.value} value={opt.value}>
                                                            {opt.label}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        )}
                                    </Stack>
                                </Box>
                            </Collapse>
                        </CardContent>
                    </Card>
                );
            })}

            {/* Interest-Based Matching Card */}
            <Card sx={{
                bgcolor: 'rgba(255,255,255,0.05)',
                borderRadius: 1.5,
                border: localConfig.interests?.enabled
                    ? '1px solid rgba(90,120,255,0.4)'
                    : '1px solid rgba(255,255,255,0.1)',
                transition: 'all 0.2s ease'
            }}>
                <CardContent>
                    {/* Header Row */}
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 2
                    }}>
                        <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            flex: 1
                        }}>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={localConfig.interests?.enabled || false}
                                        onChange={(e) => {
                                            e.stopPropagation();
                                            const newConfig = { ...localConfig };
                                            newConfig.interests = {
                                                ...newConfig.interests,
                                                enabled: e.target.checked
                                            };
                                            setLocalConfig(newConfig);
                                            setExpandedCriteria({
                                                ...expandedCriteria,
                                                interests: e.target.checked
                                            });
                                            onUpdate(newConfig);
                                        }}
                                        size="small"
                                        sx={{
                                            color: 'rgba(255,255,255,0.5)',
                                            '&.Mui-checked': {
                                                color: '#5a78ff'
                                            }
                                        }}
                                    />
                                }
                                label={
                                    <Typography sx={{
                                        color: '#fff',
                                        fontWeight: 600,
                                        fontSize: 14,
                                        ml: 0.5
                                    }}>
                                        ✨ Interest
                                    </Typography>
                                }
                                sx={{ m: 0 }}
                            />
                        </Box>

                        {/* Expand/Collapse Button */}
                        {localConfig.interests?.enabled && (
                            <Box
                                onClick={() => handleToggleExpand('interests')}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    color: '#5a78ff',
                                    transition: 'all 0.2s ease',
                                    p: 0.5,
                                    '&:hover': {
                                        bgcolor: 'rgba(90,120,255,0.1)',
                                        borderRadius: 1
                                    }
                                }}
                            >
                                {expandedCriteria.interests ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            </Box>
                        )}
                    </Box>

                    {/* Collapsible Content */}
                    <Collapse in={localConfig.interests?.enabled && expandedCriteria.interests} timeout="auto" unmountOnExit>
                        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                            <Stack spacing={2.5}>
                                {/* Match Mode Dropdown */}
                                <FormControl fullWidth size="small">
                                    <InputLabel sx={{
                                        color: 'rgba(255,255,255,0.7) !important',
                                        fontSize: 13
                                    }}>
                                        Match Mode
                                    </InputLabel>
                                    <Select
                                        value={localConfig.interests?.match_mode || 'complementary'}
                                        onChange={(e) => {
                                            const newConfig = { ...localConfig };
                                            newConfig.interests = {
                                                ...newConfig.interests,
                                                match_mode: e.target.value
                                            };
                                            setLocalConfig(newConfig);
                                            onUpdate(newConfig);
                                        }}
                                        label="Match Mode"
                                        sx={{
                                            color: '#fff',
                                            fontSize: 13,
                                            '& .MuiOutlinedInput-notchedOutline': {
                                                borderColor: 'rgba(255,255,255,0.2)'
                                            },
                                            '&:hover .MuiOutlinedInput-notchedOutline': {
                                                borderColor: 'rgba(255,255,255,0.3)'
                                            },
                                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                borderColor: '#5a78ff'
                                            }
                                        }}
                                    >
                                        <MenuItem value="complementary">
                                            🔄 Complementary (seek ↔ offer)
                                        </MenuItem>
                                        <MenuItem value="similar">
                                            🤝 Similar (same interests)
                                        </MenuItem>
                                        <MenuItem value="both">
                                            ↔️ Both (complementary then similar)
                                        </MenuItem>
                                    </Select>
                                </FormControl>

                                {/* Add Tags Button */}
                                <Button
                                    variant="outlined"
                                    startIcon={<AddIcon />}
                                    onClick={onOpenInterestManager}
                                    sx={{
                                        color: '#5a78ff',
                                        borderColor: '#5a78ff',
                                        textTransform: 'none',
                                        fontSize: 13,
                                        fontWeight: 500,
                                        py: 1.2,
                                        '&:hover': {
                                            bgcolor: 'rgba(90,120,255,0.1)',
                                            borderColor: '#5a78ff'
                                        }
                                    }}
                                >
                                    Add Interest Tags
                                </Button>

                                {/* Info Box */}
                                <Box sx={{
                                    p: 1.5,
                                    bgcolor: 'rgba(90,120,255,0.08)',
                                    borderRadius: 1,
                                    border: '1px solid rgba(90,120,255,0.2)'
                                }}>
                                    <Typography sx={{
                                        fontSize: 12,
                                        color: 'rgba(255,255,255,0.7)',
                                        lineHeight: 1.6
                                    }}>
                                        <strong>How it works:</strong><br />
                                        • Configure interest-based matching modes<br />
                                        • Manage interest tags for your session<br />
                                        • Fine-tune compatibility based on user interests
                                    </Typography>
                                </Box>
                            </Stack>
                        </Box>
                    </Collapse>
                </CardContent>
            </Card>
        </Box>
    );
}
