import React from 'react';
import { Box, Chip, Typography, Stack } from '@mui/material';

export default function InterestDisplay({ interests, title = "Interests" }) {
    if (!interests || interests.length === 0) {
        return null;
    }

    const getCategoryColor = (category) => {
        const colors = {
            'investment': '#5a78ff',
            'recruitment': '#10b981',
            'mentorship': '#f59e0b',
            'partnership': '#8b5cf6',
            'collaboration': '#06b6d4'
        };
        return colors[category] || '#6b7280';
    };

    const getSideEmoji = (side) => {
        const emojis = {
            'seek': '🔍',
            'offer': '💼',
            'both': '↔️'
        };
        return emojis[side] || '';
    };

    // Group by category
    const grouped = interests.reduce((acc, interest) => {
        const cat = interest.category || 'other';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(interest);
        return acc;
    }, {});

    return (
        <Box sx={{ my: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: 'rgba(255,255,255,0.8)' }}>
                ✨ {title}
            </Typography>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {Object.entries(grouped).map(([category, items]) => (
                    <React.Fragment key={category}>
                        {items.map((interest, idx) => (
                            <Chip
                                key={idx}
                                icon={<span>{getSideEmoji(interest.side)}</span>}
                                label={interest.label}
                                variant="outlined"
                                size="small"
                                sx={{
                                    borderColor: getCategoryColor(category),
                                    color: getCategoryColor(category),
                                    backgroundColor: `${getCategoryColor(category)}10`,
                                    fontWeight: 600,
                                    fontSize: 12
                                }}
                            />
                        ))}
                    </React.Fragment>
                ))}
            </Box>
        </Box>
    );
}
