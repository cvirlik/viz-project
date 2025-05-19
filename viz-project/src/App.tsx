import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material';
import { NetworkVisualization } from './components/NetworkVisualization';
import './App.css';

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
