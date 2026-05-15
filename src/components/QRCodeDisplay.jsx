import { Box, Button, CircularProgress, Stack, TextField, Tooltip, IconButton } from '@mui/material';
import { useState } from 'react';
import FileCopyIcon from '@mui/icons-material/FileCopy';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { toast } from 'react-toastify';

function QRCodeDisplay({ url, eventSlug, size = 300 }) {
  const [loading, setLoading] = useState(false);
  const [qrGenerating, setQrGenerating] = useState(false);

  // Use QR server API to generate QR code
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(url);
    toast.success('URL copied to clipboard!');
  };

  const handleDownloadQR = async () => {
    setQrGenerating(true);
    try {
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `companion-${eventSlug}-qr.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
      toast.success('QR code downloaded!');
    } catch (err) {
      toast.error('Failed to download QR code');
    } finally {
      setQrGenerating(false);
    }
  };

  return (
    <Stack spacing={3}>
      {/* Direct URL */}
      <Box>
        <Stack direction="row" gap={1} sx={{ mb: 1 }}>
          <TextField
            fullWidth
            size="small"
            value={url}
            InputProps={{ readOnly: true }}
            variant="outlined"
          />
          <Tooltip title="Copy URL">
            <IconButton onClick={handleCopyUrl} color="primary" size="small">
              <FileCopyIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* QR Code */}
      <Box sx={{ textAlign: 'center' }}>
        <Box
          component="img"
          src={qrUrl}
          alt="Event Companion QR Code"
          sx={{
            width: size,
            height: size,
            border: '1px solid #ddd',
            borderRadius: 1,
            p: 2,
            bgcolor: '#fff',
          }}
        />
        <Stack direction="row" gap={1} sx={{ mt: 2, justifyContent: 'center' }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={qrGenerating ? <CircularProgress size={16} /> : <FileDownloadIcon />}
            onClick={handleDownloadQR}
            disabled={qrGenerating}
            sx={{ textTransform: 'none' }}
          >
            Download QR
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<FileCopyIcon />}
            onClick={handleCopyUrl}
            sx={{ textTransform: 'none' }}
          >
            Copy Link
          </Button>
        </Stack>
      </Box>
    </Stack>
  );
}

export default QRCodeDisplay;
