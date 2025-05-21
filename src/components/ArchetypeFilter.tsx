import React from 'react';
import { Box, Chip } from '@mui/material';
import * as d3 from 'd3';
import { rawData } from '../utils/data';

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

  // Get unique archetypes from the current dataset
  const archetypes = Object.entries(rawData.vertexArchetypes).map(([id, archetype]) => ({
    id: parseInt(id),
    ...archetype,
  }));

  return (
    <Box className="archetype-filter">
      {archetypes.map(archetype => (
        <Chip
          key={archetype.id}
          label={archetype.name}
          onClick={() => handleChipClick(archetype.id)}
          sx={{
            backgroundColor: selectedArchetypes.includes(archetype.id)
              ? d3.schemeCategory10[archetype.id % 10]
              : 'transparent',
            color: selectedArchetypes.includes(archetype.id)
              ? 'white'
              : d3.schemeCategory10[archetype.id % 10],
            border: `1px solid ${d3.schemeCategory10[archetype.id % 10]}`,
            '&:hover': {
              backgroundColor: d3.schemeCategory10[archetype.id % 10],
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
