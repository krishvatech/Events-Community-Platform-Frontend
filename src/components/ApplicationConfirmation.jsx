import React from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Divider,
  Container,
  Alert,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EventTrackApplicationStatusBadge from './EventTrackApplicationStatusBadge';

/**
 * ApplicationConfirmation Component
 * Displays confirmation message and summary after successful application submission.
 * Shows per-track confirmation content from Phase 6.
 * Phase 7: Multi-track application support.
 */
const ApplicationConfirmation = ({
  application,
  trackApplications,
  eventTitle,
  onDone,
}) => {
  if (!application || !trackApplications) {
    return null;
  }

  const renderMarkdown = (content) => {
    // Simple markdown rendering - in production use a proper markdown parser
    if (!content) return null;

    return (
      <Box
        sx={{
          '& h1, & h2, & h3': { mt: 2, mb: 1 },
          '& p': { mb: 1, lineHeight: 1.6 },
          '& ul, & ol': { ml: 2, mb: 1 },
          '& li': { mb: 0.5 },
          '& strong': { fontWeight: 'bold' },
          '& em': { fontStyle: 'italic' },
          '& a': { color: '#1976d2', textDecoration: 'none' },
          '& a:hover': { textDecoration: 'underline' },
        }}
        dangerouslySetInnerHTML={{
          __html: content
            .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
            .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
            .replace(/^# (.*?)$/gm, '<h1>$1</h1>')
            .replace(/^\* (.*?)$/gm, '<li>$1</li>')
            .replace(/^- (.*?)$/gm, '<li>$1</li>')
            .replace(/(?:^|\n)(<li>.*?<\/li>)/s, '<ul>$1</ul>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/(?<!<\w+>)^(?!<[ul|ol|li|h])(.+)$/gm, '<p>$1</p>'),
        }}
      />
    );
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Card sx={{ mb: 4 }}>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <CheckCircleIcon
            sx={{
              fontSize: 80,
              color: 'success.main',
              mb: 2,
            }}
          />
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Application Submitted Successfully!
          </Typography>
          <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
            Thank you for applying to {eventTitle}. We've received your application
            and will review it shortly.
          </Typography>

          <Alert severity="info" sx={{ mt: 3, textAlign: 'left' }}>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              Application Details
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText
                  primary="Email"
                  secondary={application.email}
                  primaryTypographyProps={{ variant: 'caption' }}
                  secondaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Submitted"
                  secondary={new Date(application.applied_at).toLocaleString()}
                  primaryTypographyProps={{ variant: 'caption' }}
                  secondaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
            </List>
          </Alert>
        </CardContent>
      </Card>

      {/* Track-specific confirmations */}
      {trackApplications && trackApplications.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" fontWeight={600} gutterBottom sx={{ mb: 3 }}>
            Applied Tracks
          </Typography>

          {trackApplications.map((trackApp, idx) => (
            <Card key={trackApp.id} sx={{ mb: 3 }}>
              <CardContent>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start',
                    mb: 2,
                  }}
                >
                  <Box>
                    <Typography variant="h6" fontWeight={600}>
                      {trackApp.track_label}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Mode: {trackApp.submission_mode.replace(/_/g, ' ')}
                    </Typography>
                  </Box>
                  <EventTrackApplicationStatusBadge
                    status={trackApp.status}
                    reviewedAt={trackApp.reviewed_at}
                    showDate={true}
                  />
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Render confirmation content from Phase 6 */}
                {trackApp.confirmation_page_content && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                      Track Information
                    </Typography>
                    {renderMarkdown(trackApp.confirmation_page_content)}
                  </Box>
                )}

                {/* Track-specific next steps */}
                <Box sx={{ mt: 2, p: 2, backgroundColor: 'rgba(0, 0, 0, 0.02)', borderRadius: 1 }}>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    Next Steps
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    We will review your application and contact you at{' '}
                    <strong>{application.email}</strong> with updates about your{' '}
                    {trackApp.track_label} application status.
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* Contact info */}
      <Card sx={{ backgroundColor: 'rgba(25, 118, 210, 0.04)' }}>
        <CardContent>
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
            Questions?
          </Typography>
          <Typography variant="body2" color="textSecondary">
            If you have any questions about your application, please contact us at
            support@example.com or visit our help center.
          </Typography>
        </CardContent>
      </Card>

      {/* Action buttons */}
      <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center' }}>
        <Button variant="outlined" onClick={() => (window.location.href = '/events')}>
          Back to Events
        </Button>
        {onDone && (
          <Button variant="contained" onClick={onDone}>
            Done
          </Button>
        )}
      </Box>
    </Container>
  );
};

export default ApplicationConfirmation;
