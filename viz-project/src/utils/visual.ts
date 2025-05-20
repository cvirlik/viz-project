import { NodeDatum } from '../types/NodeDatum';

export const calculateNodeRadius = (node: NodeDatum, allNodes: NodeDatum[]) => {
  const baseSize = 30; // Base size for nodes
  const maxSize = 50; // Maximum size for nodes
  const maxDegree = Math.max(...allNodes.map((n) => n.degree || 0));
  const minDegree = Math.min(...allNodes.map((n) => n.degree || 0));

  if (maxDegree === minDegree) return baseSize;

  // Normalize degree between 0 and 1
  const normalizedDegree =
    (node.degree || 0 - minDegree) / (maxDegree - minDegree);

  // Scale size between baseSize and maxSize
  console.log(
    Math.min(baseSize + normalizedDegree * (maxSize - baseSize), maxSize),
  );
  return Math.min(baseSize + normalizedDegree * (maxSize - baseSize), maxSize);
};
