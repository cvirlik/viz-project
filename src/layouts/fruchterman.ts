import { NodeData } from '../utils/data';

type Point = {
  x: number;
  y: number;
};

type Link = {
  source: NodeData;
  target: NodeData;
};

type Options = {
  width: number;
  height: number;
  iterations?: number;
  k?: number;
  temperature?: number;
  coolingFactor?: number;
};

export class FruchtermanReingold {
  private width: number;
  private height: number;
  private iterations: number;
  private k: number;
  private temperature: number;
  private coolingFactor: number;
  private nodes: NodeData[];
  private links: Link[];
  private forces = new Map<string, Point>();

  constructor(nodes: NodeData[], links: Link[], options: Options) {
    this.nodes = nodes;
    this.links = links;
    this.width = options.width;
    this.height = options.height;
    this.iterations = options.iterations ?? 50; // replaced by button now
    // k is optimal distance between nodes
    this.k = options.k ?? Math.sqrt((this.width * this.height) / this.nodes.length);
    // temperature control how much nodes can move
    this.temperature = options.temperature ?? this.width / 4;
    // cooling factor make movement slower over time
    this.coolingFactor = options.coolingFactor ?? 0.95;
  }

  // Calculate forces that push nodes away from each other
  private calculateRepulsiveForces() {
    this.forces.clear();
    this.nodes.forEach(n => this.forces.set(n.id, { x: 0, y: 0 }));
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const a = this.nodes[i],
          b = this.nodes[j];
        const dx = b.x - a.x,
          dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);
        if (dist === 0) continue;
        // Force is stronger when nodes are closer
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

  // Calculate forces that pull connected nodes together
  private calculateAttractiveForces() {
    this.links.forEach(link => {
      const dx = link.target.x - link.source.x;
      const dy = link.target.y - link.source.y;
      const dist = Math.hypot(dx, dy);
      if (dist === 0) return;
      // Force is stronger when nodes are further
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

  // Add force that pull all nodes to center of screen
  private calculateCenteringForces(strength = 0.1) {
    const cx = this.width / 2,
      cy = this.height / 2;
    this.nodes.forEach(n => {
      const f = this.forces.get(n.id);
      if (f) {
        f.x += (cx - n.x) * strength;
        f.y += (cy - n.y) * strength;
      }
    });
  }

  // Update position of nodes based on calculated forces
  private updatePositions() {
    this.nodes.forEach(n => {
      if (n.fx == null && n.fy == null) {
        const f = this.forces.get(n.id);
        if (f) {
          const mag = Math.hypot(f.x, f.y);
          if (mag > 0) {
            // Limit movement by temperature
            const step = Math.min(mag, this.temperature);
            n.x += (f.x / mag) * step;
            n.y += (f.y / mag) * step;
          }
        }
      }
    });
  }

  // Do one step of layout calculation
  public step(): void {
    this.calculateRepulsiveForces();
    this.calculateAttractiveForces();
    this.calculateCenteringForces();
    this.updatePositions();
    // Make temperature smaller for next step
    this.temperature *= this.coolingFactor;
  }

  // Run layout for all iterations and return final positions
  public run(): NodeData[] {
    for (let i = 0; i < this.iterations; i++) {
      this.step();
    }
    return this.nodes;
  }
}
