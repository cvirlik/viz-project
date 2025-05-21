import { NodeData } from '../utils/data';

type Point = { x: number; y: number };
type Link = { source: NodeData; target: NodeData };

type Options = {
  width: number;
  height: number;
  iterations?: number;
  k?: number;
  temperature?: number;
  coolingFactor?: number;
  rootRepulsion?: number;
  isoRepulsion?: number;
};

export class FruchtermanReingold {
  private w: number;
  private h: number;
  private iters: number;
  private k: number;
  private T: number;
  private cool: number;
  private nodes: NodeData[];
  private links: Link[];
  private F = new Map<string, Point>();

  private activeRoots = new Set<string>();
  private loneRoots = new Set<string>();
  private rootPush: number;
  private isoPush: number;

  constructor(nodes: NodeData[], links: Link[], o: Options) {
    this.nodes = nodes;
    this.links = links;
    this.w = o.width;
    this.h = o.height;
    this.iters = o.iterations ?? 50;
    this.k = o.k ?? Math.sqrt((this.w * this.h) / nodes.length);
    this.T = o.temperature ?? this.w / 4;
    this.cool = o.coolingFactor ?? 0.95;
    this.rootPush = o.rootRepulsion ?? 4;
    this.isoPush = o.isoRepulsion ?? 0; // ← “don’t touch” isolated roots

    /* classify nodes -------------------------------------------------------- */
    const targets = new Set(links.map(l => l.target.id));
    const deg = new Map<string, number>();
    links.forEach(l => {
      deg.set(l.source.id, (deg.get(l.source.id) ?? 0) + 1);
      deg.set(l.target.id, (deg.get(l.target.id) ?? 0) + 1);
    });

    nodes.forEach(n => {
      if (!targets.has(n.id)) {
        const d = deg.get(n.id) ?? 0;
        (d === 0 ? this.loneRoots : this.activeRoots).add(n.id);
      }
    });
  }

  /* forces ------------------------------------------------------------------ */
  private repulsive() {
    this.F.clear();
    this.nodes.forEach(n => this.F.set(n.id, { x: 0, y: 0 }));

    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const a = this.nodes[i],
          b = this.nodes[j];
        const dx = b.x - a.x,
          dy = b.y - a.y,
          d = Math.hypot(dx, dy) || 1e-6;

        let mult = 1; // normal pair
        if (this.activeRoots.has(a.id) && this.activeRoots.has(b.id))
          mult = this.rootPush; // root-root (children)
        else if (this.loneRoots.has(a.id) || this.loneRoots.has(b.id)) mult = this.isoPush; // isolated root involved

        const f = ((this.k * this.k) / d) * mult;
        const fx = (dx / d) * f,
          fy = (dy / d) * f;
        this.F.get(a.id)!.x -= fx;
        this.F.get(a.id)!.y -= fy;
        this.F.get(b.id)!.x += fx;
        this.F.get(b.id)!.y += fy;
      }
    }
  }

  private attractive() {
    this.links.forEach(l => {
      const dx = l.target.x - l.source.x,
        dy = l.target.y - l.source.y;
      const d = Math.hypot(dx, dy) || 1e-6;
      const f = (d * d) / this.k;
      const fx = (dx / d) * f,
        fy = (dy / d) * f;
      this.F.get(l.source.id)!.x += fx;
      this.F.get(l.source.id)!.y += fy;
      this.F.get(l.target.id)!.x -= fx;
      this.F.get(l.target.id)!.y -= fy;
    });
  }

  private center(str = 0.1) {
    const cx = this.w / 2,
      cy = this.h / 2;
    this.nodes.forEach(n => {
      const f = this.F.get(n.id)!;
      f.x += (cx - n.x) * str;
      f.y += (cy - n.y) * str;
    });
  }

  private move() {
    this.nodes.forEach(n => {
      if (n.fx != null || n.fy != null) return;
      const f = this.F.get(n.id)!;
      const m = Math.hypot(f.x, f.y);
      if (!m) return;
      const step = Math.min(m, this.T);
      n.x += (f.x / m) * step;
      n.y += (f.y / m) * step;
    });
  }

  /* API --------------------------------------------------------------------- */
  public step() {
    this.repulsive();
    this.attractive();
    this.center();
    this.move();
    this.T *= this.cool;
  }

  public run(): NodeData[] {
    for (let i = 0; i < this.iters; i++) this.step();
    return this.nodes;
  }
}
