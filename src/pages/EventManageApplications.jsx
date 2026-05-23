import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Alert,
  Snackbar,
  Card,
  CardContent,
  TextField,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DownloadIcon from '@mui/icons-material/Download';
import EventManageLayout from '../layouts/EventManageLayout';
import ReviewQueueTable from '../components/ReviewQueueTable';
import ReviewQueueFilters from '../components/ReviewQueueFilters';
import ReviewQueueStats from '../components/ReviewQueueStats';
import ReviewQueueApplicationDetail from '../components/ReviewQueueApplicationDetail';
import BulkActionsDialog from '../components/BulkActionsDialog';
import {
  fetchReviewQueue,
  exportReviewQueue,
  getStatusColor,
} from '../utils/reviewQueue';
import { apiClient } from '../utils/api';

const EventManageApplications = () => {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Table and filter state
  const [applications, setApplications] = useState([]);
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [searchText, setSearchText] = useState('');

  // Selection and dialogs
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [bulkActionOpen, setBulkActionOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Load event and tracks/tiers on mount
  useEffect(() => {
    const loadEventData = async () => {
      try {
        setLoading(true);
        const eventResponse = await apiClient.get(`/events/${eventId}/`);
        const eventData = eventResponse.data;

        // FIX 1: Load application tracks independently
        let tracks = [];
        let allTiers = [];
        try {
          const tracksResponse = await apiClient.get(`/events/${eventId}/application-tracks/`);
          tracks = Array.isArray(tracksResponse.data)
            ? tracksResponse.data
            : tracksResponse.data.results || [];

          // Load pricing tiers for each track
          for (const track of tracks) {
            try {
              const tierResponse = await apiClient.get(
                `/events/${eventId}/application-tracks/${track.id}/pricing-tiers/`
              );
              // Handle both direct array and paginated response formats
              const tiersArray = Array.isArray(tierResponse.data)
                ? tierResponse.data
                : tierResponse.data.results || [];
              allTiers = allTiers.concat(tiersArray);
            } catch (tierErr) {
              console.warn(`Failed to load tiers for track ${track.id}:`, tierErr);
            }
          }
        } catch (tracksErr) {
          console.warn('Failed to load application tracks:', tracksErr);
        }

        // Add tracks and flattened tiers to event object
        eventData.application_tracks = tracks;
        eventData.pricing_tiers = allTiers;
        setEvent(eventData);
      } catch (err) {
        setError('Failed to load event data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadEventData();
  }, [eventId]);

  // Load applications when filters or page changes
  useEffect(() => {
    const loadApplications = async () => {
      setLoading(true);
      setError(null);

      const currentFilters = { ...filters };
      if (searchText) {
        currentFilters.search = searchText;
      }

      const result = await fetchReviewQueue(eventId, currentFilters, page + 1, pageSize);
      if (result.success) {
        setApplications(result.data);
        setTotalCount(result.count);
      } else {
        setError(result.error);
      }
      setLoading(false);
    };

    loadApplications();
  }, [eventId, filters, page, pageSize, searchText]);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setPage(0); // Reset to first page
    setSelectedIds([]); // Clear selection
  };

  const handleSearch = (e) => {
    setSearchText(e.target.value);
    setPage(0);
  };

  const handleExport = async () => {
    setExporting(true);
    const result = await exportReviewQueue(eventId, filters, 'csv');
    if (result.success) {
      // FIX 6: Use blob for direct binary file download
      const url = window.URL.createObjectURL(result.blob);
      const element = document.createElement('a');
      element.setAttribute('href', url);
      element.setAttribute('download', result.filename);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      window.URL.revokeObjectURL(url);
      setSuccessMessage('Applications exported successfully');
    } else {
      setError(result.error);
    }
    setExporting(false);
  };

  const handleDetailOpen = (app) => {
    setSelectedApplication(app);
    setDetailOpen(true);
  };

  const handleDetailClose = () => {
    setDetailOpen(false);
    setSelectedApplication(null);
  };

  const handleDetailUpdate = (updatedApp) => {
    // Refresh the list
    setSuccessMessage('Application updated successfully');
    handleDetailClose();
    setPage(0); // Reload first page to see updated data
  };

  const handleBulkActionSuccess = (result) => {
    setSuccessMessage(result.message || 'Bulk action completed successfully');
    setSelectedIds([]);
    setPage(0); // Reload first page
  };

  if (loading && !event) {
    return (
      <EventManageLayout eventId={eventId}>
        <Box display="flex" justifyContent="center" p={3}>
          Loading...
        </Box>
      </EventManageLayout>
    );
  }

  if (error && !event) {
    return (
      <EventManageLayout eventId={eventId}>
        <Alert severity="error">{error}</Alert>
      </EventManageLayout>
    );
  }

  return (
    <EventManageLayout eventId={eventId}>
      <Container maxWidth="lg" sx={{ py: 3 }}>
        {/* Header */}
        <Typography variant="h6" sx={{ mb: 2 }}>
          Applications / Review Queue
        </Typography>

        {/* Messages */}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Snackbar
          open={!!successMessage}
          autoHideDuration={6000}
          onClose={() => setSuccessMessage('')}
          message={successMessage}
        />

        {/* Statistics */}
        {event && (
          <ReviewQueueStats
            eventId={eventId}
            filters={filters}
          />
        )}

        {/* Filters */}
        {event && (
          <ReviewQueueFilters
            onFilterChange={handleFilterChange}
            tracks={event.application_tracks || []}
            tiers={event.pricing_tiers || []}
          />
        )}

        {/* Search and Actions */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <TextField
                placeholder="Search by name or email..."
                size="small"
                value={searchText}
                onChange={handleSearch}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                sx={{ flex: 1, minWidth: 200 }}
              />

              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={handleExport}
                  disabled={exporting || applications.length === 0}
                >
                  Export
                </Button>

                <Button
                  variant="contained"
                  onClick={() => setBulkActionOpen(true)}
                  disabled={selectedIds.length === 0}
                  color="primary"
                >
                  Bulk Actions ({selectedIds.length})
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Table */}
        <ReviewQueueTable
          data={applications}
          loading={loading}
          error={error}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onRowClick={handleDetailOpen}
          page={page}
          pageSize={pageSize}
          totalCount={totalCount}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />

        {/* Detail Dialog */}
        <ReviewQueueApplicationDetail
          open={detailOpen}
          onClose={handleDetailClose}
          application={selectedApplication}
          event={event}
          tiers={event?.pricing_tiers || []}
          onUpdate={handleDetailUpdate}
        />

        {/* Bulk Actions Dialog */}
        <BulkActionsDialog
          open={bulkActionOpen}
          onClose={() => setBulkActionOpen(false)}
          selectedIds={selectedIds}
          eventId={eventId}
          tiers={event?.pricing_tiers || []}
          onSuccess={handleBulkActionSuccess}
        />
      </Container>
    </EventManageLayout>
  );
};

export default EventManageApplications;
