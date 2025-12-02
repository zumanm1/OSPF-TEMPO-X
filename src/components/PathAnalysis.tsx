import { useState, useMemo } from 'react';
import { useNetworkStore } from '@/store/networkStore';
import { findKShortestPaths } from '@/utils/graphAlgorithms';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Route, AlertTriangle, TrendingUp, Navigation } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function PathAnalysis() {
  const topology = useNetworkStore(state => state.topology);
  const selectedNodes = useNetworkStore(state => state.selectedNodes);
  const setSelectedSource = useNetworkStore(state => state.setSelectedSource);
  const setSelectedTarget = useNetworkStore(state => state.setSelectedTarget);
  const setHighlightedPath = useNetworkStore(state => state.setHighlightedPath);
  const setHighlightedLinks = useNetworkStore(state => state.setHighlightedLinks);
  const pathResults = useNetworkStore(state => state.pathResults);
  const setPathResults = useNetworkStore(state => state.setPathResults);

  const [calculating, setCalculating] = useState(false);

  const nodes = useMemo(() => {
    return topology?.nodes || [];
  }, [topology]);

  const handleCalculate = () => {
    if (!topology || !selectedNodes.source || !selectedNodes.target) return;
    
    // Prevent calculating path to same node
    if (selectedNodes.source === selectedNodes.target) {
      setPathResults([]);
      setHighlightedPath(null);
      setHighlightedLinks(new Set());
      return;
    }

    setCalculating(true);
    
    // Simulate async calculation
    setTimeout(() => {
      const results = findKShortestPaths(
        topology,
        selectedNodes.source!,
        selectedNodes.target!,
        5 // Find up to 5 paths
      );
      setPathResults(results);
      
      if (results.length > 0) {
        setHighlightedPath(results[0].path);
        
        // Highlight links in the path
        const linkIds = new Set<string>();
        for (let i = 0; i < results[0].path.length - 1; i++) {
          const link = topology.links.find(
            l => (l.source === results[0].path[i] && l.target === results[0].path[i + 1]) ||
                 (l.target === results[0].path[i] && l.source === results[0].path[i + 1])
          );
          if (link) linkIds.add(link.id);
        }
        setHighlightedLinks(linkIds);
      }
      
      setCalculating(false);
    }, 100);
  };

  const handleClear = () => {
    setSelectedSource(null);
    setSelectedTarget(null);
    setPathResults([]);
    setHighlightedPath(null);
    setHighlightedLinks(new Set());
  };

  const handlePathHover = (path: string[]) => {
    setHighlightedPath(path);
    
    if (!topology) return;
    
    const linkIds = new Set<string>();
    for (let i = 0; i < path.length - 1; i++) {
      const link = topology.links.find(
        l => (l.source === path[i] && l.target === path[i + 1]) ||
             (l.target === path[i] && l.source === path[i + 1])
      );
      if (link) linkIds.add(link.id);
    }
    setHighlightedLinks(linkIds);
  };

  if (!topology) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground p-4">
        <p className="text-sm">Upload a topology to analyze paths</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-4 space-y-4 overflow-y-auto">
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Route className="w-5 h-5 text-primary" />
          Path Analysis
        </h3>

        <div className="space-y-4">
          <div>
            <Label htmlFor="source">Source Node</Label>
            <Select
              value={selectedNodes.source || ''}
              onValueChange={setSelectedSource}
            >
              <SelectTrigger id="source">
                <SelectValue placeholder="Select source node" />
              </SelectTrigger>
              <SelectContent>
                {nodes.map(node => (
                  <SelectItem key={node.id} value={node.id}>
                    {node.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="target">Destination Node</Label>
            <Select
              value={selectedNodes.target || ''}
              onValueChange={setSelectedTarget}
            >
              <SelectTrigger id="target">
                <SelectValue placeholder="Select destination node" />
              </SelectTrigger>
              <SelectContent>
                {nodes.map(node => (
                  <SelectItem key={node.id} value={node.id}>
                    {node.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleCalculate}
              disabled={!selectedNodes.source || !selectedNodes.target || calculating || selectedNodes.source === selectedNodes.target}
              className="flex-1"
            >
              {calculating ? 'Calculating...' : 'Calculate Paths'}
            </Button>
            <Button
              onClick={handleClear}
              variant="outline"
              disabled={!selectedNodes.source && !selectedNodes.target}
            >
              Clear
            </Button>
          </div>

          {selectedNodes.source && selectedNodes.target && selectedNodes.source === selectedNodes.target && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Source and destination must be different nodes
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      {pathResults.length > 0 && (
        <>
          <Separator />

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase">
              Results
            </h4>

            {pathResults.map((result, index) => (
              <Card
                key={index}
                className="cursor-pointer hover:border-primary transition-colors"
                onMouseEnter={() => handlePathHover(result.path)}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Navigation className="w-4 h-4" />
                      Path {index + 1} {index === 0 ? '(Primary - Lowest Cost)' : ''}
                    </span>
                    <Badge variant={index === 0 ? 'default' : 'secondary'}>
                      Cost: {result.cost}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Forward:</span>
                      <Badge variant="outline" className="text-green-600">{result.forwardCost}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Reverse:</span>
                      <Badge variant="outline" className="text-blue-600">{result.reverseCost}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Hops:</span>
                      <Badge variant="outline">{result.hops}</Badge>
                    </div>
                    {result.minCapacity !== undefined && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Min Cap:</span>
                        <Badge variant="outline" className="text-orange-600">{result.minCapacity}M</Badge>
                      </div>
                    )}
                  </div>

                  {/* Per-Hop Cost & Bandwidth Breakdown */}
                  {result.hopDetails && result.hopDetails.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground font-semibold">Per-Hop Details:</div>
                      <div className="bg-muted/50 rounded p-2 space-y-2 max-h-48 overflow-y-auto">
                        {result.hopDetails.map((hop, hopIdx) => {
                          const fromNode = nodes.find(n => n.id === hop.from);
                          const toNode = nodes.find(n => n.id === hop.to);
                          const isAsymmetric = hop.forwardCost !== hop.reverseCost;
                          return (
                            <div key={hopIdx} className={`text-xs p-2 rounded ${isAsymmetric ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-background'}`}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium truncate">
                                  Hop {hopIdx + 1}: {fromNode?.name || hop.from} → {toNode?.name || hop.to}
                                </span>
                                {isAsymmetric && (
                                  <Badge variant="outline" className="text-amber-600 text-xs px-1">Asym</Badge>
                                )}
                              </div>
                              <div className="grid grid-cols-3 gap-1 text-xs">
                                <div className="flex items-center gap-1">
                                  <span className="text-green-600 font-semibold">→{hop.forwardCost}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-blue-600 font-semibold">←{hop.reverseCost}</span>
                                </div>
                                <div className="flex items-center gap-1 justify-end">
                                  {hop.capacity ? (
                                    <span className="text-orange-600 font-semibold">{hop.capacity}M</span>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </div>
                              </div>
                              {hop.interface && (
                                <div className="text-muted-foreground mt-1 text-xs">
                                  Interface: {hop.interface}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {/* Hop Legend */}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                        <span className="text-green-600">→Fwd</span>
                        <span className="text-blue-600">←Rev</span>
                        <span className="text-orange-600">Capacity</span>
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Path:</div>
                    <div className="flex flex-wrap gap-1">
                      {result.path.map((nodeId, i) => {
                        const node = nodes.find(n => n.id === nodeId);
                        return (
                          <span key={i} className="flex items-center">
                            <Badge variant="secondary" className="text-xs">
                              {node?.name || nodeId}
                            </Badge>
                            {i < result.path.length - 1 && (
                              <span className="mx-1 text-muted-foreground">→</span>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {result.bottleneck && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        <div className="font-semibold">Bottleneck Detected</div>
                        <div>Capacity: {result.bottleneck.capacity} Mbps</div>
                        <div>Utilization: {result.bottleneck.utilization}%</div>
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {pathResults.length === 0 && selectedNodes.source && selectedNodes.target && !calculating && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            No path found between selected nodes
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
