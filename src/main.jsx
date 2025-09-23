// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';
import './styles/brand.css';

// MUI providers
import { ThemeProvider, StyledEngineProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './muiTheme';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>
        {/* Keep Tailwind look exactly the same; CssBaseline only normalizes defaults */}
        <CssBaseline />
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ThemeProvider>
    </StyledEngineProvider>
  </React.StrictMode>
);