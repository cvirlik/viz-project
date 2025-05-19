import React from 'react';
import historicalData from '../data/historical-data.json';

interface SearchResultsProps {
  searchQuery: string;
  onResultClick: (nodeId: string) => void;
}

const SearchResults: React.FC<SearchResultsProps> = ({
  searchQuery,
  onResultClick,
}) => {
  const filteredResults = searchQuery
    ? historicalData.vertices.filter((vertex) =>
        vertex.title.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : historicalData.vertices;

  return (
    <div className="search-results">
      {filteredResults.length === 0 ? (
        <div className="no-results">Žádné výsledky nenalezeny</div>
      ) : (
        <div className="results-list">
          {filteredResults.map((result) => (
            <div
              key={result.id}
              className="result-item"
              onClick={() => onResultClick(result.id.toString())}
            >
              <div className="result-title">{result.title}</div>
              <div className="result-type">
                {result.archetype === 0 ? 'Osoba' : 'Technologie'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchResults;
