import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { FruchtermanReingold } from '../layouts/fruchterman';
import { hexToHSL, hslToHex } from '../utils/visual';
import { calculateDOI } from '../utils/doi-calculator';
import { LinkData, NodeData, parseData } from '../utils/data';
import { makeControllers, makeNodes, NodeController } from '../utils/d3-controllers';
import { initSvg } from '../utils/svg';
import { makeGradient } from '../utils/effects';
import { Sidebar } from './Sidebar';
import { DOIProvider, useDOI } from '../providers/doi';
import { generateTooltipContent } from '../utils/tooltip';

const Body: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown>>();

  const { searchQuery, dateRange, selectedArchetypes } = useDOI();

  const [positioned, setPositioned] = useState<NodeData[]>([]);
  const [focusNode, setFocusNode] = useState<NodeData | undefined>(undefined);

  const layoutRef = useRef<FruchtermanReingold | null>(null);
  const updateDisplayRef = useRef<() => void>();
  const intervalRef = useRef<number>();
  const [isRunning, setIsRunning] = useState(false);

  const setSelected = (selected: NodeData | string) => {
    const svgEl = svgRef.current;
    if (!svgEl || !zoomBehaviorRef.current) return;

    const svg = d3.select(svgEl);

    const width = svgEl.clientWidth;
    const height = svgEl.clientHeight;
    const data =
      typeof selected === 'string' ? positioned.find(node => node.id === selected) : selected;
    if (!data) return;

    const current = d3.zoomTransform(svgEl);
    const scale = current.k > 0.8 ? current.k : 0.8;
    const tx = width / 2 - data.x * scale;
    const ty = height / 2 - data.y * scale;
    svg
      .transition()
      .duration(750)
      .call(zoomBehaviorRef.current.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));

    const selectedId = typeof selected === 'string' ? selected : selected.id;

    const g = d3.select(svgEl).select('g');
    const nodeController = g.selectAll<SVGGElement, NodeData>('g.node');
    nodeController
      .selectAll<SVGCircleElement, NodeData>('circle')
      .attr('stroke', d => (d.id === selectedId ? 'black' : 'none'))
      .attr('stroke-width', d => (d.id === selectedId ? 2 : 0));

    nodeController.filter(d => d.id === selectedId).raise();
  };

  useEffect(() => {
    const root = svgRef.current;
    if (!root) return;

    const { zoomBehavior, g, width, height, svg } = initSvg(root);
    zoomBehaviorRef.current = zoomBehavior;

    // Add click handler for the SVG container to clear focus
    svg.on('click', event => {
      // Check if the click was directly on the SVG background
      if (event.target === svg.node()) {
        if (tooltipRef.current) {
          d3.select(tooltipRef.current).style('opacity', 0);
        }
        setFocusNode(undefined);
      }
    });

    const { nodes, links, neighborMap } = parseData(width, height);

    for (const node of nodes) {
      node.degree = neighborMap.get(node.id)?.size ?? 0;
    }

    const { nodeController, linkController, edgeController } = makeControllers(g, links, nodes);

    // Calculate initial DOI for each node
    const doiParams = {
      searchQuery,
      selectedArchetypes,
      dateRange,
      focusNode,
    };

    for (const node of nodes) {
      node.doi = calculateDOI(node, nodes, doiParams);
    }

    makeNodes(nodeController, nodes);

    const getNode = (id: string) => {
      return nodes.find(node => node.id === id);
    };

    const getEndNodes = (line: LinkData) => {
      return {
        s: nodes.find(node => node.id === line.source),
        t: nodes.find(node => node.id === line.target),
      };
    };

    const getLinkAction = (link: LinkData) => {
      const transform = d3.zoomTransform(root);

      const source = getNode(link.source);
      const target = getNode(link.target);

      if (!source || !target) return { from: undefined, to: undefined };

      // screen coords of source
      const [sx, sy] = transform.apply([source.x, source.y]);
      const sd = Math.hypot(width / 2 - sx, height / 2 - sy);

      // screen coords of target
      const [tx, ty] = transform.apply([target.x, target.y]);
      const td = Math.hypot(width / 2 - tx, height / 2 - ty);

      return {
        from: sd > td ? target : source,
        to: sd > td ? source : target,
      };
    };

    // run layout (returns original array mutated)
    const layout = new FruchtermanReingold(
      nodes,
      links
        .map(l => {
          const { s, t } = getEndNodes(l);
          return s && t ? { source: s, target: t } : null;
        })
        .filter((x): x is { source: NodeData; target: NodeData } => Boolean(x)),
      {
        width,
        height,
        k: 150,
        iterations: 1,
        temperature: width / 4,
        coolingFactor: 0.95,
        isoRepulsion: 0.03,
      }
    );
    layoutRef.current = layout;
    const positioned = layout.run() as NodeData[];
    setPositioned(positioned);

    function updateDisplay() {
      linkController
        .attr('x1', d => {
          const n = positioned.find(n => n.id === d.source);
          return n ? n.x : 0;
        })
        .attr('y1', d => {
          const n = positioned.find(n => n.id === d.source);
          return n ? n.y : 0;
        })
        .attr('x2', d => {
          const n = positioned.find(n => n.id === d.target);
          return n ? n.x : 0;
        })
        .attr('y2', d => {
          const n = positioned.find(n => n.id === d.target);
          return n ? n.y : 0;
        });

      edgeController.attr('transform', d => {
        const { s, t } = getEndNodes(d);
        const sx = s ? s.x : 0;
        const sy = s ? s.y : 0;
        const tx = t ? t.x : 0;
        const ty = t ? t.y : 0;
        return `translate(${(sx + tx) / 2},${(sy + ty) / 2})`;
      });

      edgeController.each(function () {
        const grp = d3.select(this);
        const txt = grp.select<SVGTextElement>('text').node() as SVGTextElement;
        const bb = txt.getBBox();
        grp
          .select('rect')
          .attr('x', bb.x - 2)
          .attr('y', bb.y - 1)
          .attr('width', bb.width + 4)
          .attr('height', bb.height + 2);
      });

      nodeController.attr('transform', d => {
        const n = positioned.find(n => n.id === d.id);
        return n ? `translate(${n.x},${n.y})` : 'translate(0,0)';
      });

      nodeController.raise();
    }
    updateDisplayRef.current = updateDisplay;
    updateDisplay();

    // Add event handlers
    nodeController
      .on('mouseover', (event, node) => {
        setFocusNode(node);
      })
      .on('mouseout', () => {
        setFocusNode(undefined);
      })
      .on('click', function (_, node) {
        const ttEl = tooltipRef.current;
        const container = document.getElementById('visualization-container');
        if (ttEl && container) {
          const containerRect = container.getBoundingClientRect();
          d3.select(ttEl)
            .style('opacity', 1)
            .html(generateTooltipContent(node))
            .style('left', `${containerRect.right - 400}px`)
            .style('top', `${containerRect.top + 20}px`)
            .style('right', 'auto');
        }
        setSelected(node);
      });

    // Add click handler for tooltip close button
    if (tooltipRef.current) {
      tooltipRef.current.addEventListener('click', e => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('tooltip-close')) {
          if (tooltipRef.current) {
            d3.select(tooltipRef.current).style('opacity', 0);
          }
          setFocusNode(undefined);
        }
      });
    }

    const defs = svg.append('defs');
    linkController
      .on('click', (_, d) => {
        const { to: next } = getLinkAction(d);
        if (!next) return;
        setSelected(next);
      })
      .on('mouseover', function (_, link) {
        edgeController.filter(d => d === link).style('opacity', 1);
        const gradId = link.gradientId;
        defs.select(`#${gradId}`).remove();

        const { from, to } = getLinkAction(link);
        if (!from || !to) return;

        makeGradient(gradId, from, to, defs, d3.select(this as SVGLineElement));
      })
      .on('mouseout', function (_, link) {
        edgeController.filter(d => d === link).style('opacity', 0);
        const controller = d3.select(this);
        defs.select(`#${link.gradientId}`).remove();
        controller
          .attr('stroke', '#999')
          .attr('stroke-width', Math.sqrt(link.value))
          .attr('stroke-opacity', 0.6);
      });

    return () => clearInterval(intervalRef.current);

    // Run only once for initial layout
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Separate useEffect for color updates
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl || !positioned.length) return;

    const g = d3.select(svgEl).select('g');
    const nodeController = g.selectAll<SVGGElement, NodeData>('g.node');

    const doiParams = {
      searchQuery,
      selectedArchetypes,
      dateRange,
      focusNode,
    };

    positioned.forEach(node => {
      node.doi = calculateDOI(node, positioned, doiParams);
    });

    // Update colors and sort nodes by DOI
    const sortedNodes = [...positioned].sort((a, b) => (a.doi || 0) - (b.doi || 0));

    // Reorder nodes in the DOM based on DOI
    nodeController.data(sortedNodes, d => d.id).order();

    nodeController.selectAll<SVGCircleElement, NodeData>('circle').attr('fill', d => {
      const baseColor = d3.schemeCategory10[d.group % 10];
      const { h, s } = hexToHSL(baseColor);
      // 100 je základ lightnes, druhým koeficientem se volí rozsah
      const l = 100 - (d.doi || 0) * 70;
      return hslToHex(h, s, l);
    });

    // Update z-index based on DOI
    nodeController.attr('style', d => {
      const doi = d.doi || 0;
      return `z-index: ${Math.floor(doi * 100)};`;
    });
  }, [searchQuery, selectedArchetypes, dateRange, positioned, focusNode]); // Add focusNode to dependencies

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = window.setInterval(() => {
        if (layoutRef.current && updateDisplayRef.current) {
          layoutRef.current.step();
          updateDisplayRef.current();
        }
      }, 50);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning]);

  return (
    <div id="main-container">
      <div id="visualization-container">
        <svg id="visualization" ref={svgRef} />
      </div>
      <Sidebar isRunning={isRunning} setIsRunning={setIsRunning} setSelected={setSelected} />
      <div id="tooltip" className="tooltip" ref={tooltipRef}></div>
    </div>
  );
};

export const NetworkVisualization: React.FC = () => (
  <DOIProvider>
    <Body />
  </DOIProvider>
);
