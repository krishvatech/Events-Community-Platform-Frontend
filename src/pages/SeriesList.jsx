import React, { useState, useEffect, useCallback } from 'react';
import {
  Paper, Button, TextField, Box, Typography, CircularProgress,
  Table, TableContainer, TableHead, TableRow, TableCell, TableBody,
  Chip, Select, MenuItem, FormControl, InputLabel, Pagination, Stack, Grid,
  Card, CardContent, CardMedia, IconButton, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  GridView as GridIcon,
  ViewList as ListIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { API_BASE, getToken, authConfig } from '../utils/api';
import { toast } from 'react-toastify';
import SeriesDialog from '../components/dialogs/SeriesDialog';

const SeriesList = () => {
  const navigate = useNavigate();
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [seriestoDelete, setSeriesToDelete] = useState(null);
  const [selectedSeries, setSelectedSeries] = useState(null);

  const itemsPerPage = 10;

  const fetchSeries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page,
        limit: itemsPerPage,
      });
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);

      const response = await fetch(
        `${API_BASE}/series/?${params}`,
        { headers: { ...authConfig().headers } }
      );
      const data = await response.json();
      setSeries(data.results || []);
      setTotalPages(Math.ceil((data.count || 0) / itemsPerPage));
    } catch (error) {
      console.error('Error fetching series:', error);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchSeries();
  }, [fetchSeries]);

  const handleCreateClick = () => {
    setSelectedSeries(null);
    setDialogOpen(true);
  };

  const handleEditClick = (s) => {
    navigate(`/admin/series/${s.id}`);
  };

  const handleDeleteClick = (s) => {
    setSeriesToDelete(s);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!seriestoDelete) return;
    try {
      const response = await fetch(`${API_BASE}/series/${seriestoDelete.id}/`, {
        method: 'DELETE',
        headers: authConfig().headers,
      });
      if (response.ok) {
        toast.success(`Series "${seriestoDelete.title}" deleted successfully`);
        fetchSeries();
      } else {
        toast.error(`Failed to delete series (${response.status})`);
      }
    } catch (error) {
      console.error('Error deleting series:', error);
      toast.error('Error deleting series');
    } finally {
      setDeleteDialogOpen(false);
      setSeriesToDelete(null);
    }
  };


  const statusColor = (status) => {
    const colors = {
      draft: 'default',
      published: 'success',
      archived: 'error',
    };
    return colors[status] || 'default';
  };

  const ListViewComponent = () => (
    <TableContainer sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: 'grey.50' }}>
            <TableCell sx={{ fontWeight: 800 }}>Title</TableCell>
            <TableCell align="center">Events</TableCell>
            <TableCell align="center">Registrations</TableCell>
            <TableCell align="center">Status</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {series.map((s) => (
            <TableRow key={s.id} hover>
              <TableCell>{s.title}</TableCell>
              <TableCell align="center">{s.events_count}</TableCell>
              <TableCell align="center">{s.registrations_count}</TableCell>
              <TableCell align="center">
                <Chip label={s.status} color={statusColor(s.status)} size="small" />
              </TableCell>
              <TableCell align="right">
                <IconButton size="small" onClick={() => handleEditClick(s)} title="Edit">
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={() => handleDeleteClick(s)} color="error" title="Delete">
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const GridViewComponent = () => (
    <Grid container spacing={2}>
      {series.map((s) => (
        <Grid item xs={12} sm={6} md={4} key={s.id}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {s.cover_image_url && (
              <CardMedia
                sx={{ height: 200, bgcolor: 'grey.200', backgroundSize: 'cover' }}
                image={s.cover_image_url}
              />
            )}
            <CardContent sx={{ flexGrow: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
                {s.title}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                <Chip label={`${s.events_count} events`} size="small" variant="outlined" />
                <Chip label={`${s.registrations_count} registered`} size="small" variant="outlined" />
              </Stack>
              <Chip label={s.status} color={statusColor(s.status)} size="small" />
            </CardContent>
            <Box sx={{ display: 'flex', gap: 1, p: 2 }}>
              <Button
                fullWidth
                variant="outlined"
                size="small"
                startIcon={<EditIcon />}
                onClick={() => handleEditClick(s)}
              >
                Edit
              </Button>
              <IconButton size="small" onClick={() => handleDeleteClick(s)} color="error" title="Delete">
                <DeleteIcon />
              </IconButton>
            </Box>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 3 }}>
        My Series
      </Typography>

      {/* Toolbar */}
      <Paper sx={{ p: 2, mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          placeholder="Search series..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          size="small"
          sx={{ minWidth: 200 }}
          InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: 'grey.500' }} /> }}
        />

        <FormControl sx={{ minWidth: 150 }} size="small">
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="draft">Draft</MenuItem>
            <MenuItem value="published">Published</MenuItem>
            <MenuItem value="archived">Archived</MenuItem>
          </Select>
        </FormControl>

        <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
          <IconButton
            onClick={() => setViewMode('list')}
            color={viewMode === 'list' ? 'primary' : 'default'}
          >
            <ListIcon />
          </IconButton>
          <IconButton
            onClick={() => setViewMode('grid')}
            color={viewMode === 'grid' ? 'primary' : 'default'}
          >
            <GridIcon />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateClick}
          >
            New Series
          </Button>
        </Box>
      </Paper>

      {/* Content */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : series.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="textSecondary" sx={{ mb: 2 }}>
            No series yet. Create your first webinar series!
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreateClick}>
            Create Series
          </Button>
        </Paper>
      ) : viewMode === 'list' ? (
        <ListViewComponent />
      ) : (
        <GridViewComponent />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Stack sx={{ mt: 3, display: 'flex', alignItems: 'center' }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(e, value) => setPage(value)}
            color="primary"
          />
        </Stack>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Series?</DialogTitle>
        <DialogContent>
          <Typography sx={{ mt: 2 }}>
            Are you sure you want to delete <strong>"{seriestoDelete?.title}"</strong>?
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create/Edit Dialog */}
      <SeriesDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={() => fetchSeries()}
        series={selectedSeries}
      />
    </Box>
  );
};

export default SeriesList;
