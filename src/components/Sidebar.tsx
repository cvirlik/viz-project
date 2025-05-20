import { Button } from '@mui/material';
import React from 'react';
import ArchetypeFilter from './ArchetypeFilter';
import { DateRangeSlider } from './DateRangeSlider';
import SearchResults from './SearchResults';
import { useDOI } from '../providers/doi';

export type SidebarProps = {
  isRunning: boolean;
  setIsRunning: (running: boolean) => void;
  setSelected: (selected: string) => void;
};

export const Sidebar: React.FC<SidebarProps> = ({ isRunning, setIsRunning, setSelected }) => {
  const {
    searchQuery,
    selectedArchetypes,
    dateRange,
    setSearchQuery,
    setSelectedArchetypes,
    setDateRange,
  } = useDOI();

  const handleSearchChange: React.ChangeEventHandler<HTMLInputElement> = event =>
    setSearchQuery(event.target.value);

  const handleArchetypeChange = (newArchetypes: number[]) => {
    setSelectedArchetypes(newArchetypes);
  };

  const handleDateRangeChange = (minDate: number, maxDate: number) => {
    setDateRange({ min: minDate, max: maxDate });
  };

  return (
    <div id="sidebar">
      <Button
        className="play-button"
        variant="contained"
        color={isRunning ? 'error' : 'success'}
        onClick={() => setIsRunning(!isRunning)}
      >
        {isRunning ? 'Pause' : 'Play'}
      </Button>
      <div className="faceted-search">
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="Vyhledávat v záznamech.."
            value={searchQuery}
            onChange={handleSearchChange}
          />
          <svg
            className="search-icon"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>

        <ArchetypeFilter
          selectedArchetypes={selectedArchetypes}
          onArchetypeChange={handleArchetypeChange}
        />

        <DateRangeSlider onRangeChange={handleDateRangeChange} />
      </div>

      <SearchResults
        searchQuery={searchQuery}
        dateRange={dateRange}
        selectedArchetypes={selectedArchetypes}
        onResultClick={setSelected}
      />
    </div>
  );
};
