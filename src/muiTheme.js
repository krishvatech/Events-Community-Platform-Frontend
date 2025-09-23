// src/muiTheme.js
import { createTheme, responsiveFontSizes } from '@mui/material/styles';

let theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1bbbb3' },      // teal used in your design
    secondary: { main: '#111827' },    // neutral-900
    background: {
      default: '#ffffff',
      paper: '#ffffff'
    },
    text: {
      primary: '#111827',              // neutral-900
      secondary: '#6b7280'             // neutral-500/600
    }
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: [
      'Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI',
      'Roboto', 'Helvetica Neue', 'Arial', 'Noto Sans', 'Apple Color Emoji',
      'Segoe UI Emoji'
    ].join(','),
  }
});

theme = responsiveFontSizes(theme);
export default theme;