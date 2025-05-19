import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import '../styles/NetworkVisualization.css';
import historicalData from '../data/historical-data.json';
import { FruchtermanReingold } from '../layouts/FruchtermanReingold';

// Node with optional fisheye display coordinates
interface NodeDatum extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  group: number;
  x: number;
  y: number;
  fx?: number | null;
  fy?: number | null;
  displayX?: number;
  displayY?: number;
}

interface LinkData {
  source: string;
  target: string;
  value: number;
}

export const NetworkVisualization: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const width = svgEl.clientWidth;
    const height = svgEl.clientHeight;
    const svg = d3.select(svgEl).attr('width', width).attr('height', height);
    svg.selectAll('*').remove();

    const g = svg.append('g');

    const zoomBehavior = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 10])
      .on('zoom', ({ transform }) => g.attr('transform', transform));
    svg.call(zoomBehavior);

    // initial nodes and links
    const nodes: NodeDatum[] = historicalData.vertices.map((v) => ({
      id: String(v.id),
      name: v.title,
      group: v.archetype,
      x: Math.random() * width,
      y: Math.random() * height,
    }));
    const links: LinkData[] = historicalData.edges.map((e) => ({
      source: String(e.from),
      target: String(e.to),
      value: 1,
    }));

    // draw links
    const linkSel = g
      .append('g')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('class', 'link')
      .attr('stroke-width', (d) => Math.sqrt(d.value));

    // draw nodes
    const nodeSel = g
      .append('g')
      .selectAll<SVGGElement, NodeDatum>('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .call(
        d3
          .drag<SVGGElement, NodeDatum>()
          .on('start', onDragStart)
          .on('drag', onDrag)
          .on('end', onDragEnd),
      );
    nodeSel
      .append('circle')
      .attr('r', 30)
      .attr('fill', (d) => d3.schemeCategory10[d.group % 10]);
    nodeSel
      .append('text')
      .text((d) => d.name)
      .attr('x', 8)
      .attr('y', 3);

    nodeSel
      .on('mouseover', (event, d) => {
        const ttEl = tooltipRef.current;
        if (!ttEl) return;
        d3.select(ttEl)
          .style('opacity', 1)
          .html(`<strong>${d.name}</strong><br/>Group: ${d.group}`)
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY - 28}px`);
      })
      .on('mouseout', () => {
        const ttEl = tooltipRef.current;
        if (ttEl) d3.select(ttEl).style('opacity', 0);
      });

    // run layout (returns original array mutated)
    const layout = new FruchtermanReingold(
      nodes,
      links
        .map((l) => {
          const s = nodes.find((n) => n.id === l.source);
          const t = nodes.find((n) => n.id === l.target);
          return s && t ? { source: s, target: t } : null;
        })
        .filter((x): x is { source: NodeDatum; target: NodeDatum } =>
          Boolean(x),
        ),
      {
        width,
        height,
        iterations: 100,
        temperature: width / 4,
        coolingFactor: 0.95,
      },
    );
    // cast to include displayX/displayY
    const positioned = layout.run() as NodeDatum[];

    // const fisheyeRadius = Math.min(width, height) / 3;
    // const fisheyeDistortion = 3;

    function applyFisheye(focus: NodeDatum) {
      return;
    }

    function updateDisplay() {
      linkSel
        .attr('x1', (d) => {
          const n = positioned.find((n) => n.id === d.source);
          return n ? (n.displayX ?? n.x) : 0;
        })
        .attr('y1', (d) => {
          const n = positioned.find((n) => n.id === d.source);
          return n ? (n.displayY ?? n.y) : 0;
        })
        .attr('x2', (d) => {
          const n = positioned.find((n) => n.id === d.target);
          return n ? (n.displayX ?? n.x) : 0;
        })
        .attr('y2', (d) => {
          const n = positioned.find((n) => n.id === d.target);
          return n ? (n.displayY ?? n.y) : 0;
        });
      nodeSel.attr('transform', (d) => {
        const n = positioned.find((n) => n.id === d.id);
        const x = n ? (n.displayX ?? n.x) : d.x;
        const y = n ? (n.displayY ?? n.y) : d.y;
        return `translate(${x},${y})`;
      });
    }

    nodeSel.on('click', (event, d) => {
      const current = d3.zoomTransform(svgEl);
      const scale = current.k;
      const tx = width / 2 - d.x * scale;
      const ty = height / 2 - d.y * scale;
      svg
        .transition()
        .duration(750)
        .call(
          zoomBehavior.transform,
          d3.zoomIdentity.translate(tx, ty).scale(scale),
        );
      applyFisheye(d);
    });

    updateDisplay();

    function onDragStart(
      event: d3.D3DragEvent<SVGGElement, NodeDatum, NodeDatum>,
    ) {
      const subject = event.subject;
      subject.fx = subject.x;
      subject.fy = subject.y;
    }
    function onDrag(event: d3.D3DragEvent<SVGGElement, NodeDatum, NodeDatum>) {
      const subject = event.subject;
      subject.fx = event.x;
      subject.fy = event.y;
      positioned.forEach((n) => {
        delete n.displayX;
        delete n.displayY;
      });
      updateDisplay();
    }
    function onDragEnd(
      event: d3.D3DragEvent<SVGElement, NodeDatum, NodeDatum>,
    ) {
      const subject = event.subject;
      subject.fx = null;
      subject.fy = null;
    }
  }, []);

  return (
    <div id="main-container">
      <div id="visualization-container">
        <svg id="visualization" ref={svgRef} />
      </div>
      <div id="tooltip" className="tooltip" ref={tooltipRef} />
    </div>
  );
};
