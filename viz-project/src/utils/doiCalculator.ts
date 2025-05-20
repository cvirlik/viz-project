import { NodeDatum } from '../types/NodeDatum';
import historicalData from '../data/historical-data.json';

interface DOIParams {
  searchQuery: string;
  selectedArchetypes: number[];
  dateRange: {
    min: number;
    max: number;
  };
}

export const calculateDOI = (
  node: NodeDatum,
  allNodes: NodeDatum[],
  params: DOIParams,
): number => {
  // Base DOI from node degree (structural importance)
  const maxDegree = Math.max(...allNodes.map((n) => n.degree || 0));
  const minDegree = Math.min(...allNodes.map((n) => n.degree || 0));
  const degreeDOI = (node.degree || 0 - minDegree) / (maxDegree - minDegree);

  // Search relevance DOI
  const searchDOI = params.searchQuery
    ? node.name.toLowerCase().includes(params.searchQuery.toLowerCase())
      ? 1
      : 0
    : 0.5; // Neutral value when no search query

  // Archetype relevance DOI
  const archetypeDOI = params.selectedArchetypes.includes(node.group) ? 1 : 0;

  // Date relevance DOI
  const vertex = historicalData.vertices.find((v) => String(v.id) === node.id);
  const beginDate = vertex?.attributes['1']
    ? new Date(vertex.attributes['1']).getTime()
    : 0;
  const endDate = vertex?.attributes['2']
    ? new Date(vertex.attributes['2']).getTime()
    : beginDate;

  const dateRange = params.dateRange;
  const dateDOI =
    beginDate >= dateRange.min && endDate <= dateRange.max ? 1 : 0;

  // Combine all factors with weights
  const weights = {
    degree: 0.1, // Structural importance
    search: 0.2, // Search relevance
    archetype: 0.5, // Archetype selection
    date: 0.2, // Date relevance
  };

  const finalDOI =
    degreeDOI * weights.degree +
    searchDOI * weights.search +
    archetypeDOI * weights.archetype +
    dateDOI * weights.date;

  return Math.max(0, Math.min(1, finalDOI)); // Normalize between 0 and 1
};
