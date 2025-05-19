import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import '../styles/NetworkVisualization.css';
import '../styles/SearchBar.css';
import '../styles/DateRangeSlider.css';
import historicalData from '../data/historical-data.json';
import { FruchtermanReingold } from '../layouts/FruchtermanReingold';
import SearchResults from './SearchResults';
import { DateRangeSlider } from './DateRangeSlider';
import { NodeDatum } from '../types/NodeDatum';
import { calculateDOI } from '../utils/doiCalculator';
import ArchetypeFilter from './ArchetypeFilter';

interface LinkData {
  source: string;
  target: string;
  value: number;
  gradientId: string;
}

export const NetworkVisualization: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [positioned, setPositioned] = useState<NodeDatum[]>([]);
  const [dateRange, setDateRange] = useState<{ min: number; max: number }>({
    min: new Date('1910-01-01').getTime(),
    max: new Date('2024-01-01').getTime(),
  });
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown>>();
  const [selectedArchetypes, setSelectedArchetypes] = useState<number[]>(
    historicalData.vertexArchetypes.map((_, index) => index),
  );

  const handleDateRangeChange = (minDate: number, maxDate: number) => {
    setDateRange({ min: minDate, max: maxDate });
  };

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
    zoomBehaviorRef.current = zoomBehavior;

    // initial nodes and links
    const nodes: NodeDatum[] = historicalData.vertices.map((v) => ({
      id: String(v.id),
      name: v.title,
      group: v.archetype,
      x: Math.random() * width,
      y: Math.random() * height,
      degree: 0,
    }));
    const links: LinkData[] = historicalData.edges.map((e) => ({
      source: String(e.from),
      target: String(e.to),
      value: 1,
      gradientId: `grad-${e.from}-${e.to}`,
    }));

    const neighborMap = new Map<string, Set<string>>();

    links.forEach(({ source, target }) => {
      if (!neighborMap.has(source)) neighborMap.set(source, new Set());
      if (!neighborMap.has(target)) neighborMap.set(target, new Set());
      neighborMap.get(source)!.add(target);
      neighborMap.get(target)!.add(source);
    });

    // Set node degrees from neighbor map
    nodes.forEach((node) => {
      node.degree = neighborMap.get(node.id)?.size || 0;
    });

    // draw links
    const linkSel = g
      .append('g')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('class', 'link')
      .attr('stroke-width', (d) => Math.sqrt(d.value))
      .attr('stroke', '#999');

    // Add edge labels
    const edgeLabels = g
      .append('g')
      .selectAll('text')
      .data(links)
      .enter()
      .append('text')
      .attr('class', 'edge-label')
      .text((d) => {
        const edge = historicalData.edges.find(
          (e) => String(e.from) === d.source && String(e.to) === d.target,
        );
        return edge?.attributes?.['3'] || '';
      });

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
      .attr('r', (d) => calculateDOI(d, nodes))
      .attr('fill', (d) => d3.schemeCategory10[d.group % 10]);
    nodeSel
      .append('text')
      .text((d) => d.name)
      .attr('x', 8)
      .attr('y', 3);

    nodeSel
      .on('mouseover', (event, d) => {
        const ttEl = tooltipRef.current;
        if (ttEl) {
          d3.select(ttEl)
            .style('opacity', 1)
            .html(`<strong>${d.name}</strong><br/>Group: ${d.group}`)
            .style('left', `${event.pageX + 10}px`)
            .style('top', `${event.pageY - 28}px`);
        }

        // highlight d and its neighbors
        const nbrs = new Set(neighborMap.get(d.id));
        nbrs.add(d.id);

        nodeSel.style('opacity', (nd) => (nbrs.has(nd.id) ? 1 : 0.1));
        linkSel.style('opacity', (lk) =>
          nbrs.has(lk.source) && nbrs.has(lk.target) ? 1 : 0.1,
        );
      })
      .on('mouseout', () => {
        if (tooltipRef.current)
          d3.select(tooltipRef.current).style('opacity', 0);
        nodeSel.style('opacity', 1);
        linkSel.style('opacity', 1);
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
    setPositioned(positioned);

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

      // Update edge label positions
      edgeLabels
        .attr('x', (d) => {
          const source = positioned.find((n) => n.id === d.source);
          const target = positioned.find((n) => n.id === d.target);
          if (!source || !target) return 0;
          const sourceX = source.displayX ?? source.x;
          const targetX = target.displayX ?? target.x;
          return (sourceX + targetX) / 2;
        })
        .attr('y', (d) => {
          const source = positioned.find((n) => n.id === d.source);
          const target = positioned.find((n) => n.id === d.target);
          if (!source || !target) return 0;
          const sourceY = source.displayY ?? source.y;
          const targetY = target.displayY ?? target.y;
          return (sourceY + targetY) / 2;
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

    const getLinkAction = (link: LinkData) => {
      const transform = d3.zoomTransform(svgEl);

      const source = nodes.find((node) => node.id === link.source);
      const target = nodes.find((node) => node.id === link.target);

      // screen coords of source
      const [sx, sy] = transform.apply([source!.x, source!.y]);
      const sd = Math.hypot(width / 2 - sx, height / 2 - sy);

      // screen coords of target
      const [tx, ty] = transform.apply([target!.x, target!.y]);
      const td = Math.hypot(width / 2 - tx, height / 2 - ty);

      return {
        transform,
        from: sd > td ? target : source,
        to: sd > td ? source : target,
      };
    };

    linkSel.on('click', (event, d) => {
      const { transform, to: next } = getLinkAction(d);
      const scale = transform.k;
      const x = next!.x,
        y = next!.y;
      const cx = width / 2,
        cy = height / 2;

      svg
        .transition()
        .duration(750)
        .call(
          zoomBehavior.transform,
          d3.zoomIdentity
            .translate(cx - x * scale, cy - y * scale)
            .scale(scale),
        );
    });

    const defs = svg.append('defs');

    linkSel
      .on('mouseover', function (event, d) {
        const lineElem = this as SVGLineElement;
        const lineSel = d3.select(lineElem);
        const gradId = d.gradientId;
        // remove old gradient
        defs.select(`#${gradId}`).remove();

        const { from, to } = getLinkAction(d);

        const grad = defs
          .append('linearGradient')
          .attr('id', gradId)
          .attr('gradientUnits', 'userSpaceOnUse')
          .attr('x1', from!.x)
          .attr('y1', from!.y)
          .attr('x2', to!.x)
          .attr('y2', to!.y);
        // transparent at from end, opaque at to end
        grad
          .append('stop')
          .attr('offset', '0%')
          .attr('stop-color', d3.schemeCategory10[from!.group % 10])
          .attr('stop-opacity', 0);
        grad
          .append('stop')
          .attr('offset', '100%')
          .attr('stop-color', d3.schemeCategory10[to!.group % 10])
          .attr('stop-opacity', 1);
        // apply gradient
        lineSel
          .attr('stroke', `url(#${gradId})`)
          .attr('stroke-width', 10)
          .attr('stroke-opacity', 1);
      })
      .on('mouseout', function (event, d) {
        const lineSel = d3.select(this);
        defs.select(`#${d.gradientId}`).remove();
        lineSel
          .attr('stroke', '#999')
          .attr('stroke-width', Math.sqrt(d.value))
          .attr('stroke-opacity', 0.6);
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

  const handleResultClick = (nodeId: string) => {
    const svgEl = svgRef.current;
    if (!svgEl || !zoomBehaviorRef.current) return;

    const svg = d3.select(svgEl);
    const width = svgEl.clientWidth;
    const height = svgEl.clientHeight;
    const node = positioned.find((n) => n.id === nodeId);
    if (!node) return;

    const current = d3.zoomTransform(svgEl);
    const scale = current.k;
    const tx = width / 2 - node.x * scale;
    const ty = height / 2 - node.y * scale;
    svg
      .transition()
      .duration(750)
      .call(
        zoomBehaviorRef.current.transform,
        d3.zoomIdentity.translate(tx, ty).scale(scale),
      );
  };

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
              onChange={(e) => setSearchQuery(e.target.value)}
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
            onArchetypeChange={setSelectedArchetypes}
          />
          <DateRangeSlider onRangeChange={handleDateRangeChange} />
        </div>
        <SearchResults
          searchQuery={searchQuery}
          dateRange={dateRange}
          selectedArchetypes={selectedArchetypes}
          onResultClick={handleResultClick}
        />
      </div>
      <div id="tooltip" className="tooltip" ref={tooltipRef}></div>
    </div>
  );
};

export default NetworkVisualization;
