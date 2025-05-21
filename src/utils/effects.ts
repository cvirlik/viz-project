import * as d3 from 'd3';
import { NodeData } from './data';

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
