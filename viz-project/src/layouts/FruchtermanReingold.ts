import { NodeDatum } from '../types/NodeDatum';
import { calculateDOI } from '../utils/utils';

interface Point {
  x: number;
  y: number;
}
interface Link {
  source: NodeDatum;
  target: NodeDatum;
}
interface Options {
  width: number;
  height: number;
  iterations?: number;
  k?: number;
  temperature?: number;
  coolingFactor?: number;
}

export class FruchtermanReingold {
  private width: number;
  private height: number;
  private iterations: number;
  private k: number;
  private temperature: number;
  private coolingFactor: number;
  private nodes: NodeDatum[];
  private links: Link[];
  private forces = new Map<string, Point>();

  constructor(nodes: NodeDatum[], links: Link[], options: Options) {
    this.nodes = nodes;
    this.links = links;
    this.width = options.width;
    this.height = options.height;
    this.iterations = options.iterations ?? 50;
    this.k =
      options.k ?? Math.sqrt((this.width * this.height) / this.nodes.length);
    this.temperature = options.temperature ?? this.width / 4;
    this.coolingFactor = options.coolingFactor ?? 0.95;
  }

  private calculateRepulsiveForces() {
    this.forces.clear();
    this.nodes.forEach((n) => this.forces.set(n.id, { x: 0, y: 0 }));
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const a = this.nodes[i],
          b = this.nodes[j];
        const dx = b.x - a.x,
          dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);
        if (dist === 0) continue;
        const force = (this.k * this.k) / dist;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        const fa = this.forces.get(a.id),
          fb = this.forces.get(b.id);
        if (fa && fb) {
          fa.x -= fx;
          fa.y -= fy;
          fb.x += fx;
          fb.y += fy;
        }
      }
    }
  }

  private calculateAttractiveForces() {
    this.links.forEach((link) => {
      const dx = link.target.x - link.source.x;
      const dy = link.target.y - link.source.y;
      const dist = Math.hypot(dx, dy);
      if (dist === 0) return;
      const force = (dist * dist) / this.k;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      const fs = this.forces.get(link.source.id);
      const ft = this.forces.get(link.target.id);
      if (fs && ft) {
        fs.x += fx;
        fs.y += fy;
        ft.x -= fx;
        ft.y -= fy;
      }
    });
  }

  private calculateCenteringForces(strength = 0.1) {
    const cx = this.width / 2,
      cy = this.height / 2;
    this.nodes.forEach((n) => {
      const f = this.forces.get(n.id);
      if (f) {
        f.x += (cx - n.x) * strength;
        f.y += (cy - n.y) * strength;
      }
    });
  }

  private updatePositions() {
    this.nodes.forEach((n) => {
      if (n.fx == null && n.fy == null) {
        const f = this.forces.get(n.id);
        if (f) {
          const mag = Math.hypot(f.x, f.y);
          if (mag > 0) {
            const step = Math.min(mag, this.temperature);
            n.x += (f.x / mag) * step;
            n.y += (f.y / mag) * step;
          }
        }
      }
    });
  }

  public run(): NodeDatum[] {
    for (let i = 0; i < this.iterations; i++) {
      this.calculateRepulsiveForces();
      this.calculateAttractiveForces();
      this.calculateCenteringForces();
      this.updatePositions();
      this.temperature *= this.coolingFactor;
    }
    return this.nodes;
  }
}
