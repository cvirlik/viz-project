import React from 'react';
import historicalData from '../data/historical-data.json';

type SearchResultsProps = {
  searchQuery: string;
  dateRange: {
    min: number;
    max: number;
  };
  selectedArchetypes: number[];
  onResultClick: (nodeId: string) => void;
};

const SearchResults: React.FC<SearchResultsProps> = ({
  searchQuery,
  dateRange,
  selectedArchetypes,
  onResultClick,
}) => {
  const filteredResults = historicalData.vertices
    .filter(vertex => {
      // Text search
      const matchesSearch =
        searchQuery === '' || vertex.title.toLowerCase().includes(searchQuery.toLowerCase());

      // Date range filter
      const beginDate = vertex.attributes['1'] ? new Date(vertex.attributes['1']).getTime() : 0;
      const endDate = vertex.attributes['2']
        ? new Date(vertex.attributes['2']).getTime()
        : beginDate;

      const matchesDateRange = beginDate >= dateRange.min && endDate <= dateRange.max;

      // Archetype filter
      const matchesArchetype = selectedArchetypes.includes(vertex.archetype);
      // OR stačí. Nemusí pasovat title i datum.
      // Spíš pak zvětšit nodes, které vyhovují oběma filterům.
      return matchesSearch && matchesDateRange && matchesArchetype;
    })
    .map(vertex => ({
      id: String(vertex.id),
      title: vertex.title,
      type: historicalData.vertexArchetypes[vertex.archetype],
    }));

  return (
    <div className="search-results">
      {filteredResults.length > 0 ? (
        <div className="results-list">
          {filteredResults.map(result => (
            <div key={result.id} className="result-item" onClick={() => onResultClick(result.id)}>
              <div className="result-title">{result.title}</div>
              <div className="result-type">{result.type.name}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-results">Žádné výsledky nenalezeny</div>
      )}
    </div>
  );
};

export default SearchResults;
