import React from 'react';
import { Box, Chip } from '@mui/material';
import historicalData from '../data/historical-data.json';
import '../styles/ArchetypeFilter.css';

interface ArchetypeFilterProps {
  selectedArchetypes: number[];
  onArchetypeChange: (archetypes: number[]) => void;
}

const ArchetypeFilter: React.FC<ArchetypeFilterProps> = ({
  selectedArchetypes,
  onArchetypeChange,
}) => {
  const handleChipClick = (archetypeId: number) => {
    if (selectedArchetypes.includes(archetypeId)) {
      onArchetypeChange(selectedArchetypes.filter((id) => id !== archetypeId));
    } else {
      onArchetypeChange([...selectedArchetypes, archetypeId]);
    }
  };

  return (
    <Box className="archetype-filter">
      {historicalData.vertexArchetypes.map((archetype, index) => (
        <Chip
          key={index}
          label={archetype.name}
          onClick={() => handleChipClick(index)}
          color={selectedArchetypes.includes(index) ? 'primary' : 'default'}
          className="archetype-chip"
        />
      ))}
    </Box>
  );
};

export default ArchetypeFilter;
