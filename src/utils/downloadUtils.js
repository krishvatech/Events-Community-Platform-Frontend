/**
 * Download utility functions for exporting promotional profiles
 */

/**
 * Trigger a file download from blob or URL
 * @param {Blob|ArrayBuffer|string} data - File data or URL
 * @param {string} filename - Name for downloaded file
 * @param {string} mimeType - MIME type of file
 */
export const downloadFile = (data, filename, mimeType = 'application/octet-stream') => {
  try {
    let blob;

    // Handle different data types
    if (typeof data === 'string') {
      // If it's a URL (starts with http/blob), just open it
      if (data.startsWith('http') || data.startsWith('blob:')) {
        window.open(data, '_blank');
        return;
      }
      // If it's actual data (CSV/JSON text), create blob
      blob = new Blob([data], { type: mimeType });
    } else if (data instanceof Blob) {
      blob = data;
    } else if (data instanceof ArrayBuffer) {
      blob = new Blob([data], { type: mimeType });
    } else {
      console.error('Unsupported data type for download');
      return;
    }

    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading file:', error);
    throw error;
  }
};

/**
 * Download CSV file
 * @param {string} csvContent - CSV data as string
 * @param {string} filename - Filename (defaults to promotional-profiles.csv)
 */
export const downloadCSV = (csvContent, filename = 'promotional-profiles.csv') => {
  downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
};

/**
 * Download JSON file
 * @param {object} jsonData - Data object to export
 * @param {string} filename - Filename (defaults to promotional-profiles.json)
 */
export const downloadJSON = (jsonData, filename = 'promotional-profiles.json') => {
  const jsonString = typeof jsonData === 'string' ? jsonData : JSON.stringify(jsonData, null, 2);
  downloadFile(jsonString, filename, 'application/json;charset=utf-8;');
};

/**
 * Download ZIP file
 * @param {Blob|ArrayBuffer} zipData - ZIP file data
 * @param {string} filename - Filename (defaults to promotional-profiles.zip)
 */
export const downloadZip = (zipData, filename = 'promotional-profiles.zip') => {
  downloadFile(zipData, filename, 'application/zip');
};

/**
 * Handle response from API and trigger download
 * @param {Response} response - Fetch response object
 * @param {string} filename - Filename for download
 */
export const handleDownloadResponse = async (response, filename) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Download failed with status ${response.status}`);
  }

  const blob = await response.blob();
  downloadFile(blob, filename);
};

/**
 * Download file from API endpoint
 * @param {string} url - API endpoint URL
 * @param {string} filename - Filename for download
 * @param {object} options - Fetch options (method, body, headers)
 */
export const downloadFromAPI = async (url, filename, options = {}) => {
  try {
    const defaultOptions = {
      method: 'GET',
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      }
    };

    const response = await fetch(url, defaultOptions);
    await handleDownloadResponse(response, filename);
  } catch (error) {
    console.error('Error downloading from API:', error);
    throw error;
  }
};
