import * as d3 from 'd3';
import { NodeData, LinkData, rawData } from './data';
import { extractInitials } from './string';
import { calculateNodeRadius, hexToHSL, hslToHex } from './visual';

export type SvgController = d3.Selection<SVGGElement, unknown, null, undefined>;
export type NodeController = d3.Selection<SVGGElement, NodeData, SVGGElement, unknown>;
export type EdgeController = d3.Selection<SVGGElement, LinkData, SVGGElement, unknown>;
export type LinkController = d3.Selection<SVGLineElement, LinkData, SVGGElement, unknown>;

const makeEdgeLabels = (g: SvgController, linkController: LinkController, links: LinkData[]) => {
  const edgeController = g
    .append('g')
    .selectAll<SVGGElement, LinkData>('g.edge-label-group')
    .data(links)
    .enter()
    .append('g')
    .attr('class', 'edge-label-group')
    .style('opacity', 0); // Initially hidden

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
      return attributes?.['3'] ?? (attributes ? attributes[Object.keys(attributes)[0]] : '');
    });

  // Show labels on hover
  linkController
    .on('mouseover', function (_, link) {
      console.log(link);
      edgeController.filter(d => d === link).style('opacity', 1); // Show the label
    })
    .on('mouseout', function (_, link) {
      edgeController.filter(d => d === link).style('opacity', 0); // Hide the label
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

  const edgeController = makeEdgeLabels(g, linkController, links);

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
    .attr('opacity', 1);

  nodeController
    .append('text')
    .text(node => `${extractInitials(node.name)}`) // (${(node.doi || 0).toFixed(2)})
    .attr('x', 0)
    .attr('y', 0)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .attr('opacity', 1)
    .style('font-size', '15px')
    .attr('font-weight', 'bold')
    .attr('fill', 'white');
};
