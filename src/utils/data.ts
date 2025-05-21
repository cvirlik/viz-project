import _rawData from '../data/SW-eng-anonymized-demo-graph.json';

export const rawData = _rawData;
export type RawData = typeof rawData;

export type NodeData = {
  id: string;
  name: string;
  group: number;
  x: number;
  y: number;
  fx?: number | null;
  fy?: number | null;
  displayX?: number;
  displayY?: number;
  degree?: number;
  doi?: number;
};

export type LinkData = {
  source: string;
  target: string;
  value: number;
  gradientId: string;
};

const buildNeighborMap = (links: LinkData[]) => {
  const neighborMap = new Map<string, Set<string>>();

  for (const { source, target } of links) {
    let sourceSet = neighborMap.get(source);
    if (!sourceSet) {
      sourceSet = new Set<string>();
      neighborMap.set(source, sourceSet);
    }
    sourceSet.add(target);

    let targetSet = neighborMap.get(target);
    if (!targetSet) {
      targetSet = new Set<string>();
      neighborMap.set(target, targetSet);
    }
    targetSet.add(source);
  }

  return neighborMap;
};

export const parseData = (width: number, height: number) => {
  const nodes: NodeData[] = rawData.vertices.map(vertex => ({
    id: String(vertex.id),
    name: vertex.title,
    group: vertex.archetype,
    x: Math.random() * width,
    y: Math.random() * height,
    degree: 0,
  }));

  const links: LinkData[] = rawData.edges.map(edge => ({
    source: String(edge.from),
    target: String(edge.to),
    value: 1,
    gradientId: `grad-${edge.from}-${edge.to}`,
  }));

  const neighborMap = buildNeighborMap(links);

  return { nodes, links, neighborMap };
};
