import * as d3 from 'd3';
import { NodeData, LinkData, rawData } from './data';
import { extractInitials } from './string';
import { calculateNodeRadius, hexToHSL, hslToHex } from './visual';

export type SvgController = d3.Selection<SVGGElement, unknown, null, undefined>;
export type NodeController = d3.Selection<SVGGElement, NodeData, SVGGElement, unknown>;
export type EdgeController = d3.Selection<SVGGElement, LinkData, SVGGElement, unknown>;
export type LinkController = d3.Selection<SVGLineElement, LinkData, SVGGElement, unknown>;

const makeEdgeLabels = (g: SvgController, links: LinkData[]) => {
  const edgeController = g
    .append('g')
    .selectAll<SVGGElement, LinkData>('g.edge-label-group')
    .data(links)
    .enter()
    .append('g')
    .attr('class', 'edge-label-group');

  edgeController.append('rect').attr('class', 'edge-label-bg').attr('fill', 'white');

  edgeController
    .append('text')
    .attr('class', 'edge-label')
    .attr('text-anchor', 'middle')
    .attr('alignment-baseline', 'middle')
    .text(link => {
      const edge = rawData.edges.find(
        edge => String(edge.from) === link.source && String(edge.to) === link.target
      );
      const attributes = edge?.attributes as Record<string, string> | undefined;
      // Get the first attribute value if it exists
      return attributes ? Object.values(attributes)[0] || '' : '';
    });

  return edgeController;
};

export const makeControllers = (g: SvgController, links: LinkData[], nodes: NodeData[]) => {
  const linkController = g
    .append('g')
    .selectAll('line')
    .data(links)
    .enter()
    .append('line')
    .attr('class', 'link')
    .attr('stroke-width', link => Math.sqrt(link.value))
    .attr('stroke', '#999');

  const nodeController = g
    .append('g')
    .selectAll<SVGGElement, NodeData>('g')
    .data(nodes)
    .enter()
    .append('g')
    .attr('class', 'node');

  // Edge labels are currently disabled
  // const edgeController = makeEdgeLabels(g, links);
  const edgeController = g
    .append('g')
    .selectAll<SVGGElement, LinkData>('g.edge-label-group')
    .data(links)
    .enter()
    .append('g')
    .attr('class', 'edge-label-group');

  return { linkController, nodeController, edgeController };
};

export const makeNodes = (nodeController: NodeController, nodes: NodeData[]) => {
  nodeController
    .append('circle')
    .attr('r', node => calculateNodeRadius(node, nodes))
    .attr('fill', node => {
      const baseColor = d3.schemeCategory10[node.group % 10];
      const { h, s } = hexToHSL(baseColor);
      const l = 90 - (node.doi || 0) * 60; // Scale DOI from 90% to 30% lightness
      return hslToHex(h, s, l);
    })
    .attr('opacity', 1)
    .style('filter', 'drop-shadow(0px 0px 0px rgba(0,0,0,0))') // Initial state: no shadow
    .style('transition', 'filter 0.2s ease-in-out') // Smooth transition for shadow
    .on('mouseover', function () {
      d3.select(this).style('filter', 'drop-shadow(0px 0px 8px rgba(0,0,0,0.3))'); // Add shadow on hover
    })
    .on('mouseout', function () {
      d3.select(this).style('filter', 'drop-shadow(0px 0px 0px rgba(0,0,0,0))'); // Remove shadow
    });

  nodeController
    .append('text')
    .text(node => extractInitials(node.name))
    .attr('x', 0)
    .attr('y', 0)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .attr('opacity', 1)
    .style('font-size', '15px')
    .attr('font-weight', 'bold')
    .attr('fill', 'white');
};
