import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import '../styles/NetworkVisualization.css';
import '../styles/SearchBar.css';
import historicalData from '../data/historical-data.json';
import { FruchtermanReingold } from '../layouts/FruchtermanReingold';
import SearchResults from './SearchResults';

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
  const [searchQuery, setSearchQuery] = useState('');

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

    // Transform the data into the correct format
    const nodes = historicalData.vertices.map((vertex) => ({
      id: vertex.id.toString(),
      name: vertex.title,
      group: vertex.archetype,
      x: Math.random() * width, // Initial random positions
      y: Math.random() * height,
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
      .attr('r', 30)
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

    // Initialize Fruchterman-Reingold layout
    const layout = new FruchtermanReingold(
      nodes,
      links.map((link) => ({
        source: nodes.find((n) => n.id === link.source)!,
        target: nodes.find((n) => n.id === link.target)!,
      })),
      {
        width,
        height,
        iterations: 100,
        temperature: width / 4,
        coolingFactor: 0.95,
      },
    );

    // Run the layout algorithm
    const updatedNodes = layout.run();

    // Update the visualization with the new positions
    function updatePositions() {
      link
        .attr('x1', (d: any) => {
          const source = updatedNodes.find((n) => n.id === d.source);
          return source?.x || 0;
        })
        .attr('y1', (d: any) => {
          const source = updatedNodes.find((n) => n.id === d.source);
          return source?.y || 0;
        })
        .attr('x2', (d: any) => {
          const target = updatedNodes.find((n) => n.id === d.target);
          return target?.x || 0;
        })
        .attr('y2', (d: any) => {
          const target = updatedNodes.find((n) => n.id === d.target);
          return target?.y || 0;
        });

      node.attr('transform', (d: any) => {
        const node = updatedNodes.find((n) => n.id === d.id);
        return `translate(${node?.x || 0},${node?.y || 0})`;
      });
    }

    // Initial position update
    updatePositions();

    // Drag functions
    function dragstarted(event: any) {
      const node = updatedNodes.find((n) => n.id === event.subject.id);
      if (node) {
        node.fx = node.x;
        node.fy = node.y;
      }
    }

    function dragged(event: any) {
      const node = updatedNodes.find((n) => n.id === event.subject.id);
      if (node) {
        node.fx = event.x;
        node.fy = event.y;
        updatePositions();
      }
    }

    function dragended(event: any) {
      const node = updatedNodes.find((n) => n.id === event.subject.id);
      if (node) {
        node.fx = null;
        node.fy = null;
      }
    }
  });

  const handleResultClick = (nodeId: string) => {
    throw new Error(
      'Funkce onclick zatím není implementována NetworkVisualization.tsx - řádek 202 (přibližně)\n\n',
    );
  };

  return (
    <div id="main-container">
      <div id="visualization-container">
        {/* D3 vizualizace */}
        <svg id="visualization" ref={svgRef}></svg>
      </div>
      {/* Pravy sidebar s vyhledavanim */}
      <div id="sidebar">
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="Vyhledávat v záznamech.."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {/* Dekorace */}
          <svg
            className="search-icon"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <SearchResults
          searchQuery={searchQuery}
          onResultClick={handleResultClick}
        />
      </div>
      {/* Tooltip k Node */}
      <div id="tooltip" className="tooltip" ref={tooltipRef}></div>
    </div>
  );
};

export default NetworkVisualization;
