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
import { calculateNodeRadius } from '../utils/utils';
import ArchetypeFilter from './ArchetypeFilter';
import { calculateDOI } from '../utils/doiCalculator';

interface LinkData {
  source: string;
  target: string;
  value: number;
  gradientId: string;
}

export const NetworkVisualization: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown>>();

  const [searchQuery, setSearchQuery] = useState('');
  const [positioned, setPositioned] = useState<NodeDatum[]>([]);
  const [dateRange, setDateRange] = useState<{ min: number; max: number }>({
    min: new Date('1910-01-01').getTime(),
    max: new Date('2024-01-01').getTime(),
  });
  const [selectedArchetypes, setSelectedArchetypes] = useState<number[]>(
    historicalData.vertexArchetypes.map((_, index) => index),
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleArchetypeChange = (newArchetypes: number[]) => {
    setSelectedArchetypes(newArchetypes);
  };

  const handleDateRangeChange = (minDate: number, maxDate: number) => {
    setDateRange({ min: minDate, max: maxDate });
  };

  const switchSelected = (node: NodeDatum | string) => {
    const svgEl = svgRef.current;
    if (!svgEl || !zoomBehaviorRef.current) return;

    const svg = d3.select(svgEl);

    const width = svgEl.clientWidth;
    const height = svgEl.clientHeight;
    const n =
      typeof node === 'string' ? positioned.find((n) => n.id === node) : node;
    if (!n) return;

    const current = d3.zoomTransform(svgEl);
    const scale = current.k;
    const tx = width / 2 - n.x * scale;
    const ty = height / 2 - n.y * scale;
    svg
      .transition()
      .duration(750)
      .call(
        zoomBehaviorRef.current.transform,
        d3.zoomIdentity.translate(tx, ty).scale(scale),
      );
  };

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const width = svgEl.clientWidth;
    const height = svgEl.clientHeight;
    const svg = d3.select(svgEl).attr('width', width).attr('height', height);
    svg.selectAll('*').remove();

    const g = svg.append('g');

    const MIN_SCALE_FOR_SMALL = 0.9;
    const DOI_THRESHOLD = 40;

    const zoomBehavior = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 10])
      .on('zoom', ({ transform }) => {
        g.attr('transform', transform);
        // const k = d3.zoomTransform(svgEl).k;
        // g.selectAll<SVGGElement, NodeDatum>('g.node')
        //   .select<SVGTextElement>('text')
        //   .style('display', (d) =>
        //     calculateDOI(d, nodes) >= DOI_THRESHOLD || k >= MIN_SCALE_FOR_SMALL
        //       ? 'block'
        //       : 'none',
        //   );
      });
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
      let srcSet = neighborMap.get(source);
      if (!srcSet) {
        srcSet = new Set<string>();
        neighborMap.set(source, srcSet);
      }
      srcSet.add(target);

      let tgtSet = neighborMap.get(target);
      if (!tgtSet) {
        tgtSet = new Set<string>();
        neighborMap.set(target, tgtSet);
      }
      tgtSet.add(source);
    });
    nodes.forEach((node) => {
      node.degree = neighborMap.get(node.id)?.size || 0;
    });

    const linkSel = g
      .append('g')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('class', 'link')
      .attr('stroke-width', (d) => Math.sqrt(d.value))
      .attr('stroke', '#999');

    const edgeLabels = g
      .append('g')
      .selectAll<SVGGElement, LinkData>('g.edge-label-group')
      .data(links)
      .enter()
      .append('g')
      .attr('class', 'edge-label-group');
    edgeLabels
      .append('rect')
      .attr('class', 'edge-label-bg')
      .attr('fill', 'white');
    edgeLabels
      .append('text')
      .attr('class', 'edge-label')
      .attr('text-anchor', 'middle')
      .attr('alignment-baseline', 'middle')
      .text((d) => {
        const edge = historicalData.edges.find(
          (e) => String(e.from) === d.source && String(e.to) === d.target,
        );
        return edge?.attributes?.['3'] || '';
      });

    const nodeSel = g
      .append('g')
      .selectAll<SVGGElement, NodeDatum>('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node');

    // Calculate DOI for each node
    const doiParams = {
      searchQuery,
      selectedArchetypes,
      dateRange,
    };

    nodes.forEach((node) => {
      node.doi = calculateDOI(node, nodes, doiParams);
    });

    // Helper function to convert hex to HSL
    const hexToHSL = (hex: string) => {
      // Remove the hash if it exists
      hex = hex.replace('#', '');

      // Convert hex to RGB
      const r = parseInt(hex.substring(0, 2), 16) / 255;
      const g = parseInt(hex.substring(2, 4), 16) / 255;
      const b = parseInt(hex.substring(4, 6), 16) / 255;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);

      let h = 0;
      let s = 0;
      const l = (max + min) / 2;

      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

        switch (max) {
          case r:
            h = (g - b) / d + (g < b ? 6 : 0);
            break;
          case g:
            h = (b - r) / d + 2;
            break;
          case b:
            h = (r - g) / d + 4;
            break;
        }

        h /= 6;
      }

      return { h: h * 360, s: s * 100, l: l * 100 };
    };

    // Helper function to convert HSL to hex
    const hslToHex = (h: number, s: number, l: number) => {
      l /= 100;
      const a = (s * Math.min(l, 1 - l)) / 100;

      const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color)
          .toString(16)
          .padStart(2, '0');
      };

      return `#${f(0)}${f(8)}${f(4)}`;
    };

    nodeSel
      .append('circle')
      .attr('r', (d) => calculateNodeRadius(d, nodes))
      .attr('fill', (d) => {
        const baseColor = d3.schemeCategory10[d.group % 10];
        const { h, s } = hexToHSL(baseColor);
        const l = 90 - (d.doi || 0) * 60; // Scale DOI from 90% to 30% lightness
        return hslToHex(h, s, l);
      })
      .attr('opacity', 1);

    nodeSel
      .append('text')
      .text((d) => d.name)
      .attr('x', 8)
      .attr('y', 3)
      .attr('opacity', 1);

    const hideNonadjacent = (nodes: NodeDatum[]) => {
      const nbrs = new Set();
      nodes.forEach((d) => {
        const adj = neighborMap.get(d.id);
        if (adj) {
          adj.forEach((id) => nbrs.add(id));
        }
        nbrs.add(d.id);
      });

      /** Temporarily disabled hover opacity change
      
      nodeSel.style('opacity', (nd) => (nbrs.has(nd.id) ? 1 : 0.1));
      linkSel.style('opacity', (lk) =>
        nbrs.has(lk.source) && nbrs.has(lk.target) ? 1 : 0.1,
      );
      edgeLabels.style('opacity', (el) =>
        nbrs.has(el.source) && nbrs.has(el.target) ? 1 : 0.1,
      );*/
    };
    const showNonadjacent = () => {
      /** Temporarily disabled hover opacity change
      nodeSel.style('opacity', 1);
      linkSel.style('opacity', 1);
      edgeLabels.style('opacity', 1);
      */
    };

    const getNode = (id: string) => {
      return nodes.find((node) => node.id === id);
    };
    const getEndNodes = (line: LinkData) => {
      return {
        s: nodes.find((node) => node.id === line.source),
        t: nodes.find((node) => node.id === line.target),
      };
    };
    const getLinkAction = (link: LinkData) => {
      const transform = d3.zoomTransform(svgEl);

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
        .map((l) => {
          const { s, t } = getEndNodes(l);
          return s && t ? { source: s, target: t } : null;
        })
        .filter((x): x is { source: NodeDatum; target: NodeDatum } =>
          Boolean(x),
        ),
      {
        width,
        height,
        iterations: 500,
        temperature: width / 4,
        coolingFactor: 0.95,
      },
    );

    const positioned = layout.run() as NodeDatum[];
    setPositioned(positioned);

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

      edgeLabels.attr('transform', (d) => {
        const { s, t } = getEndNodes(d);
        const sx = s ? (s.displayX ?? s.x) : 0;
        const sy = s ? (s.displayY ?? s.y) : 0;
        const tx = t ? (t.displayX ?? t.x) : 0;
        const ty = t ? (t.displayY ?? t.y) : 0;
        return `translate(${(sx + tx) / 2},${(sy + ty) / 2})`;
      });

      edgeLabels.each(function () {
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

      nodeSel.attr('transform', (d) => {
        const x = d.displayX ?? d.x;
        const y = d.displayY ?? d.y;
        return `translate(${x},${y})`;
      });
    }

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
        hideNonadjacent([d]);
      })
      .on('mouseout', () => {
        if (tooltipRef.current)
          d3.select(tooltipRef.current).style('opacity', 0);
        showNonadjacent();
      })
      .on('click', (event, d) => {
        switchSelected(d);
      });

    const defs = svg.append('defs');
    linkSel
      .on('click', (_, d) => {
        const { to: next } = getLinkAction(d);
        switchSelected(next as NodeDatum);
      })
      .on('mouseover', function (_, d) {
        const lineElem = this as SVGLineElement;
        const lineSel = d3.select(lineElem);
        const gradId = d.gradientId;
        defs.select(`#${gradId}`).remove();

        const { from, to } = getLinkAction(d);
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
        lineSel
          .attr('stroke', `url(#${gradId})`)
          .attr('stroke-width', 10)
          .attr('stroke-opacity', 1);

        const { s, t } = getEndNodes(d);
        if (s && t) hideNonadjacent([s, t]);
      })
      .on('mouseout', function (_, d) {
        const lineSel = d3.select(this);
        defs.select(`#${d.gradientId}`).remove();
        lineSel
          .attr('stroke', '#999')
          .attr('stroke-width', Math.sqrt(d.value))
          .attr('stroke-opacity', 0.6);
        showNonadjacent();
      });

    updateDisplay();

    // Update node opacity when filters change
    const onNodeDoiChange = () => {
      const doiParams = {
        searchQuery,
        selectedArchetypes,
        dateRange,
      };

      nodes.forEach((node) => {
        node.doi = calculateDOI(node, nodes, doiParams);
      });

      nodeSel
        .selectAll<SVGCircleElement, NodeDatum>('circle')
        .attr('fill', (d) => {
          const baseColor = d3.schemeCategory10[d.group % 10];
          const { h, s } = hexToHSL(baseColor);
          const l = 90 - (d.doi || 0) * 60; // Scale DOI from 90% to 30% lightness
          return hslToHex(h, s, l);
        });
    };

    // Add updateNodeOpacity to the component's state updates
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
      onNodeDoiChange();
    };

    const handleArchetypeChange = (newArchetypes: number[]) => {
      setSelectedArchetypes(newArchetypes);
      onNodeDoiChange();
    };

    const handleDateRangeChange = (minDate: number, maxDate: number) => {
      setDateRange({ min: minDate, max: maxDate });
      onNodeDoiChange();
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedArchetypes, dateRange]); // Add dependencies to useEffect

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
