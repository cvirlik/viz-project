import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { FruchtermanReingold } from '../layouts/fruchterman';
import SearchResults from './SearchResults';
import { DateRangeSlider } from './DateRangeSlider';
import { calculateNodeRadius, hexToHSL, hslToHex } from '../utils/visual';
import ArchetypeFilter from './ArchetypeFilter';
import { calculateDOI } from '../utils/doi-calculator';
import { LinkData, NodeData, parseData, rawData } from '../utils/data';
import { makeControllers, makeNodes } from '../utils/d3-controllers';
import { initSvg } from '../utils/svg';
import { hideNonAdjacent, showNonAdjacent } from '../utils/effects';

export const NetworkVisualization: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown>>();

  const [searchQuery, setSearchQuery] = useState('');
  const [positioned, setPositioned] = useState<NodeData[]>([]);
  const [focusNode, setFocusNode] = useState<NodeData | undefined>(undefined);
  const [dateRange, setDateRange] = useState<{ min: number; max: number }>({
    min: new Date('1910-01-01').getTime(),
    max: new Date('2024-01-01').getTime(),
  });
  const [selectedArchetypes, setSelectedArchetypes] = useState<number[]>(
    rawData.vertexArchetypes.map((_, index) => index)
  );

  const layoutRef = useRef<FruchtermanReingold | null>(null);
  const updateDisplayRef = useRef<() => void>();
  const intervalRef = useRef<number>();
  const [isRunning, setIsRunning] = useState(false);

  const handleSearchChange: React.ChangeEventHandler<HTMLInputElement> = event =>
    setSearchQuery(event.target.value);

  const handleArchetypeChange = (newArchetypes: number[]) => {
    setSelectedArchetypes(newArchetypes);
  };

  const handleDateRangeChange = (minDate: number, maxDate: number) => {
    setDateRange({ min: minDate, max: maxDate });
  };

  const switchSelected = (selected: NodeData | string) => {
    const svgEl = svgRef.current;
    if (!svgEl || !zoomBehaviorRef.current) return;

    const svg = d3.select(svgEl);

    const width = svgEl.clientWidth;
    const height = svgEl.clientHeight;
    const datum =
      typeof selected === 'string' ? positioned.find(node => node.id === selected) : selected;
    if (!datum) return;

    const current = d3.zoomTransform(svgEl);
    const scale = current.k;
    const tx = width / 2 - datum.x * scale;
    const ty = height / 2 - datum.y * scale;
    svg
      .transition()
      .duration(750)
      .call(zoomBehaviorRef.current.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
  };

  useEffect(() => {
    const root = svgRef.current;
    if (!root) return;

    const { zoomBehavior, g, width, height, svg } = initSvg(root);
    zoomBehaviorRef.current = zoomBehavior;

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
        iterations: 1,
        temperature: width / 4,
        coolingFactor: 0.95,
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
    }
    updateDisplayRef.current = updateDisplay;
    updateDisplay();

    // Add event handlers
    nodeController
      .on('mouseover', (event, d) => {
        const ttEl = tooltipRef.current;
        if (ttEl) {
          d3.select(ttEl)
            .style('opacity', 1)
            .html(`<strong>${d.name}</strong><br/>Group: ${d.group}`)
            .style('left', `${event.pageX + 10}px`)
            .style('top', `${event.pageY - 28}px`);
        }
        setFocusNode(d); // TODO: Later maybe change to click
        hideNonAdjacent([d], neighborMap, nodeController, linkController, edgeController);
      })
      .on('mouseout', () => {
        if (tooltipRef.current) d3.select(tooltipRef.current).style('opacity', 0);
        setFocusNode(undefined);
        showNonAdjacent(nodeController, linkController, edgeController);
      })
      .on('click', (event, d) => {
        switchSelected(d);
      });

    const defs = svg.append('defs');
    linkController
      .on('click', (_, d) => {
        const { to: next } = getLinkAction(d);
        switchSelected(next as NodeData);
      })
      .on('mouseover', function (_, link) {
        const controller = d3.select(this as SVGLineElement);
        const gradId = link.gradientId;
        defs.select(`#${gradId}`).remove();

        const { from, to } = getLinkAction(link);
        if (!from || !to) return;

        const grad = defs
          .append('linearGradient')
          .attr('id', gradId)
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
        controller
          .attr('stroke', `url(#${gradId})`)
          .attr('stroke-width', 10)
          .attr('stroke-opacity', 1);

        const { s, t } = getEndNodes(link);
        if (s && t)
          hideNonAdjacent([s, t], neighborMap, nodeController, linkController, edgeController);
      })
      .on('mouseout', function (_, link) {
        const controller = d3.select(this);
        defs.select(`#${link.gradientId}`).remove();
        controller
          .attr('stroke', '#999')
          .attr('stroke-width', Math.sqrt(link.value))
          .attr('stroke-opacity', 0.6);
        showNonAdjacent(nodeController, linkController, edgeController);
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

    // Update colors
    nodeController.selectAll<SVGCircleElement, NodeData>('circle').attr('fill', d => {
      const baseColor = d3.schemeCategory10[d.group % 10];
      const { h, s } = hexToHSL(baseColor);
      const l = 90 - (d.doi || 0) * 60;
      return hslToHex(h, s, l);
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
      <div id="sidebar">
        <div className="faceted-search">
          <div className="search-container">
            <input
              type="text"
              className="search-input"
              placeholder="Vyhledávat v záznamech.."
              value={searchQuery}
              onChange={handleSearchChange}
            />
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
          <ArchetypeFilter
            selectedArchetypes={selectedArchetypes}
            onArchetypeChange={handleArchetypeChange}
          />
          <DateRangeSlider onRangeChange={handleDateRangeChange} />
        </div>
        <button onClick={() => setIsRunning(!isRunning)} className="play-pause-btn">
          {isRunning ? 'Pause' : 'Play'}
        </button>

        <SearchResults
          searchQuery={searchQuery}
          dateRange={dateRange}
          selectedArchetypes={selectedArchetypes}
          onResultClick={switchSelected}
        />
      </div>
      <div id="tooltip" className="tooltip" ref={tooltipRef}></div>
    </div>
  );
};

export default NetworkVisualization;
