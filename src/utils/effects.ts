import * as d3 from 'd3';
import { EdgeController, LinkController, NodeController } from './d3-controllers';
import { NodeData } from './data';

export const hideNonAdjacent = (
  nodes: NodeData[],
  neighborMap: Map<string, Set<string>>,
  nodeController: NodeController,
  linkController: LinkController,
  edgeController: EdgeController
) => {
  const adjacent = new Set();
  for (const node of nodes) {
    const adj = neighborMap.get(node.id);
    if (adj) {
      adj.forEach(id => adjacent.add(id));
    }
    adjacent.add(node.id);
  }

  const LIGHT_OPACITY = 0.3;

  nodeController.style('opacity', nd => (adjacent.has(nd.id) ? 1 : LIGHT_OPACITY));
  linkController.style('opacity', lk =>
    adjacent.has(lk.source) && adjacent.has(lk.target) ? 1 : LIGHT_OPACITY
  );
  edgeController.style('opacity', el =>
    adjacent.has(el.source) && adjacent.has(el.target) ? 1 : LIGHT_OPACITY
  );
};

export const showNonAdjacent = (
  nodeController: NodeController,
  linkController: LinkController,
  edgeController: EdgeController
) => {
  nodeController.style('opacity', 1);
  linkController.style('opacity', 1);
  edgeController.style('opacity', 1);
};

export const makeGradient = (
  id: string,
  from: NodeData,
  to: NodeData,
  defs: d3.Selection<SVGDefsElement, unknown, null, undefined>,
  controller: d3.Selection<SVGLineElement, unknown, null, undefined>
) => {
  const grad = defs
    .append('linearGradient')
    .attr('id', id)
    .attr('gradientUnits', 'userSpaceOnUse')
    .attr('x1', from.x)
    .attr('y1', from.y)
    .attr('x2', to.x)
    .attr('y2', to.y);
  grad
    .append('stop')
    .attr('offset', '0%')
    .attr('stop-color', d3.schemeCategory10[from.group % 10])
    .attr('stop-opacity', 0);
  grad
    .append('stop')
    .attr('offset', '100%')
    .attr('stop-color', d3.schemeCategory10[to.group % 10])
    .attr('stop-opacity', 1);
  controller.attr('stroke', `url(#${id})`).attr('stroke-width', 10).attr('stroke-opacity', 1);
};
