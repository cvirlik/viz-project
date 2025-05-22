import newData from '../data/SW-eng-anonymized-demo-graph.json';
import { NodeData } from './data';

type DOIParams = {
  searchQuery: string;
  selectedArchetypes: number[];
  dateRange: { min: number; max: number };
  focusNode?: NodeData;
};

let apiCache: Map<string, number> | null = null;
let uiCache: Map<string, number> | null = null;
let lastSearchParams: {
  query: string;
  archetypes: number[];
  dateRange: { min: number; max: number };
} | null = null;
let distanceCache: Map<string, Map<string, number>> | null = null;
let lastFocusNode: string | null = null;

const arraysEqual = (a: number[], b: number[]) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

const buildAdjacencyList = (() => {
  const adj: Record<string, string[]> = {};
  for (const { from, to } of newData.edges) {
    const f = String(from);
    const t = String(to);
    (adj[f] ||= []).push(t);
    (adj[t] ||= []).push(f);
  }
  return adj;
})();

const calculateAPIdiff = (node: NodeData, allNodes: NodeData[]): number => {
  if (!apiCache) {
    apiCache = new Map();
    const degrees = allNodes.map(n => n.degree || 0);
    const max = Math.max(...degrees);
    const min = Math.min(...degrees);
    const range = max - min || 1;
    allNodes.forEach(n => apiCache!.set(n.id, (n.degree || 0 - min) / range));
  }
  return apiCache.get(node.id) ?? 0;
};

const calculateUIdiff = (node: NodeData, params: DOIParams): number => {
  const current = {
    query: params.searchQuery,
    archetypes: params.selectedArchetypes,
    dateRange: params.dateRange,
  };

  if (
    !lastSearchParams ||
    lastSearchParams.query !== current.query ||
    !arraysEqual(lastSearchParams.archetypes, current.archetypes) ||
    lastSearchParams.dateRange.min !== current.dateRange.min ||
    lastSearchParams.dateRange.max !== current.dateRange.max
  ) {
    uiCache = new Map();
    lastSearchParams = current;
  }

  const cached = uiCache?.get(node.id);
  if (cached !== undefined) return cached;

  const searchRel = current.query
    ? node.name.toLowerCase().includes(current.query.toLowerCase())
      ? 1
      : 0
    : 0.5;

  const archeRel = current.archetypes.includes(node.group) ? 1 : 0;

  const v = newData.vertices.find(v => String(v.id) === node.id);
  const created = v?.attributes['9'] ? new Date(v.attributes['9']).getTime() : 0;
  const dateRel = created >= current.dateRange.min && created <= current.dateRange.max ? 1 : 0;

  const val = searchRel * 0.4 + archeRel * 0.4 + dateRel * 0.2;
  uiCache?.set(node.id, val);
  return val;
};

const calculateJointDistance = (node: NodeData, focusNode: NodeData | undefined): number => {
  if (!focusNode) return 0.8;

  if (lastFocusNode !== focusNode.id) {
    distanceCache = new Map();
    lastFocusNode = focusNode.id;
  }

  const cached = distanceCache?.get(focusNode.id)?.get(node.id);
  if (cached !== undefined) return cached;

  if (!distanceCache?.has(focusNode.id)) distanceCache?.set(focusNode.id, new Map());

  const visited = new Set<string>([focusNode.id]);
  const q: { id: string; d: number }[] = [{ id: focusNode.id, d: 0 }];

  while (q.length) {
    const { id, d } = q.shift()!;
    const distVal = Math.max(0, 1 - d / 5);
    distanceCache!.get(focusNode.id)!.set(id, distVal);
    if (id === node.id) return distVal;

    for (const nb of buildAdjacencyList[id] || []) {
      if (!visited.has(nb)) {
        visited.add(nb);
        q.push({ id: nb, d: d + 1 });
      }
    }
  }
  return 0;
};

export const calculateDOI = (node: NodeData, allNodes: NodeData[], params: DOIParams): number => {
  const api = calculateAPIdiff(node, allNodes);
  const ui = calculateUIdiff(node, params);
  const jd = calculateJointDistance(node, params.focusNode);
  const score = api * 0.3 + ui * 0.3 + jd * 0.4;
  return Math.max(0, Math.min(1, score));
};
