/**
 * Implementation of the Fruchterman-Reingold force-directed layout algorithm
 * Based on the paper: "Graph Drawing by Force-directed Placement"
 * Authors: Thomas M. J. Fruchterman and Edward M. Reingold
 *
 * This algorithm positions nodes in a graph using a force-directed approach,
 * where nodes repel each other and edges act as springs pulling connected nodes together.
 */

interface Point {
  x: number;
  y: number;
}

interface Node extends Point {
  id: string;
  fx?: number | null;
  fy?: number | null;
}

interface Link {
  source: Node;
  target: Node;
}

interface FruchtermanReingoldOptions {
  width: number;
  height: number;
  iterations?: number;
  k?: number; // Optimal distance between nodes
  temperature?: number; // Initial temperature for simulated annealing
  coolingFactor?: number; // Factor to reduce temperature each iteration
}

export class FruchtermanReingold {
  private width: number;
  private height: number;
  private iterations: number;
  private k: number;
  private temperature: number;
  private coolingFactor: number;
  private nodes: Node[];
  private links: Link[];
  private forces: Map<string, Point>;

  constructor(
    nodes: Node[],
    links: Link[],
    options: FruchtermanReingoldOptions,
  ) {
    this.nodes = nodes;
    this.links = links;
    this.width = options.width;
    this.height = options.height;
    this.iterations = options.iterations || 50;
    this.k =
      options.k || Math.sqrt((this.width * this.height) / this.nodes.length);
    this.temperature = options.temperature || this.width / 4;
    this.coolingFactor = options.coolingFactor || 0.95;
    this.forces = new Map();
  }

  /**
   * Calculate repulsive forces between all pairs of nodes
   * F_rep = k^2 / d
   */
  private calculateRepulsiveForces(): void {
    this.forces.clear();
    this.nodes.forEach((node) => {
      this.forces.set(node.id, { x: 0, y: 0 });
    });

    for (let i = 0; i < this.nodes.length; i++) {
      const node1 = this.nodes[i];
      for (let j = i + 1; j < this.nodes.length; j++) {
        const node2 = this.nodes[j];
        const dx = node2.x - node1.x;
        const dy = node2.y - node1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) {
          const force = (this.k * this.k) / distance;
          const forceX = (dx / distance) * force;
          const forceY = (dy / distance) * force;

          const force1 = this.forces.get(node1.id)!;
          const force2 = this.forces.get(node2.id)!;

          force1.x -= forceX;
          force1.y -= forceY;
          force2.x += forceX;
          force2.y += forceY;
        }
      }
    }
  }

  /**
   * Calculate attractive forces along edges
   * F_att = d^2 / k
   */
  private calculateAttractiveForces(): void {
    this.links.forEach((link) => {
      const dx = link.target.x - link.source.x;
      const dy = link.target.y - link.source.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 0) {
        const force = (distance * distance) / this.k;
        const forceX = (dx / distance) * force;
        const forceY = (dy / distance) * force;

        const forceSource = this.forces.get(link.source.id)!;
        const forceTarget = this.forces.get(link.target.id)!;

        forceSource.x += forceX;
        forceSource.y += forceY;
        forceTarget.x -= forceX;
        forceTarget.y -= forceY;
      }
    });
  }

  /**
   * Update node positions based on calculated forces
   */
  private updatePositions(): void {
    this.nodes.forEach((node) => {
      if (node.fx === undefined || node.fy === undefined) {
        const force = this.forces.get(node.id)!;
        const forceMagnitude = Math.sqrt(force.x * force.x + force.y * force.y);

        if (forceMagnitude > 0) {
          node.x +=
            (force.x / forceMagnitude) *
            Math.min(forceMagnitude, this.temperature);
          node.y +=
            (force.y / forceMagnitude) *
            Math.min(forceMagnitude, this.temperature);
        }

        // Keep nodes within bounds
        node.x = Math.max(0, Math.min(this.width, node.x));
        node.y = Math.max(0, Math.min(this.height, node.y));
      }
    });
  }

  /**
   * Run the force-directed layout algorithm
   * @returns The updated nodes with new positions
   */
  public run(): Node[] {
    for (let i = 0; i < this.iterations; i++) {
      this.calculateRepulsiveForces();
      this.calculateAttractiveForces();
      this.updatePositions();
      this.temperature *= this.coolingFactor;
    }
    return this.nodes;
  }
}
