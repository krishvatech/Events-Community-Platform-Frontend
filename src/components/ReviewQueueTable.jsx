import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  Chip,
  CircularProgress,
  Box,
  Alert,
  TablePagination,
  Typography,
  Button,
} from '@mui/material';
import { getStatusColor, formatDate, getSubmissionModeLabel } from '../utils/reviewQueue';

const ReviewQueueTable = ({
  data = [],
  loading = false,
  error = null,
  selectedIds = [],
  onSelectionChange,
  onRowClick,
  page = 0,
  pageSize = 25,
  totalCount = 0,
  onPageChange,
  onPageSizeChange,
  tiers = [],
}) => {
  const handleSelectAll = (event) => {
    if (event.target.checked) {
      const allIds = data.map((item) => item.id);
      onSelectionChange(allIds);
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectRow = (id) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((pid) => pid !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const isAllSelected = data.length > 0 && selectedIds.length === data.length;
  const isPartiallySelected = selectedIds.length > 0 && selectedIds.length < data.length;

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (data.length === 0) {
    return <Alert severity="info">No applications found. Try adjusting your filters.</Alert>;
  }

  const getStatusChipColor = (status) => {
    const colors = {
      pending: 'default',
      pre_approved: 'info',
      accepted: 'success',
      declined: 'error',
      waitlisted: 'warning',
    };
    return colors[status] || 'default';
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pending',
      pre_approved: 'Pre-Approved',
      accepted: 'Accepted',
      declined: 'Declined',
      waitlisted: 'Waitlisted',
    };
    return labels[status] || status;
  };

  const getPaymentStatus = (app) => {
    if (app.status !== 'accepted') {
      return null; // Only show payment status for accepted applications
    }

    // Use actual origin_status from backend (true source of truth)
    if (app.origin_status === 'confirmed') {
      return { label: 'Confirmed', color: 'success' };  // Green ✅
    } else if (app.origin_status === 'payment_pending') {
      return { label: 'Payment Pending', color: 'warning' };  // Orange 🔶
    }

    return null;
  };

  return (
    <Box>
      {selectedIds.length > 0 && (
        <Box sx={{ mb: 2, p: 1, backgroundColor: '#e3f2fd', borderRadius: 1 }}>
          <Typography variant="body2">
            {selectedIds.length} application(s) selected
          </Typography>
        </Box>
      )}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={isPartiallySelected}
                  checked={isAllSelected}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell>Applicant</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Track</TableCell>
              <TableCell>Mode</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Tier</TableCell>
              <TableCell>Payment Status</TableCell>
              <TableCell>Reviewed At</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((app) => (
              <TableRow
                key={app.id}
                hover
                onClick={() => onRowClick?.(app)}
                sx={{ cursor: 'pointer' }}
              >
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedIds.includes(app.id)}
                    onChange={() => handleSelectRow(app.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {app.applicant_first_name} {app.applicant_last_name}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{app.applicant_email}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{app.track_label}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {getSubmissionModeLabel(app.submission_mode)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={getStatusLabel(app.status)}
                    size="small"
                    color={getStatusChipColor(app.status)}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {app.status === 'accepted' ? (app.accepted_tier_label || '-') : (app.tier_label || '-')}
                  </Typography>
                </TableCell>
                <TableCell>
                  {(() => {
                    const paymentStatus = getPaymentStatus(app);
                    return paymentStatus ? (
                      <Chip
                        label={paymentStatus.label}
                        size="small"
                        color={paymentStatus.color}
                        variant="outlined"
                      />
                    ) : (
                      <Typography variant="body2">-</Typography>
                    );
                  })()}
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{formatDate(app.reviewed_at)}</Typography>
                </TableCell>
                <TableCell align="center">
                  <Button
                    size="small"
                    variant="contained"
                    color="primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRowClick?.(app);
                    }}
                  >
                    Review
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[10, 25, 50, 100]}
        component="div"
        count={totalCount}
        rowsPerPage={pageSize}
        page={page}
        onPageChange={(e, newPage) => onPageChange(newPage)}
        onRowsPerPageChange={(e) => onPageSizeChange(parseInt(e.target.value, 10))}
      />
    </Box>
  );
};

export default ReviewQueueTable;
