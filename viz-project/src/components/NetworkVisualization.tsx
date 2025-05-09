import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import '../styles/NetworkVisualization.css';
import historicalData from '../data/historical-data.json';

// SimulationNode je nadtrida patrici D3. Do nasi custom class Node muzeme dat co chceme.
// Datum je jejich ekvivalent ke slovu Data,
// jenž znamená že to jsou data co se moc nemění, proto jsou dobré k vizualizaci.
interface Node extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  group: number;
}

interface Link {
  source: string;
  target: string;
  value: number;
}

interface GraphData {
  nodes: Node[];
  links: Link[];
}

const NetworkVisualization: React.FC = () => {
  // Vizualizace se bude renderovat do tohoto SVG elementu.
  const svgRef = useRef<SVGSVGElement>(null);
  // Tooltip je ten dialog co se objevi pri najeti kurzorem na node.
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    // Clear any existing SVG content
    d3.select(svgRef.current).selectAll('*').remove();

    // Set up the SVG dimensions
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Create the SVG container
    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    // Create a group for the visualization
    const g = svg.append('g');

    // Set up the force simulation
    const simulation = d3
      .forceSimulation() // Podle mě odpovíá tomu layutování z toho jednoho krátkého premenu, co nám dodal cvičící. (spring force layouting).
      // https://drive.google.com/file/d/1UMwayZD2AVxDhui93asNkD-61OSJJidL/view?usp=sharing - strana 6
      .force(
        'link',
        d3
          .forceLink()
          .id((d: any) => d.id)
          .distance(100), // Nahradíme algoritmem z https://drive.google.com/file/d/1nSjlthV4vIbGfSwFVkhZKfrTNP68IaVb/view?usp=sharing
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2));

    // Transform the data into the correct format
    const nodes = historicalData.vertices.map((vertex) => ({
      id: vertex.id.toString(),
      name: vertex.title,
      group: vertex.archetype,
    }));

    const links = historicalData.edges.map((edge) => ({
      source: edge.from.toString(),
      target: edge.to.toString(),
      value: 1,
    }));

    const data: GraphData = { nodes, links };

    // Create the links
    const link = g
      .append('g')
      .selectAll('line')
      .data(data.links)
      .enter()
      .append('line')
      .attr('class', 'link')
      .attr('stroke-width', (d) => Math.sqrt(d.value));

    // Create the nodes
    const node = g
      .append('g')
      .selectAll('g')
      .data(data.nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .call(
        d3
          .drag<any, any>()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended),
      );

    // Add circles to nodes
    node
      .append('circle')
      .attr('r', 5) // Custom Radius kružnice se vytratil při importu do Reactu. Pak ho vrátím.
      .attr('fill', (d) => d3.schemeCategory10[d.group % 10]);

    // Add labels to nodes
    node
      .append('text')
      .text((d) => d.name)
      .attr('x', 8)
      .attr('y', 3);

    // Add tooltips
    node
      .on('mouseover', (event, d) => {
        if (!tooltipRef.current) return;
        const tooltip = d3.select(tooltipRef.current);
        tooltip
          .style('opacity', 1)
          .html(`<strong>${d.name}</strong><br/>Group: ${d.group}`)
          .style('left', event.pageX + 10 + 'px')
          .style('top', event.pageY - 28 + 'px');
      })
      .on('mouseout', () => {
        if (!tooltipRef.current) return;
        d3.select(tooltipRef.current).style('opacity', 0);
      });

    // Update the simulation
    simulation.nodes(data.nodes).on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    simulation.force<d3.ForceLink<any, any>>('link')?.links(data.links);

    // Drag functions
    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    // Cleanup function
    return () => {
      simulation.stop();
    };
  }, []);

  return (
    <div id="main-container">
      <div id="visualization-container">
        <svg id="visualization" ref={svgRef}></svg>
      </div>
      <div id="sidebar">{/* Future elements will go here */}</div>
      <div id="tooltip" className="tooltip" ref={tooltipRef}></div>
    </div>
  );
};

export default NetworkVisualization;
