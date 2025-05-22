import newData from '../data/SW-eng-anonymized-demo-graph.json';
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

// Cache for API values
let apiCache: Map<string, number> | null = null;

// Cache for UI values
let uiCache: Map<string, number> | null = null;
let lastSearchParams: {
  query: string;
  archetypes: number[];
  dateRange: { min: number; max: number };
} | null = null;

// Cache for distance values
let distanceCache: Map<string, Map<string, number>> | null = null;
let lastFocusNode: string | null = null;

const calculateAPIdiff = (node: NodeData, allNodes: NodeData[]): number => {
  // Initialize cache if needed
  if (!apiCache) {
    apiCache = new Map();
    const maxDegree = Math.max(...allNodes.map(n => n.degree || 0));
    const minDegree = Math.min(...allNodes.map(n => n.degree || 0));
    const range = maxDegree - minDegree;

    allNodes.forEach(n => {
      const value = range === 0 ? 0.5 : (n.degree || 0 - minDegree) / range;
      apiCache!.set(n.id, value);
    });
  }

  return apiCache.get(node.id) || 0;
};

const calculateUIdiff = (node: NodeData, params: DOIParams): number => {
  // Check if we need to recompute UI values
  const currentParams = {
    query: params.searchQuery,
    archetypes: params.selectedArchetypes,
    dateRange: params.dateRange,
  };

  const needsRecompute =
    !lastSearchParams ||
    lastSearchParams.query !== currentParams.query ||
    !arraysEqual(lastSearchParams.archetypes, currentParams.archetypes) ||
    lastSearchParams.dateRange.min !== currentParams.dateRange.min ||
    lastSearchParams.dateRange.max !== currentParams.dateRange.max;

  if (needsRecompute) {
    uiCache = new Map();
    lastSearchParams = currentParams;
  }

  // Return cached value if available
  if (uiCache?.has(node.id)) {
    return uiCache.get(node.id)!;
  }

  // Calculate new UI value
  const searchRelevance = params.searchQuery
    ? node.name.toLowerCase().includes(params.searchQuery.toLowerCase())
      ? 1
      : 0
    : 0.5;

  const archetypeRelevance = params.selectedArchetypes.includes(node.group) ? 1 : 0;

  const vertex = newData.vertices.find(v => String(v.id) === node.id);
  const createdDate = vertex?.attributes['9'] ? new Date(vertex.attributes['9']).getTime() : 0;
  const dateRelevance =
    createdDate >= params.dateRange.min && createdDate <= params.dateRange.max ? 1 : 0;

  const weights = {
    search: 0.4,
    archetype: 0.4,
    date: 0.2,
  };

  const value =
    searchRelevance * weights.search +
    archetypeRelevance * weights.archetype +
    dateRelevance * weights.date;

  // Cache the result
  uiCache?.set(node.id, value);
  return value;
};

const calculateJointDistance = (
  node: NodeData,
  focusNode: NodeData | undefined,
  allNodes: NodeData[]
): number => {
  if (!focusNode) return 0.5;

  // Check if we need to recompute distances
  if (lastFocusNode !== focusNode.id) {
    distanceCache = new Map();
    lastFocusNode = focusNode.id;
  }

  // Return cached distance if available
  if (distanceCache?.has(focusNode.id) && distanceCache.get(focusNode.id)?.has(node.id)) {
    return distanceCache.get(focusNode.id)!.get(node.id)!;
  }

  const visited = new Set<string>();
  const queue: { node: NodeData; distance: number }[] = [{ node: focusNode, distance: 0 }];
  visited.add(focusNode.id);

  // Initialize distance map for this focus node if needed
  if (!distanceCache?.has(focusNode.id)) {
    distanceCache?.set(focusNode.id, new Map());
  }

  while (queue.length > 0) {
    const { node: current, distance } = queue.shift()!;
    const distanceValue = Math.max(0, 1 - distance / 5);

    // Cache the distance
    distanceCache?.get(focusNode.id)?.set(current.id, distanceValue);

    if (current.id === node.id) {
      return distanceValue;
    }

    const neighbors = allNodes.filter(n => {
      const isNeighbor = newData.edges.some(
        edge =>
          (String(edge.from) === current.id && String(edge.to) === n.id) ||
          (String(edge.from) === n.id && String(edge.to) === current.id)
      );
      return isNeighbor && !visited.has(n.id);
    });

    neighbors.forEach(neighbor => {
      visited.add(neighbor.id);
      queue.push({ node: neighbor, distance: distance + 1 });
    });
  }

  return 0;
};

export const calculateDOI = (node: NodeData, allNodes: NodeData[], params: DOIParams): number => {
  const apiDiff = calculateAPIdiff(node, allNodes);
  const uiDiff = calculateUIdiff(node, params);
  const jointDistance = calculateJointDistance(node, params.focusNode, allNodes);

  const weights = {
    alpha: 0.3, // a-priori importance
    beta: 0.3, // user interest
    gamma: 0.4, // joint distance
  };

  return apiDiff * weights.alpha + uiDiff * weights.beta + jointDistance * weights.gamma;
};

// Helper function to compare arrays
const arraysEqual = (a: number[], b: number[]): boolean => {
  if (a.length !== b.length) return false;
  return a.every((val, index) => val === b[index]);
};
