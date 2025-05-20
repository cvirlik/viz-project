import React, { useState } from 'react';
import { rawData } from '../utils/data';

type DOIContextType = {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedArchetypes: number[];
  setSelectedArchetypes: (archetypes: number[]) => void;
  dateRange: { min: number; max: number };
  setDateRange: (range: { min: number; max: number }) => void;
};

const DOIContext = React.createContext<DOIContextType>({} as unknown as DOIContextType);

export const useDOI = () => {
  const context = React.useContext(DOIContext);
  if (!context) {
    throw new Error('useDOIContext must be used within a DOIProvider');
  }
  return context;
};

export const DOIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArchetypes, setSelectedArchetypes] = useState<number[]>(
    rawData.vertexArchetypes.map((_, index) => index)
  );

  const [dateRange, setDateRange] = useState<{ min: number; max: number }>({
    min: new Date('1910-01-01').getTime(),
    max: new Date('2024-01-01').getTime(),
  });

  return (
    <DOIContext.Provider
      value={{
        searchQuery,
        setSearchQuery,
        selectedArchetypes,
        setSelectedArchetypes,
        dateRange,
        setDateRange,
      }}
    >
      {children}
    </DOIContext.Provider>
  );
};
