import * as d3 from 'd3';

export const initSvg = (root: SVGSVGElement) => {
  const svg = d3.select(root).attr('width', root.clientWidth).attr('height', root.clientHeight);
  svg.selectAll('*').remove();

  const g = svg.append('g');

  const zoomBehavior = d3
    .zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.1, 10])
    .on('zoom', ({ transform }) => g.attr('transform', transform));
  svg.call(zoomBehavior);

  return {
    zoomBehavior,
    svg,
    g,
    width: root.clientWidth,
    height: root.clientHeight,
  };
};
