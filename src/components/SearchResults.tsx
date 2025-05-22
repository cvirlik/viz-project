import React from 'react';
import swEngData from '../data/SW-eng-anonymized-demo-graph.json';
import { NodeData } from '../utils/data';

type SearchResultsProps = {
  searchQuery: string;
  dateRange: {
    min: number;
    max: number;
  };
  selectedArchetypes: number[];
  onResultClick: (nodeId: string) => void;
  handleNodeClick: (node: NodeData) => void;
  positioned: NodeData[];
};

const SearchResults: React.FC<SearchResultsProps> = ({
  searchQuery,
  dateRange,
  selectedArchetypes,
  onResultClick,
  handleNodeClick,
  positioned,
}) => {
  const filteredResults = swEngData.vertices
    .filter(vertex => {
      // Check if any non-empty string attribute matches the search query
      const matchesSearch =
        searchQuery === '' ||
        Object.entries(vertex.attributes).some(([_, value]) => {
          if (typeof value === 'string' && value.trim() !== '') {
            return value.toLowerCase().includes(searchQuery.toLowerCase());
          }
          return false;
        }) ||
        vertex.title.toLowerCase().includes(searchQuery.toLowerCase());

      const beginDate = vertex.attributes['1'] ? new Date(vertex.attributes['1']).getTime() : 0;
      const endDate = vertex.attributes['2']
        ? new Date(vertex.attributes['2']).getTime()
        : beginDate;

      const matchesDateRange = beginDate >= dateRange.min && endDate <= dateRange.max;

      const matchesArchetype = selectedArchetypes.includes(vertex.archetype);
      return matchesSearch && matchesDateRange && matchesArchetype;
    })
    .map(vertex => ({
      id: String(vertex.id),
      title: vertex.title,
      type: swEngData.vertexArchetypes[vertex.archetype],
      // Include only non-empty matching attributes in the result for display
      matchingAttributes: Object.entries(vertex.attributes)
        .filter(
          ([_, value]) =>
            typeof value === 'string' &&
            value.trim() !== '' &&
            value.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .map(([key, value]) => ({ key, value })),
    }));

  const handleResultClick = (resultId: string) => {
    onResultClick(resultId);
    const node = positioned.find(n => n.id === resultId);
    if (node) {
      handleNodeClick(node);
    }
  };

  return (
    <div className="search-results">
      {filteredResults.length > 0 ? (
        <div className="results-list">
          {filteredResults.map(result => (
            <div
              key={result.id}
              className="result-item"
              onClick={() => handleResultClick(result.id)}
            >
              <div className="result-title">{result.title}</div>
              <div className="result-type">{result.type.name}</div>
              {result.matchingAttributes.length > 0 && (
                <div className="result-matches">
                  {result.matchingAttributes.map(({ key, value }) => (
                    <div key={key} className="result-match">
                      <span className="match-key">{key}:</span> {value}
                    </div>
                  ))}
                </div>
              )}
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
