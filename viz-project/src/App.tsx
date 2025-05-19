import React from 'react';
import './App.css';
import { ThemeProvider, createTheme } from '@mui/material';
import { NetworkVisualization } from './components/NetworkVisualization';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <div className="App">
        <NetworkVisualization />
      </div>
    </ThemeProvider>
  );
}

export default App;
