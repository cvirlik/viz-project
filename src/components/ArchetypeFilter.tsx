import React from 'react';
import { Box, Chip } from '@mui/material';
import * as d3 from 'd3';
import historicalData from '../data/historical-data.json';

type ArchetypeFilterProps = {
  selectedArchetypes: number[];
  onArchetypeChange: (archetypes: number[]) => void;
};

const ArchetypeFilter: React.FC<ArchetypeFilterProps> = ({
  selectedArchetypes,
  onArchetypeChange,
}) => {
  const handleChipClick = (archetypeId: number) => {
    if (selectedArchetypes.includes(archetypeId)) {
      onArchetypeChange(selectedArchetypes.filter(id => id !== archetypeId));
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
          sx={{
            backgroundColor: selectedArchetypes.includes(index)
              ? d3.schemeCategory10[index % 10]
              : 'transparent',
            color: selectedArchetypes.includes(index) ? 'white' : d3.schemeCategory10[index % 10],
            border: `1px solid ${d3.schemeCategory10[index % 10]}`,
            '&:hover': {
              backgroundColor: d3.schemeCategory10[index % 10],
              color: 'white',
            },
          }}
          className="archetype-chip"
        />
      ))}
    </Box>
  );
};

export default ArchetypeFilter;
