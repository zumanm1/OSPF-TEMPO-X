import { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { useNetworkStore } from '@/store/networkStore';
import { performDeepAnalysis } from '@/utils/graphAlgorithms';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Globe, 
  Network, 
  Map, 
  BarChart3,
  ArrowLeft,
  Download
} from 'lucide-react';

interface TopologyVisualizationProps {
  onBack?: () => void;
}

export default function TopologyVisualization({ onBack }: TopologyVisualizationProps) {
  const topology = useNetworkStore(state => state.topology);
  const darkMode = useNetworkStore(state => state.darkMode);
  
  const countryMapRef = useRef<SVGSVGElement>(null);
  const matrixRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const [activeTab, setActiveTab] = useState('country-map');

  const analysisResult = useMemo(() => {
    if (!topology) return null;
    return performDeepAnalysis(topology);
  }, [topology]);

  // Country Map Visualization
  useEffect(() => {
    if (!topology || !countryMapRef.current || !analysisResult || activeTab !== 'country-map') return;

    const svg = d3.select(countryMapRef.current);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;
    const countries = analysisResult.networkStats.countries;
    
    // Create country nodes
    const countryNodes = countries.map((country, i) => {
      const angle = (2 * Math.PI * i) / countries.length;
      const radius = Math.min(width, height) * 0.35;
      return {
        id: country,
        x: width / 2 + radius * Math.cos(angle - Math.PI / 2),
        y: height / 2 + radius * Math.sin(angle - Math.PI / 2),
        nodeCount: analysisResult.countryConnectivity[country]?.nodes || 0
      };
    });

    // Create country links
    const countryLinks = analysisResult.countryPaths.map(cp => ({
      source: countryNodes.find(n => n.id === cp.sourceCountry)!,
      target: countryNodes.find(n => n.id === cp.targetCountry)!,
      cost: cp.bestPath?.cost || 0,
      pathCount: cp.totalPaths
    })).filter(l => l.source && l.target);

    const g = svg.append('g');

    // Draw links with gradient
    const defs = svg.append('defs');
    
    countryLinks.forEach((link, i) => {
      const gradient = defs.append('linearGradient')
        .attr('id', `gradient-${i}`)
        .attr('gradientUnits', 'userSpaceOnUse')
        .attr('x1', link.source.x)
        .attr('y1', link.source.y)
        .attr('x2', link.target.x)
        .attr('y2', link.target.y);
      
      gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', darkMode ? '#3b82f6' : '#6366f1')
        .attr('stop-opacity', 0.8);
      
      gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', darkMode ? '#8b5cf6' : '#a855f7')
        .attr('stop-opacity', 0.8);
    });

    const link = g.append('g')
      .selectAll('line')
      .data(countryLinks)
      .join('line')
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y)
      .attr('stroke', (d, i) => `url(#gradient-${i})`)
      .attr('stroke-width', d => Math.max(3, Math.min(10, d.pathCount * 2)))
      .attr('stroke-linecap', 'round')
      .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))');

    // Draw link labels with background
    const linkLabels = g.append('g')
      .selectAll('g')
      .data(countryLinks)
      .join('g')
      .attr('transform', d => `translate(${(d.source.x + d.target.x) / 2}, ${(d.source.y + d.target.y) / 2})`);

    linkLabels.append('rect')
      .attr('x', -30)
      .attr('y', -10)
      .attr('width', 60)
      .attr('height', 20)
      .attr('rx', 4)
      .attr('fill', darkMode ? '#1e293b' : '#ffffff')
      .attr('stroke', darkMode ? '#475569' : '#e2e8f0')
      .attr('stroke-width', 1.5);

    linkLabels.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 5)
      .attr('font-size', 11)
      .attr('font-weight', 600)
      .attr('fill', darkMode ? '#60a5fa' : '#3b82f6')
      .text(d => d.cost > 0 ? `${d.cost}` : '');

    // Draw country nodes
    const node = g.append('g')
      .selectAll('g')
      .data(countryNodes)
      .join('g')
      .attr('transform', d => `translate(${d.x}, ${d.y})`);

    node.append('circle')
      .attr('r', d => 25 + d.nodeCount * 6)
      .attr('fill', darkMode ? '#1e293b' : '#ffffff')
      .attr('stroke', darkMode ? '#3b82f6' : '#6366f1')
      .attr('stroke-width', 4)
      .style('filter', 'drop-shadow(0 4px 6px rgba(0,0,0,0.2))');

    node.append('circle')
      .attr('r', d => 20 + d.nodeCount * 5)
      .attr('fill', darkMode ? '#3b82f6' : '#6366f1')
      .attr('fill-opacity', 0.9);

    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', -35 - 5)
      .attr('font-size', 15)
      .attr('font-weight', 700)
      .attr('fill', darkMode ? '#f1f5f9' : '#0f172a')
      .style('text-shadow', darkMode ? '0 2px 4px rgba(0,0,0,0.5)' : '0 2px 4px rgba(255,255,255,0.8)')
      .text(d => d.id);

    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 5)
      .attr('font-size', 14)
      .attr('fill', '#fff')
      .attr('font-weight', 600)
      .text(d => d.nodeCount);

    // Tooltip
    const tooltip = d3.select('body').append('div')
      .attr('class', 'absolute hidden bg-popover text-popover-foreground px-3 py-2 rounded-md shadow-md text-sm border z-50')
      .style('pointer-events', 'none');

    node.on('mouseenter', (event, d) => {
      const connectivity = analysisResult.countryConnectivity[d.id];
      tooltip
        .html(`
          <div class="font-semibold">${d.id}</div>
          <div class="text-xs">Nodes: ${d.nodeCount}</div>
          <div class="text-xs">Connections: ${connectivity?.connections || 0}</div>
          <div class="text-xs">Avg Utilization: ${connectivity?.avgUtilization.toFixed(1) || 0}%</div>
        `)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px')
        .classed('hidden', false);
    })
    .on('mouseleave', () => {
      tooltip.classed('hidden', true);
    });

    return () => {
      tooltip.remove();
    };
  }, [topology, analysisResult, dimensions, darkMode, activeTab]);

  // Connectivity Matrix Visualization
  useEffect(() => {
    if (!topology || !matrixRef.current || !analysisResult || activeTab !== 'matrix') return;

    const svg = d3.select(matrixRef.current);
    svg.selectAll('*').remove();

    const countries = analysisResult.networkStats.countries;
    const cellSize = Math.min(50, (dimensions.width - 100) / countries.length);
    const margin = { top: 80, left: 80 };

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Create matrix data
    const matrixData: Array<{
      source: string;
      target: string;
      cost: number;
      x: number;
      y: number;
    }> = [];

    countries.forEach((source, i) => {
      countries.forEach((target, j) => {
        const pathData = analysisResult.countryPaths.find(
          cp => (cp.sourceCountry === source && cp.targetCountry === target) ||
                (cp.sourceCountry === target && cp.targetCountry === source)
        );
        matrixData.push({
          source,
          target,
          cost: pathData?.bestPath?.cost || 0,
          x: j * cellSize,
          y: i * cellSize
        });
      });
    });

    // Color scale with better gradient
    const maxCost = Math.max(...matrixData.map(d => d.cost));
    const colorScale = d3.scaleSequential()
      .domain([0, maxCost])
      .interpolator(t => {
        if (t === 0) return darkMode ? '#1e293b' : '#f1f5f9';
        return d3.interpolateRgb(
          darkMode ? '#1e40af' : '#60a5fa',
          darkMode ? '#7c3aed' : '#a855f7'
        )(t);
      });

    // Draw cells with enhanced styling
    g.selectAll('rect')
      .data(matrixData)
      .join('rect')
      .attr('x', d => d.x)
      .attr('y', d => d.y)
      .attr('width', cellSize - 2)
      .attr('height', cellSize - 2)
      .attr('fill', d => d.source === d.target ? (darkMode ? '#334155' : '#e2e8f0') : colorScale(d.cost))
      .attr('rx', 4)
      .attr('stroke', darkMode ? '#475569' : '#cbd5e1')
      .attr('stroke-width', 0.5)
      .style('filter', 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))')
      .style('cursor', 'pointer')
      .on('mouseenter', function(event, d) {
        if (d.source !== d.target) {
          d3.select(this)
            .attr('stroke-width', 2)
            .attr('stroke', darkMode ? '#60a5fa' : '#3b82f6');
        }
      })
      .on('mouseleave', function() {
        d3.select(this)
          .attr('stroke-width', 0.5)
          .attr('stroke', darkMode ? '#475569' : '#cbd5e1');
      });

    // Draw cost labels with better styling
    g.selectAll('text.cost')
      .data(matrixData.filter(d => d.source !== d.target && d.cost > 0))
      .join('text')
      .attr('class', 'cost')
      .attr('x', d => d.x + cellSize / 2)
      .attr('y', d => d.y + cellSize / 2)
      .attr('text-anchor', 'middle')
      .attr('dy', 4)
      .attr('font-size', 11)
      .attr('font-weight', 600)
      .attr('fill', d => d.cost > maxCost / 2 ? '#ffffff' : (darkMode ? '#e2e8f0' : '#1e293b'))
      .style('pointer-events', 'none')
      .text(d => d.cost);

    // Row labels with better styling
    g.selectAll('text.row')
      .data(countries)
      .join('text')
      .attr('class', 'row')
      .attr('x', -10)
      .attr('y', (d, i) => i * cellSize + cellSize / 2)
      .attr('text-anchor', 'end')
      .attr('dy', 4)
      .attr('font-size', 12)
      .attr('font-weight', 600)
      .attr('fill', darkMode ? '#f1f5f9' : '#0f172a')
      .text(d => d);

    // Column labels with better styling
    g.selectAll('text.col')
      .data(countries)
      .join('text')
      .attr('class', 'col')
      .attr('x', (d, i) => i * cellSize + cellSize / 2)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .attr('font-size', 12)
      .attr('font-weight', 600)
      .attr('fill', darkMode ? '#f1f5f9' : '#0f172a')
      .text(d => d);

  }, [topology, analysisResult, dimensions, darkMode, activeTab]);

  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: Math.min(800, window.innerWidth - 100),
        height: 500
      });
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!topology) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>Upload a topology to view visualizations</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Map className="w-5 h-5 text-primary" />
            Topology Visualization
          </h2>
        </div>
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <TabsList className="mb-4">
            <TabsTrigger value="country-map" className="gap-2">
              <Globe className="w-4 h-4" />
              Country Map
            </TabsTrigger>
            <TabsTrigger value="matrix" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Connectivity Matrix
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-2">
              <Network className="w-4 h-4" />
              Statistics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="country-map" className="h-[calc(100%-60px)]">
            <div className="h-full flex gap-4">
              <Card className="flex-1">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Country-to-Country Network Map</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center">
                  <svg
                    ref={countryMapRef}
                    width={dimensions.width}
                    height={dimensions.height}
                    className="bg-muted/20 rounded-lg"
                  />
                </CardContent>
              </Card>
              
              {/* Legend */}
              <Card className="w-64">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Legend</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-xs font-semibold mb-2 text-muted-foreground">Node Size</h4>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary border-2 border-white"></div>
                        <span className="text-xs">Router count</span>
                      </div>
                      <p className="text-xs text-muted-foreground ml-8">Larger = More routers</p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-xs font-semibold mb-2 text-muted-foreground">Link Width</h4>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded"></div>
                        <span className="text-xs">Path count</span>
                      </div>
                      <p className="text-xs text-muted-foreground ml-10">Thicker = More paths</p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-xs font-semibold mb-2 text-muted-foreground">Cost Labels</h4>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="px-2 py-1 bg-card border rounded text-xs text-primary font-semibold">25</div>
                        <span className="text-xs">Best path cost</span>
                      </div>
                    </div>
                  </div>
                  
                  {analysisResult && (
                    <div className="pt-2 border-t">
                      <h4 className="text-xs font-semibold mb-2">Quick Stats</h4>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Countries</span>
                          <Badge variant="secondary" className="text-xs">{analysisResult.networkStats.countries.length}</Badge>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Total Paths</span>
                          <Badge variant="secondary" className="text-xs">{analysisResult.countryPaths.length}</Badge>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="matrix" className="h-[calc(100%-60px)]">
            <div className="h-full flex gap-4">
              <Card className="flex-1">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Country Connectivity Matrix (Best Path Costs)</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center">
                  <svg
                    ref={matrixRef}
                    width={dimensions.width}
                    height={dimensions.height}
                    className="bg-muted/20 rounded-lg"
                  />
                </CardContent>
              </Card>
              
              {/* Matrix Legend */}
              <Card className="w-64">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Color Scale</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-xs font-semibold mb-2 text-muted-foreground">Path Cost</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded"></div>
                        <span className="text-xs">Low → High</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Darker = Higher cost</p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-xs font-semibold mb-2 text-muted-foreground">Diagonal</h4>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-4 bg-muted rounded"></div>
                      <span className="text-xs">Same country</span>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-xs font-semibold mb-2 text-muted-foreground">Interaction</h4>
                    <p className="text-xs text-muted-foreground">Hover over cells to highlight connections</p>
                  </div>
                  
                  {analysisResult && (
                    <div className="pt-2 border-t">
                      <h4 className="text-xs font-semibold mb-2">Cost Range</h4>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Min Cost</span>
                          <Badge variant="secondary" className="text-xs">
                            {Math.min(...analysisResult.countryPaths.map(p => p.bestPath?.cost || 0).filter(c => c > 0))}
                          </Badge>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Max Cost</span>
                          <Badge variant="secondary" className="text-xs">
                            {Math.max(...analysisResult.countryPaths.map(p => p.bestPath?.cost || 0))}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="stats" className="h-[calc(100%-60px)] overflow-auto">
            {analysisResult && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Network Overview</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Nodes</span>
                      <Badge>{analysisResult.networkStats.totalNodes}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Links</span>
                      <Badge>{analysisResult.networkStats.totalLinks}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Countries</span>
                      <Badge>{analysisResult.networkStats.countries.length}</Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Path Statistics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Avg Path Cost</span>
                      <Badge variant="outline">{analysisResult.networkStats.avgPathCost.toFixed(1)}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Shortest Path</span>
                      <span>{analysisResult.networkStats.shortestPath} hops</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Longest Path</span>
                      <span>{analysisResult.networkStats.longestPath} hops</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Redundancy</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Score</span>
                      <Badge variant={analysisResult.networkStats.redundancyScore > 50 ? 'default' : 'destructive'}>
                        {analysisResult.networkStats.redundancyScore.toFixed(1)}%
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Percentage of node pairs with backup paths
                    </p>
                  </CardContent>
                </Card>

                {Object.entries(analysisResult.countryConnectivity).map(([country, data]) => (
                  <Card key={country}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        {country}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Nodes</span>
                        <Badge variant="secondary">{data.nodes}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Connections</span>
                        <Badge variant="outline">{data.connections}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Avg Utilization</span>
                        <span>{data.avgUtilization.toFixed(1)}%</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
