import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useNetworkStore } from '@/store/networkStore';
import { NetworkNode, NetworkLink } from '@/types/network';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface D3Node extends NetworkNode {
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  vx?: number;
  vy?: number;
}

interface D3Link extends Omit<NetworkLink, 'source' | 'target'> {
  source: D3Node | string;
  target: D3Node | string;
}

export default function NetworkGraph() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  
  const topology = useNetworkStore(state => state.topology);
  const highlightedPath = useNetworkStore(state => state.highlightedPath);
  const highlightedLinks = useNetworkStore(state => state.highlightedLinks);
  const searchQuery = useNetworkStore(state => state.searchQuery);
  const darkMode = useNetworkStore(state => state.darkMode);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    if (!topology || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;

    // Create zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    const g = svg.append('g');

    // Create arrow markers for directed links
    svg.append('defs').selectAll('marker')
      .data(['asymmetric'])
      .join('marker')
      .attr('id', d => `arrow-${d}`)
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('fill', '#64748b')
      .attr('d', 'M0,-5L10,0L0,5');

    // Prepare data
    const nodes: D3Node[] = topology.nodes.map(n => ({ ...n }));
    const links: D3Link[] = topology.links.map(l => ({ ...l }));

    // Create force simulation
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink<D3Node, D3Link>(links)
        .id(d => d.id)
        .distance(150))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    // Create links
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', d => {
        if (highlightedLinks.has(d.id)) return '#3b82f6';
        if (d.type === 'backbone') return '#10b981';
        if (d.type === 'asymmetric') return '#f59e0b';
        return '#64748b';
      })
      .attr('stroke-width', d => highlightedLinks.has(d.id) ? 4 : 2)
      .attr('stroke-opacity', d => highlightedLinks.has(d.id) ? 1 : 0.6)
      .attr('marker-end', d => d.type === 'asymmetric' ? 'url(#arrow-asymmetric)' : null)
      .attr('class', d => highlightedLinks.has(d.id) ? 'path-highlight' : '');

    // Add animation for highlighted paths
    if (highlightedLinks.size > 0) {
      link.filter(d => highlightedLinks.has(d.id))
        .attr('stroke-dasharray', '10,5')
        .each(function() {
          const el = d3.select(this);
          const animate = () => {
            el.attr('stroke-dashoffset', 0)
              .transition()
              .duration(1000)
              .ease(d3.easeLinear)
              .attr('stroke-dashoffset', -15)
              .on('end', animate);
          };
          animate();
        });
    }

    // Create link labels (cost) with background
    const linkLabelGroup = g.append('g')
      .selectAll('g')
      .data(links)
      .join('g')
      .attr('class', 'link-label-group');

    linkLabelGroup.append('rect')
      .attr('x', -18)
      .attr('y', -10)
      .attr('width', 36)
      .attr('height', 18)
      .attr('rx', 3)
      .attr('fill', darkMode ? '#1e293b' : '#ffffff')
      .attr('stroke', darkMode ? '#475569' : '#e2e8f0')
      .attr('stroke-width', 1)
      .style('filter', 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))');

    linkLabelGroup.append('text')
      .attr('font-size', 10)
      .attr('font-weight', 600)
      .attr('fill', darkMode ? '#60a5fa' : '#3b82f6')
      .attr('text-anchor', 'middle')
      .attr('dy', 3)
      .text(d => d.cost);

    // Create source interface labels with background
    const sourceInterfaceGroup = g.append('g')
      .selectAll('g')
      .data(links.filter(d => d.sourceInterface))
      .join('g')
      .attr('class', 'source-interface-group');

    sourceInterfaceGroup.append('rect')
      .attr('x', -25)
      .attr('y', -9)
      .attr('width', 50)
      .attr('height', 16)
      .attr('rx', 8)
      .attr('fill', darkMode ? '#0f172a' : '#f8fafc')
      .attr('stroke', darkMode ? '#3b82f6' : '#60a5fa')
      .attr('stroke-width', 1.5)
      .style('filter', 'drop-shadow(0 1px 3px rgba(59,130,246,0.3))');

    sourceInterfaceGroup.append('text')
      .attr('font-size', 9)
      .attr('font-weight', 600)
      .attr('fill', darkMode ? '#60a5fa' : '#3b82f6')
      .attr('text-anchor', 'middle')
      .attr('dy', 3)
      .style('pointer-events', 'none')
      .text(d => d.sourceInterface || '');

    // Create target interface labels with background
    const targetInterfaceGroup = g.append('g')
      .selectAll('g')
      .data(links.filter(d => d.targetInterface))
      .join('g')
      .attr('class', 'target-interface-group');

    targetInterfaceGroup.append('rect')
      .attr('x', -25)
      .attr('y', -9)
      .attr('width', 50)
      .attr('height', 16)
      .attr('rx', 8)
      .attr('fill', darkMode ? '#0f172a' : '#f8fafc')
      .attr('stroke', darkMode ? '#8b5cf6' : '#a855f7')
      .attr('stroke-width', 1.5)
      .style('filter', 'drop-shadow(0 1px 3px rgba(139,92,246,0.3))');

    targetInterfaceGroup.append('text')
      .attr('font-size', 9)
      .attr('font-weight', 600)
      .attr('fill', darkMode ? '#a78bfa' : '#8b5cf6')
      .attr('text-anchor', 'middle')
      .attr('dy', 3)
      .style('pointer-events', 'none')
      .text(d => d.targetInterface || '');

    // Create nodes
    const node = g.append('g')
      .selectAll('circle')
      .data(nodes)
      .join('circle')
      .attr('r', d => {
        if (highlightedPath?.includes(d.id)) return 12;
        if (searchQuery && d.name.toLowerCase().includes(searchQuery.toLowerCase())) return 12;
        return 8;
      })
      .attr('fill', d => {
        if (highlightedPath?.includes(d.id)) return '#3b82f6';
        if (searchQuery && d.name.toLowerCase().includes(searchQuery.toLowerCase())) return '#f59e0b';
        return '#6366f1';
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .call(d3.drag<SVGCircleElement, D3Node>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended) as any);

    // Create node labels
    const nodeLabel = g.append('g')
      .selectAll('text')
      .data(nodes)
      .join('text')
      .attr('font-size', 11)
      .attr('font-weight', 500)
      .attr('fill', darkMode ? '#e2e8f0' : '#1e293b')
      .attr('text-anchor', 'middle')
      .attr('dy', -15)
      .text(d => d.name)
      .style('pointer-events', 'none');

    // Tooltip
    const tooltip = d3.select('body').append('div')
      .attr('class', 'absolute hidden bg-popover text-popover-foreground px-3 py-2 rounded-md shadow-md text-sm border z-50')
      .style('pointer-events', 'none');

    node.on('mouseenter', (event, d) => {
      tooltip
        .html(`
          <div class="font-semibold">${d.name}</div>
          <div class="text-xs text-muted-foreground">ID: ${d.id}</div>
          ${d.country ? `<div class="text-xs">Country: ${d.country}</div>` : ''}
        `)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px')
        .classed('hidden', false);
    })
    .on('mouseleave', () => {
      tooltip.classed('hidden', true);
    });

    link.on('mouseenter', (event, d) => {
      const source = typeof d.source === 'object' ? d.source.name : d.source;
      const target = typeof d.target === 'object' ? d.target.name : d.target;
      tooltip
        .html(`
          <div class="font-semibold">${source} → ${target}</div>
          <div class="text-xs">Cost: ${d.cost}</div>
          ${d.sourceInterface ? `<div class="text-xs text-blue-400">Source: ${d.sourceInterface}</div>` : ''}
          ${d.targetInterface ? `<div class="text-xs text-blue-400">Target: ${d.targetInterface}</div>` : ''}
          ${d.capacity ? `<div class="text-xs">Capacity: ${d.capacity} Mbps</div>` : ''}
          ${d.utilization !== undefined ? `<div class="text-xs">Utilization: ${d.utilization}%</div>` : ''}
          ${d.type ? `<div class="text-xs">Type: ${d.type}</div>` : ''}
        `)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px')
        .classed('hidden', false);
    })
    .on('mouseleave', () => {
      tooltip.classed('hidden', true);
    });

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as D3Node).x!)
        .attr('y1', d => (d.source as D3Node).y!)
        .attr('x2', d => (d.target as D3Node).x!)
        .attr('y2', d => (d.target as D3Node).y!);

      linkLabelGroup
        .attr('transform', d => {
          const x = ((d.source as D3Node).x! + (d.target as D3Node).x!) / 2;
          const y = ((d.source as D3Node).y! + (d.target as D3Node).y!) / 2;
          return `translate(${x}, ${y})`;
        });

      // Position source interface labels near source node
      sourceInterfaceGroup
        .attr('transform', d => {
          const sx = (d.source as D3Node).x!;
          const sy = (d.source as D3Node).y!;
          const tx = (d.target as D3Node).x!;
          const ty = (d.target as D3Node).y!;
          const dx = tx - sx;
          const dy = ty - sy;
          const len = Math.sqrt(dx * dx + dy * dy);
          const x = sx + (dx / len) * 25;
          const y = sy + (dy / len) * 25;
          return `translate(${x}, ${y})`;
        });

      // Position target interface labels near target node
      targetInterfaceGroup
        .attr('transform', d => {
          const sx = (d.source as D3Node).x!;
          const sy = (d.source as D3Node).y!;
          const tx = (d.target as D3Node).x!;
          const ty = (d.target as D3Node).y!;
          const dx = sx - tx;
          const dy = sy - ty;
          const len = Math.sqrt(dx * dx + dy * dy);
          const x = tx + (dx / len) * 25;
          const y = ty + (dy / len) * 25;
          return `translate(${x}, ${y})`;
        });

      node
        .attr('cx', d => d.x!)
        .attr('cy', d => d.y!);

      nodeLabel
        .attr('x', d => d.x!)
        .attr('y', d => d.y!);
    });

    function dragstarted(event: any, d: D3Node) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: D3Node) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: D3Node) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return () => {
      simulation.stop();
      tooltip.remove();
    };
  }, [topology, dimensions, highlightedPath, highlightedLinks, searchQuery, darkMode]);

  const handleZoomIn = () => {
    const svg = d3.select(svgRef.current);
    svg.transition().call(
      d3.zoom<SVGSVGElement, unknown>().scaleBy as any,
      1.3
    );
  };

  const handleZoomOut = () => {
    const svg = d3.select(svgRef.current);
    svg.transition().call(
      d3.zoom<SVGSVGElement, unknown>().scaleBy as any,
      0.7
    );
  };

  const handleReset = () => {
    const svg = d3.select(svgRef.current);
    svg.transition().call(
      d3.zoom<SVGSVGElement, unknown>().transform as any,
      d3.zoomIdentity
    );
  };

  if (!topology) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>Upload a topology file to visualize the network</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full h-full bg-background">
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full h-full"
      />
      
      {/* Legend */}
      <div className="absolute top-4 left-4 bg-card/95 backdrop-blur-sm border rounded-lg p-3 shadow-lg max-w-xs">
        <h3 className="text-xs font-semibold mb-2">Network Legend</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-green-500 rounded"></div>
            <span className="text-xs">Backbone Link</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-orange-500 rounded"></div>
            <span className="text-xs">Asymmetric Link</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-gray-500 rounded"></div>
            <span className="text-xs">Standard Link</span>
          </div>
          <div className="border-t pt-2 mt-2">
            <div className="flex items-center gap-2 mb-1">
              <div className="px-1.5 py-0.5 bg-card border rounded text-[10px] text-primary font-semibold">10</div>
              <span className="text-xs">Link Cost</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-1.5 py-0.5 bg-card border border-blue-500 rounded text-[10px] text-blue-500 font-semibold">Gi0/1</div>
              <span className="text-xs">Interface</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="secondary" onClick={handleZoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom In</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="secondary" onClick={handleZoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom Out</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="secondary" onClick={handleReset}>
                <Maximize2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reset View</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
