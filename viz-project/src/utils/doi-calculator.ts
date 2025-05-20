import { NodeDatum } from '../types/NodeDatum';
import historicalData from '../data/historical-data.json';

interface DOIParams {
  searchQuery: string;
  selectedArchetypes: number[];
  dateRange: {
    min: number;
    max: number;
  };
  focusNode?: NodeDatum; // Optional focus node for joint distance calculation
}

// Calculate a-priori importance based on structural properties
const calculateAPIdiff = (node: NodeDatum, allNodes: NodeDatum[]): number => {
  const maxDegree = Math.max(...allNodes.map((n) => n.degree || 0));
  const minDegree = Math.min(...allNodes.map((n) => n.degree || 0));
  return (node.degree || 0 - minDegree) / (maxDegree - minDegree);
};

// Calculate user interest based on filters
const calculateUIdiff = (node: NodeDatum, params: DOIParams): number => {
  // Search relevance
  const searchRelevance = params.searchQuery
    ? node.name.toLowerCase().includes(params.searchQuery.toLowerCase())
      ? 1
      : 0
    : 0.5;

  // Archetype relevance
  const archetypeRelevance = params.selectedArchetypes.includes(node.group)
    ? 1
    : 0;

  // Date relevance
  const vertex = historicalData.vertices.find((v) => String(v.id) === node.id);
  const beginDate = vertex?.attributes['1']
    ? new Date(vertex.attributes['1']).getTime()
    : 0;
  const endDate = vertex?.attributes['2']
    ? new Date(vertex.attributes['2']).getTime()
    : beginDate;
  const dateRelevance =
    beginDate >= params.dateRange.min && endDate <= params.dateRange.max
      ? 1
      : 0;

  // Combine filter factors with weights
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

// Calculate joint distance from focus node
const calculateJointDistance = (
  node: NodeDatum,
  focusNode: NodeDatum | undefined,
  allNodes: NodeDatum[],
): number => {
  if (!focusNode) return 0.5; // Neutral value when no focus node

  // Find shortest path between node and focus node
  const visited = new Set<string>();
  const queue: { node: NodeDatum; distance: number }[] = [
    { node: focusNode, distance: 0 },
  ];
  visited.add(focusNode.id);

  while (queue.length > 0) {
    const { node: current, distance } = queue.shift()!;
    if (current.id === node.id) {
      // Normalize distance to [0,1] range, where 0 is closest and 1 is furthest
      // Assuming max distance of 5 for normalization
      return Math.max(0, 1 - distance / 5);
    }

    // Get neighbors
    const neighbors = allNodes.filter((n) => {
      const isNeighbor = historicalData.edges.some(
        (e) =>
          (String(e.from) === current.id && String(e.to) === n.id) ||
          (String(e.from) === n.id && String(e.to) === current.id),
      );
      return isNeighbor && !visited.has(n.id);
    });

    // Add neighbors to queue
    neighbors.forEach((neighbor) => {
      visited.add(neighbor.id);
      queue.push({ node: neighbor, distance: distance + 1 });
    });
  }

  return 0; // No path found
};

export const calculateDOI = (
  node: NodeDatum,
  allNodes: NodeDatum[],
  params: DOIParams,
): number => {
  // Calculate components
  const apiDiff = calculateAPIdiff(node, allNodes);
  const uiDiff = calculateUIdiff(node, params);
  const jointDistance = calculateJointDistance(
    node,
    params.focusNode,
    allNodes,
  );

  // Weights for the equation: DOI(x | y,z) = α*APIdiff(x) + β*UIdiff(x,z) + JD(x,y)
  const weights = {
    alpha: 0.3, // Weight for a-priori importance
    beta: 0.5, // Weight for user interest
    gamma: 0.2, // Weight for joint distance
  };

  // Calculate final DOI
  const finalDOI =
    apiDiff * weights.alpha +
    uiDiff * weights.beta +
    jointDistance * weights.gamma;

  return Math.max(0, Math.min(1, finalDOI)); // Normalize between 0 and 1
};
