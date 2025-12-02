import { useMemo } from 'react';
import { useNetworkStore } from '@/store/networkStore';
import { findKShortestPaths } from '@/utils/graphAlgorithms';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Network, ArrowRight, ArrowLeftRight, HardDrive } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HopDetail } from '@/types/network';

export default function PathMatrix() {
  const topology = useNetworkStore(state => state.topology);
  const setSelectedSource = useNetworkStore(state => state.setSelectedSource);
  const setSelectedTarget = useNetworkStore(state => state.setSelectedTarget);
  const setHighlightedPath = useNetworkStore(state => state.setHighlightedPath);
  const setHighlightedLinks = useNetworkStore(state => state.setHighlightedLinks);

  const nodes = useMemo(() => {
    return topology?.nodes || [];
  }, [topology]);

  const pathMatrix = useMemo(() => {
    if (!topology) return {};

    const matrix: {
      [source: string]: {
        [target: string]: {
          cost: number;
          forwardCost: number;
          reverseCost: number;
          hops: number;
          path: string[];
          pathCount: number;
          minCapacity?: number;
          hopDetails: HopDetail[];
        };
      };
    } = {};

    nodes.forEach(sourceNode => {
      matrix[sourceNode.id] = {};
      nodes.forEach(targetNode => {
        if (sourceNode.id === targetNode.id) {
          matrix[sourceNode.id][targetNode.id] = {
            cost: 0,
            forwardCost: 0,
            reverseCost: 0,
            hops: 0,
            path: [sourceNode.id],
            pathCount: 1,
            minCapacity: undefined,
            hopDetails: []
          };
        } else {
          const paths = findKShortestPaths(topology, sourceNode.id, targetNode.id, 5);
          if (paths.length > 0) {
            matrix[sourceNode.id][targetNode.id] = {
              cost: paths[0].cost,
              forwardCost: paths[0].forwardCost,
              reverseCost: paths[0].reverseCost,
              hops: paths[0].hops,
              path: paths[0].path,
              pathCount: paths.length,
              minCapacity: paths[0].minCapacity,
              hopDetails: paths[0].hopDetails || []
            };
          } else {
            matrix[sourceNode.id][targetNode.id] = {
              cost: Infinity,
              forwardCost: Infinity,
              reverseCost: Infinity,
              hops: 0,
              path: [],
              pathCount: 0,
              minCapacity: undefined,
              hopDetails: []
            };
          }
        }
      });
    });

    return matrix;
  }, [topology, nodes]);

  const handleCellClick = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    
    setSelectedSource(sourceId);
    setSelectedTarget(targetId);

    const pathData = pathMatrix[sourceId]?.[targetId];
    if (pathData && pathData.path.length > 0 && topology) {
      setHighlightedPath(pathData.path);
      
      const linkIds = new Set<string>();
      for (let i = 0; i < pathData.path.length - 1; i++) {
        const link = topology.links.find(
          l => (l.source === pathData.path[i] && l.target === pathData.path[i + 1]) ||
               (l.target === pathData.path[i] && l.source === pathData.path[i + 1])
        );
        if (link) linkIds.add(link.id);
      }
      setHighlightedLinks(linkIds);
    }
  };

  const getCellColor = (cost: number) => {
    if (cost === 0) return 'bg-muted/30';
    if (cost === Infinity) return 'bg-red-500/10';
    if (cost < 50) return 'bg-green-500/10';
    if (cost < 200) return 'bg-yellow-500/10';
    if (cost < 500) return 'bg-orange-500/10';
    return 'bg-red-500/10';
  };

  if (!topology) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground p-4">
        <p className="text-sm">Upload a topology to view path matrix</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col p-4 space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <Network className="w-5 h-5 text-primary" />
            All-Pairs Path Matrix
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            Click any cell to view detailed paths. Colors indicate OSPF cost (green=low, red=high).
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>OSPF Cost Matrix</span>
              <Badge variant="outline" className="text-xs">
                {nodes.length}x{nodes.length} nodes
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32 sticky left-0 bg-background z-10">
                      Source → Target
                    </TableHead>
                    {nodes.map(node => (
                      <TableHead key={node.id} className="text-center min-w-24">
                        <div className="text-xs font-medium truncate" title={node.name}>
                          {node.name}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {nodes.map(sourceNode => (
                    <TableRow key={sourceNode.id}>
                      <TableCell className="font-medium sticky left-0 bg-background z-10">
                        <div className="text-xs truncate" title={sourceNode.name}>
                          {sourceNode.name}
                        </div>
                      </TableCell>
                      {nodes.map(targetNode => {
                        const pathData = pathMatrix[sourceNode.id]?.[targetNode.id];
                        const cost = pathData?.cost ?? Infinity;
                        const forwardCost = pathData?.forwardCost ?? Infinity;
                        const reverseCost = pathData?.reverseCost ?? Infinity;
                        const hops = pathData?.hops ?? 0;
                        const pathCount = pathData?.pathCount ?? 0;
                        const minCapacity = pathData?.minCapacity;

                        return (
                          <TableCell
                            key={targetNode.id}
                            className={`text-center cursor-pointer hover:ring-2 hover:ring-primary transition-all ${getCellColor(cost)}`}
                            onClick={() => handleCellClick(sourceNode.id, targetNode.id)}
                          >
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="space-y-0.5">
                                    {cost === 0 ? (
                                      <div className="text-xs text-muted-foreground">-</div>
                                    ) : cost === Infinity ? (
                                      <div className="text-xs text-red-500 font-semibold">∞</div>
                                    ) : (
                                      <>
                                        <div className="text-xs font-semibold text-green-600">→{forwardCost}</div>
                                        <div className="text-xs font-semibold text-blue-600">←{reverseCost}</div>
                                        {minCapacity !== undefined && (
                                          <div className="text-xs text-muted-foreground">{minCapacity}M</div>
                                        )}
                                        {pathCount > 1 && (
                                          <Badge variant="secondary" className="text-xs px-1 py-0">
                                            +{pathCount - 1}
                                          </Badge>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="text-xs space-y-1">
                                    <div className="font-semibold">
                                      {sourceNode.name} → {targetNode.name}
                                    </div>
                                    {cost !== 0 && cost !== Infinity && (
                                      <>
                                        <div className="flex items-center gap-1">
                                          <ArrowRight className="w-3 h-3 text-green-500" />
                                          <span>Forward Cost: {forwardCost}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <ArrowLeftRight className="w-3 h-3 text-blue-500" />
                                          <span>Reverse Cost: {reverseCost}</span>
                                        </div>
                                        {minCapacity !== undefined && (
                                          <div className="flex items-center gap-1">
                                            <HardDrive className="w-3 h-3 text-orange-500" />
                                            <span>Min Capacity: {minCapacity} Mbps</span>
                                          </div>
                                        )}
                                        <div>Hops: {hops}</div>
                                        <div>Available Paths: {pathCount}</div>
                                        
                                        {/* Per-Hop Cost & Bandwidth Breakdown */}
                                        {pathData?.hopDetails && pathData.hopDetails.length > 0 && (
                                          <div className="mt-1 pt-1 border-t">
                                            <div className="text-muted-foreground font-semibold">Per-Hop Details:</div>
                                            <div className="space-y-1 mt-1 max-h-32 overflow-y-auto">
                                              {pathData.hopDetails.map((hop, hopIdx) => {
                                                const fromNode = nodes.find(n => n.id === hop.from);
                                                const toNode = nodes.find(n => n.id === hop.to);
                                                const isAsym = hop.forwardCost !== hop.reverseCost;
                                                return (
                                                  <div key={hopIdx} className={`p-1 rounded ${isAsym ? 'bg-amber-500/20' : ''}`}>
                                                    <div className="flex items-center justify-between">
                                                      <span className="truncate">
                                                        {hopIdx + 1}. {fromNode?.name || hop.from} → {toNode?.name || hop.to}
                                                      </span>
                                                      {isAsym && <span className="text-amber-500 text-xs ml-1">⚠</span>}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs">
                                                      <span className="text-green-500">→{hop.forwardCost}</span>
                                                      <span className="text-blue-500">←{hop.reverseCost}</span>
                                                      {hop.capacity && (
                                                        <span className="text-orange-500">{hop.capacity}Mbps</span>
                                                      )}
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        )}
                                        
                                        {pathData?.path && (
                                          <div className="mt-1 pt-1 border-t">
                                            <div className="text-muted-foreground">Primary Path:</div>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                              {pathData.path.map((nodeId, i) => {
                                                const node = nodes.find(n => n.id === nodeId);
                                                return (
                                                  <span key={i} className="flex items-center">
                                                    <span className="text-xs">{node?.name || nodeId}</span>
                                                    {i < pathData.path.length - 1 && (
                                                      <ArrowRight className="w-3 h-3 mx-0.5" />
                                                    )}
                                                  </span>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        )}
                                      </>
                                    )}
                                    {cost === Infinity && (
                                      <div className="text-red-500">No path available</div>
                                    )}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Legend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500/10 border rounded"></div>
                <span>Low Cost (&lt;50)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500/10 border rounded"></div>
                <span>Medium Cost (50-200)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-500/10 border rounded"></div>
                <span>High Cost (200-500)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500/10 border rounded"></div>
                <span>Very High (&gt;500) / No Path</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t text-xs text-muted-foreground space-y-1">
              <div className="flex items-center gap-1">
                <span className="text-green-600 font-semibold">→</span>
                <span>Forward Cost (accumulated Dijkstra)</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-blue-600 font-semibold">←</span>
                <span>Reverse Cost (accumulated Dijkstra)</span>
              </div>
              <div className="flex items-center gap-1">
                <HardDrive className="w-3 h-3" />
                <span>Min Capacity (bottleneck along path)</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-amber-500">⚠</span>
                <span>Asymmetric hop (fwd ≠ rev cost)</span>
              </div>
              <div className="mt-1">Badge = Additional available paths</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
