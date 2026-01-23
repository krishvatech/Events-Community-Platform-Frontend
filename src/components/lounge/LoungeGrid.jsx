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
}) => {
    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: 'white', mb: 1 }}>
                        Social Lounge
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                        Meet and greet while we prepare to go live. Take a seat to join a conversation.
                    </Typography>
                </Box>
                {isAdmin && (
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
                                No tables available in this lounge yet.
                            </Typography>
                        </Box>
                    </Grid>
                )}
            </Grid>
        </Container>
    );
};

export default LoungeGrid;
