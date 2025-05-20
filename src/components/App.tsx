import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material';
import { NetworkVisualization } from './NetworkVisualization';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
  },
});

export const App: React.FC = () => (
  <ThemeProvider theme={theme}>
    <div className="App">
      <NetworkVisualization />
    </div>
  </ThemeProvider>
);
