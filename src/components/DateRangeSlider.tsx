import React from 'react';
import { Slider, Box, Typography } from '@mui/material';

type DateRangeSliderProps = {
  onRangeChange: (minDate: number, maxDate: number) => void;
};

export const DateRangeSlider: React.FC<DateRangeSliderProps> = ({ onRangeChange }) => {
  // Convert dates to timestamps for the slider
  const minDate = new Date('1910-01-01').getTime();
  const maxDate = new Date('2024-01-01').getTime();

  const handleChange = (_event: Event, newValue: number | number[]) => {
    if (Array.isArray(newValue)) {
      onRangeChange(newValue[0], newValue[1]);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <Box className="date-range-slider">
      <Typography variant="subtitle2" gutterBottom>
        Časový rozsah hledání
      </Typography>
      <Box className="date-labels">
        <Typography variant="caption" className="min-date">
          {formatDate(minDate)}
        </Typography>
        <Typography variant="caption" className="max-date">
          {formatDate(maxDate)}
        </Typography>
      </Box>
      <Slider
        min={minDate}
        max={maxDate}
        defaultValue={[minDate, maxDate]}
        onChange={handleChange}
        valueLabelDisplay="auto"
        valueLabelFormat={formatDate}
        disableSwap
      />
    </Box>
  );
};
