import historicalData from '../data/historical-data.json';
import { NodeData } from './data';

type DOIParams = {
  searchQuery: string;
  selectedArchetypes: number[];
  dateRange: {
    min: number;
    max: number;
  };
  focusNode?: NodeData;
};

const calculateAPIdiff = (node: NodeData, allNodes: NodeData[]): number => {
  const maxDegree = Math.max(...allNodes.map(n => n.degree || 0));
  const minDegree = Math.min(...allNodes.map(n => n.degree || 0));
  return (node.degree || 0 - minDegree) / (maxDegree - minDegree);
};

const calculateUIdiff = (node: NodeData, params: DOIParams): number => {
  const searchRelevance = params.searchQuery
    ? node.name.toLowerCase().includes(params.searchQuery.toLowerCase())
      ? 1
      : 0
    : 0.5;

  const archetypeRelevance = params.selectedArchetypes.includes(node.group) ? 1 : 0;

  const vertex = historicalData.vertices.find(v => String(v.id) === node.id);
  const beginDate = vertex?.attributes['1'] ? new Date(vertex.attributes['1']).getTime() : 0;
  const endDate = vertex?.attributes['2'] ? new Date(vertex.attributes['2']).getTime() : beginDate;
  const dateRelevance =
    beginDate >= params.dateRange.min && endDate <= params.dateRange.max ? 1 : 0;

  const weights = {
    search: 0.4,
    archetype: 0.4,
    date: 0.2,
  };

  return (
    searchRelevance * weights.search +
    archetypeRelevance * weights.archetype +
    dateRelevance * weights.date
  );
};

const buildAdjacencyList = (edges: typeof historicalData.edges): Record<string, string[]> => {
  const adjacencyList: Record<string, string[]> = {};
  for (const edge of edges) {
    const from = String(edge.from);
    const to = String(edge.to);
    if (!adjacencyList[from]) adjacencyList[from] = [];
    if (!adjacencyList[to]) adjacencyList[to] = [];
    adjacencyList[from].push(to);
    adjacencyList[to].push(from);
  }
  return adjacencyList;
};

const calculateJointDistance = (node: NodeData, focusNode: NodeData | undefined): number => {
  if (!focusNode) return 0.5;

  const adjacencyList = buildAdjacencyList(historicalData.edges);
  const visited = new Set<string>();
  const queue: { id: string; distance: number }[] = [{ id: focusNode.id, distance: 0 }];
  visited.add(focusNode.id);

  while (queue.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const { id: currentId, distance } = queue.shift()!;
    if (currentId === node.id) {
      return Math.max(0, 1 - distance / 5);
    }

    const neighbors = adjacencyList[currentId] || [];
    neighbors.forEach(neighborId => {
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        queue.push({ id: neighborId, distance: distance + 1 });
      }
    });
  }

  return 0;
};

export const calculateDOI = (node: NodeData, allNodes: NodeData[], params: DOIParams): number => {
  const apiDiff = calculateAPIdiff(node, allNodes);
  const uiDiff = calculateUIdiff(node, params);
  const jointDistance = calculateJointDistance(node, params.focusNode);

  // Weights for the equation: DOI(x | y,z) = α*APIdiff(x) + β*UIdiff(x,z) + JD(x,y)
  const weights = {
    alpha: 0.3, // a-priori importance
    beta: 0.3, // user interest
    gamma: 0.4, // joint distance
  };

  const finalDOI = apiDiff * weights.alpha + uiDiff * weights.beta + jointDistance * weights.gamma;

  return Math.max(0, Math.min(1, finalDOI)); // Normalize between 0 and 1
};
