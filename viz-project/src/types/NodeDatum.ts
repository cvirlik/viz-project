import { SimulationNodeDatum } from 'd3';

export interface NodeDatum extends SimulationNodeDatum {
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
}
