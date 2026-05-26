import React, { useState } from 'react';
import {
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Paper,
  Stack,
  InputAdornment,
  IconButton,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';

const ReviewQueueFilters = ({ onFilterChange, tracks = [], reviewers = [], tiers = [] }) => {
  const [filters, setFilters] = useState({
    trackId: '',
    submissionMode: '',
    status: '',
    tierId: '',
    reviewerId: '',
    search: '',
  });

  const handleFilterChange = (field, value) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    // Auto-apply on filter change
    onFilterChange(newFilters);
  };

  const handleSearchChange = (value) => {
    const newFilters = { ...filters, search: value };
    setFilters(newFilters);
  };

  const handleSearchSubmit = () => {
    onFilterChange(filters);
  };

  const handleReset = () => {
    const emptyFilters = {
      trackId: '',
      submissionMode: '',
      status: '',
      tierId: '',
      reviewerId: '',
      search: '',
    };
    setFilters(emptyFilters);
    onFilterChange(emptyFilters);
  };

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      {/* Row 1: Search and Refresh */}
      <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: 'center' }}>
        <TextField
          placeholder="Search by name or email..."
          variant="outlined"
          size="small"
          value={filters.search}
          onChange={(e) => handleSearchChange(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') handleSearchSubmit();
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 250, flex: 1 }}
        />

        <IconButton size="small" onClick={() => onFilterChange(filters)}>
          <RefreshRoundedIcon />
        </IconButton>
      </Stack>

      {/* Row 2: Filters and Reset Button */}
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            label="Status"
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="pre_approved">Pre-Approved</MenuItem>
            <MenuItem value="accepted">Accepted</MenuItem>
            <MenuItem value="declined">Declined</MenuItem>
            <MenuItem value="waitlisted">Waitlisted</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Track</InputLabel>
          <Select
            value={filters.trackId}
            onChange={(e) => handleFilterChange('trackId', e.target.value)}
            label="Track"
          >
            <MenuItem value="">All Tracks</MenuItem>
            {tracks.map((track) => (
              <MenuItem key={track.id} value={track.id}>
                {track.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Submission Mode</InputLabel>
          <Select
            value={filters.submissionMode}
            onChange={(e) => handleFilterChange('submissionMode', e.target.value)}
            label="Submission Mode"
          >
            <MenuItem value="">All Modes</MenuItem>
            <MenuItem value="self_submission">Self Submission</MenuItem>
            <MenuItem value="confirmed">Confirmed</MenuItem>
            <MenuItem value="self_nomination">Self Nomination</MenuItem>
            <MenuItem value="third_party_nomination">Third-Party Nomination</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Tier</InputLabel>
          <Select
            value={filters.tierId}
            onChange={(e) => handleFilterChange('tierId', e.target.value)}
            label="Tier"
          >
            <MenuItem value="">All Tiers</MenuItem>
            {tiers.map((tier) => (
              <MenuItem key={tier.id} value={tier.id}>
                {tier.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Reviewer</InputLabel>
          <Select
            value={filters.reviewerId}
            onChange={(e) => handleFilterChange('reviewerId', e.target.value)}
            label="Reviewer"
          >
            <MenuItem value="">All Reviewers</MenuItem>
            {reviewers.map((reviewer) => (
              <MenuItem key={reviewer.id} value={reviewer.id}>
                {reviewer.first_name} {reviewer.last_name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button size="small" variant="outlined" onClick={handleReset}>
          Reset Filters
        </Button>
      </Stack>
    </Paper>
  );
};

export default ReviewQueueFilters;
