import React from 'react';
import { Grid, Box, Typography, Button, Container } from '@mui/material';
import LoungeTable from './LoungeTable';
import AddIcon from '@mui/icons-material/Add';

const LoungeGrid = ({
    tables,
    onJoin,
    onLeave,
    currentUserId,
    myUsername,
    isAdmin,
    onCreateTable,
    onUpdateIcon,
    onEditTable,
    onDeleteTable,
    onParticipantClick,
    title,
    description,
    showCreateButton = true,
}) => {
    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            {(title || description || (isAdmin && showCreateButton)) && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                    {(title || description) && (
                        <Box>
                            {title && (
                                <Typography variant="h4" sx={{ fontWeight: 800, color: 'white', mb: 1 }}>
                                    {title}
                                </Typography>
                            )}
                            {description && (
                                <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                                    {description}
                                </Typography>
                            )}
                        </Box>
                    )}
                    {isAdmin && showCreateButton && (
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={onCreateTable}
                            sx={{
                                borderRadius: 3,
                                px: 3,
                                py: 1.5,
                                bgcolor: '#5a78ff',
                                '&:hover': { bgcolor: '#4a68ef' },
                                textTransform: 'none',
                                fontWeight: 700
                            }}
                        >
                            Create new table
                        </Button>
                    )}
                </Box>
            )}

            <Grid container spacing={3}>
                {tables.map((table) => (
                    <Grid item xs={12} sm={6} md={4} key={table.id}>
                        <LoungeTable
                            table={table}
                            onJoin={onJoin}
                            onLeave={onLeave}
                            currentUserId={currentUserId}
                            myUsername={myUsername}
                            isAdmin={isAdmin}
                            onUpdateIcon={onUpdateIcon}
                            onEditTable={onEditTable}
                            onDeleteTable={onDeleteTable}
                            onParticipantClick={onParticipantClick}
                        />
                    </Grid>
                ))}
                {tables.length === 0 && (
                    <Grid item xs={12}>
                        <Box sx={{
                            py: 10,
                            textAlign: 'center',
                            bgcolor: 'rgba(255,255,255,0.03)',
                            borderRadius: 4,
                            border: '1px dashed rgba(255,255,255,0.1)'
                        }}>
                            <Typography sx={{ color: 'rgba(255,255,255,0.4)' }}>
                                No tables available yet.
                            </Typography>
                        </Box>
                    </Grid>
                )}
            </Grid>
        </Container>
    );
};

export default LoungeGrid;
