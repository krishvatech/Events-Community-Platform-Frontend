import React, { useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    FormControlLabel,
    Switch,
    Slider,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Stack,
    Alert
} from '@mui/material';

export default function InterestCriteriaConfig({
    config = {},
    onUpdate = () => {}
}) {
    const [interestConfig, setInterestConfig] = useState(config.interests || {
        enabled: false,
        required: false,
        weight: 0.0,
        threshold: 50,
        match_mode: 'complementary'
    });

    const handleToggleEnabled = (e) => {
        const updated = { ...interestConfig, enabled: e.target.checked };
        setInterestConfig(updated);
        onUpdate({ ...config, interests: updated });
    };

    const handleToggleRequired = (e) => {
        const updated = { ...interestConfig, required: e.target.checked };
        setInterestConfig(updated);
        onUpdate({ ...config, interests: updated });
    };

    const handleMatchModeChange = (e) => {
        const updated = { ...interestConfig, match_mode: e.target.value };
        setInterestConfig(updated);
        onUpdate({ ...config, interests: updated });
    };

    return (
        <Card sx={{ bgcolor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: 'white' }}>
                        ✨ Interest-Based Matching
                    </Typography>
                    <FormControlLabel
                        control={<Switch checked={interestConfig.enabled} onChange={handleToggleEnabled} />}
                        label={interestConfig.enabled ? "Enabled" : "Disabled"}
                        sx={{ color: 'white' }}
                    />
                </Box>

                {!interestConfig.enabled ? (
                    <Alert severity="info" sx={{ mb: 2 }}>
                        Enable interest-based matching to help users find complementary partners based on their goals.
                    </Alert>
                ) : (
                    <Stack spacing={3}>
                        <Alert severity="success">
                            Interest matching is active! Users will see "Looking for investors" ↔ "Offering investment" as complementary matches.
                        </Alert>

                        <Box>
                            <FormControlLabel
                                control={<Switch checked={interestConfig.required} onChange={handleToggleRequired} />}
                                label="Make Required (must meet threshold to match)"
                                sx={{ color: 'white' }}
                            />
                        </Box>

                        <FormControl fullWidth>
                            <InputLabel sx={{ color: 'white !important' }}>Match Mode</InputLabel>
                            <Select
                                value={interestConfig.match_mode}
                                label="Match Mode"
                                onChange={handleMatchModeChange}
                                sx={{ color: 'white' }}
                            >
                                <MenuItem value="complementary">
                                    🔄 Complementary (seek ↔ offer)
                                </MenuItem>
                                <MenuItem value="similar">
                                    🤝 Similar (same interests)
                                </MenuItem>
                                <MenuItem value="both">
                                    ↔️ Both (try complementary, then similar)
                                </MenuItem>
                            </Select>
                        </FormControl>

                        <Box sx={{
                            p: 2,
                            bgcolor: 'rgba(90,120,255,0.1)',
                            borderRadius: 1,
                            border: '1px solid rgba(90,120,255,0.2)'
                        }}>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                <strong>How it works:</strong><br />
                                • Users select interests when joining the session<br />
                                • "Complementary" mode pairs opposite interests (e.g., investor ↔ investee)<br />
                                • "Similar" mode pairs users with same interests<br />
                                • Weight determines how much this factor affects the final match score
                            </Typography>
                        </Box>
                    </Stack>
                )}
            </CardContent>
        </Card>
    );
}
