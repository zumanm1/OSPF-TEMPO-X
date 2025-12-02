import { useState, useMemo, useCallback } from 'react';
import { useNetworkStore } from '@/store/networkStore';
import { findKShortestPaths } from '@/utils/graphAlgorithms';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  GitBranch,
  TrendingUp,
  AlertTriangle,
  Download,
  Play,
  RotateCcw,
  Activity,
  BarChart2,
  Percent
} from 'lucide-react';

interface ECMPPath {
  path: string[];
  cost: number;
  hops: number;
  minCapacity: number;
}

interface LinkLoad {
  linkId: string;
  source: string;
  target: string;
  trafficShare: number; // percentage
  pathCount: number;
  capacity: number;
  utilization: number;
  projectedUtilization: number;
  congestionRisk: 'low' | 'medium' | 'high' | 'critical';
}

interface TrafficFlowResult {
  source: string;
  target: string;
  trafficDemand: number; // Mbps
  ecmpPaths: ECMPPath[];
  trafficPerPath: number;
  linkLoads: LinkLoad[];
}

export default function TrafficFlowAnalyzer() {
  const topology = useNetworkStore(state => state.topology);
  const setHighlightedLinks = useNetworkStore(state => state.setHighlightedLinks);
  const setHighlightedPath = useNetworkStore(state => state.setHighlightedPath);

  const [source, setSource] = useState<string>('');
  const [target, setTarget] = useState<string>('');
  const [trafficDemand, setTrafficDemand] = useState<string>('100');
  const [flowResult, setFlowResult] = useState<TrafficFlowResult | null>(null);
  const [aggregatedLoads, setAggregatedLoads] = useState<Map<string, LinkLoad> | null>(null);

  const links = useMemo(() => topology?.links || [], [topology]);
  const nodes = useMemo(() => topology?.nodes || [], [topology]);

  const getNodeName = (nodeId: string) => {
    return nodes.find(n => n.id === nodeId)?.name || nodeId;
  };

  const calculateTrafficFlow = useCallback(() => {
    if (!topology || !source || !target || source === target) return;

    const demand = parseFloat(trafficDemand) || 100;

    // Find all equal-cost paths (ECMP)
    const allPaths = findKShortestPaths(topology, source, target, 10);
    if (allPaths.length === 0) {
      setFlowResult(null);
      return;
    }

    // Group paths by cost to find ECMP paths
    const minCost = allPaths[0].forwardCost;
    const ecmpPaths: ECMPPath[] = allPaths
      .filter(p => p.forwardCost === minCost)
      .map(p => ({
        path: p.path,
        cost: p.forwardCost,
        hops: p.hops,
        minCapacity: p.bottleneck?.capacity || 0
      }));

    // Calculate traffic per path (equal split for ECMP)
    const trafficPerPath = demand / ecmpPaths.length;

    // Calculate load on each link
    const linkLoadMap = new Map<string, LinkLoad>();

    ecmpPaths.forEach(ecmpPath => {
      for (let i = 0; i < ecmpPath.path.length - 1; i++) {
        const from = ecmpPath.path[i];
        const to = ecmpPath.path[i + 1];

        // Find the link
        const link = links.find(
          l => (l.source === from && l.target === to) || (l.target === from && l.source === to)
        );

        if (link) {
          const existing = linkLoadMap.get(link.id);
          const capacity = link.capacity || 1000;
          const currentUtil = link.utilization || 0;
          const additionalLoad = trafficPerPath;

          if (existing) {
            existing.trafficShare += (additionalLoad / demand) * 100;
            existing.pathCount += 1;
            existing.projectedUtilization = currentUtil + (existing.trafficShare / 100 * demand / capacity * 100);
          } else {
            const projectedUtil = currentUtil + (additionalLoad / capacity * 100);
            let risk: 'low' | 'medium' | 'high' | 'critical' = 'low';
            if (projectedUtil > 90) risk = 'critical';
            else if (projectedUtil > 75) risk = 'high';
            else if (projectedUtil > 50) risk = 'medium';

            linkLoadMap.set(link.id, {
              linkId: link.id,
              source: link.source,
              target: link.target,
              trafficShare: (additionalLoad / demand) * 100,
              pathCount: 1,
              capacity,
              utilization: currentUtil,
              projectedUtilization: projectedUtil,
              congestionRisk: risk
            });
          }
        }
      }
    });

    // Update congestion risk based on final projected utilization
    linkLoadMap.forEach(load => {
      if (load.projectedUtilization > 90) load.congestionRisk = 'critical';
      else if (load.projectedUtilization > 75) load.congestionRisk = 'high';
      else if (load.projectedUtilization > 50) load.congestionRisk = 'medium';
      else load.congestionRisk = 'low';
    });

    setFlowResult({
      source,
      target,
      trafficDemand: demand,
      ecmpPaths,
      trafficPerPath,
      linkLoads: Array.from(linkLoadMap.values())
    });

    // Highlight all links in ECMP paths
    setHighlightedLinks(new Set(Array.from(linkLoadMap.keys())));
  }, [topology, source, target, trafficDemand, links, setHighlightedLinks]);

  const calculateAggregatedLoads = useCallback(() => {
    if (!topology) return;

    const linkLoadMap = new Map<string, LinkLoad>();

    // Calculate traffic for all node pairs
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const src = nodes[i].id;
        const tgt = nodes[j].id;

        const allPaths = findKShortestPaths(topology, src, tgt, 10);
        if (allPaths.length === 0) continue;

        const minCost = allPaths[0].forwardCost;
        const ecmpPaths = allPaths.filter(p => p.forwardCost === minCost);

        // Assume uniform traffic demand between all pairs
        const demand = 100; // Mbps
        const trafficPerPath = demand / ecmpPaths.length;

        ecmpPaths.forEach(ecmpPath => {
          for (let k = 0; k < ecmpPath.path.length - 1; k++) {
            const from = ecmpPath.path[k];
            const to = ecmpPath.path[k + 1];

            const link = links.find(
              l => (l.source === from && l.target === to) || (l.target === from && l.source === to)
            );

            if (link) {
              const existing = linkLoadMap.get(link.id);
              const capacity = link.capacity || 1000;
              const currentUtil = link.utilization || 0;

              if (existing) {
                existing.trafficShare += trafficPerPath;
                existing.pathCount += 1;
              } else {
                linkLoadMap.set(link.id, {
                  linkId: link.id,
                  source: link.source,
                  target: link.target,
                  trafficShare: trafficPerPath,
                  pathCount: 1,
                  capacity,
                  utilization: currentUtil,
                  projectedUtilization: 0,
                  congestionRisk: 'low'
                });
              }
            }
          }
        });
      }
    }

    // Calculate projected utilization and risk
    linkLoadMap.forEach(load => {
      load.projectedUtilization = load.utilization + (load.trafficShare / load.capacity * 100);
      if (load.projectedUtilization > 90) load.congestionRisk = 'critical';
      else if (load.projectedUtilization > 75) load.congestionRisk = 'high';
      else if (load.projectedUtilization > 50) load.congestionRisk = 'medium';
      else load.congestionRisk = 'low';
    });

    setAggregatedLoads(linkLoadMap);
  }, [topology, nodes, links]);

  const reset = () => {
    setSource('');
    setTarget('');
    setFlowResult(null);
    setAggregatedLoads(null);
    setHighlightedLinks(new Set());
    setHighlightedPath(null);
  };

  const exportReport = () => {
    if (!flowResult && !aggregatedLoads) return;

    const report: any = {
      timestamp: new Date().toISOString()
    };

    if (flowResult) {
      report.singleFlow = {
        source: getNodeName(flowResult.source),
        target: getNodeName(flowResult.target),
        trafficDemand: flowResult.trafficDemand + ' Mbps',
        ecmpPaths: flowResult.ecmpPaths.length,
        trafficPerPath: flowResult.trafficPerPath.toFixed(2) + ' Mbps',
        linkLoads: flowResult.linkLoads.map(load => ({
          link: `${getNodeName(load.source)} ↔ ${getNodeName(load.target)}`,
          trafficShare: load.trafficShare.toFixed(1) + '%',
          projectedUtilization: load.projectedUtilization.toFixed(1) + '%',
          congestionRisk: load.congestionRisk
        }))
      };
    }

    if (aggregatedLoads) {
      report.aggregatedLoads = Array.from(aggregatedLoads.values())
        .sort((a, b) => b.projectedUtilization - a.projectedUtilization)
        .map(load => ({
          link: `${getNodeName(load.source)} ↔ ${getNodeName(load.target)}`,
          pathCount: load.pathCount,
          trafficLoad: load.trafficShare.toFixed(1) + ' Mbps',
          projectedUtilization: load.projectedUtilization.toFixed(1) + '%',
          congestionRisk: load.congestionRisk
        }));
    }

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `traffic-flow-analysis-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!topology) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground p-4">
        <p className="text-sm">Upload a topology to analyze traffic flow</p>
      </div>
    );
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'critical': return 'bg-red-500/10 border-red-500/30 text-red-600';
      case 'high': return 'bg-orange-500/10 border-orange-500/30 text-orange-600';
      case 'medium': return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-600';
      default: return 'bg-green-500/10 border-green-500/30 text-green-600';
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col p-4 space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-primary" />
            Traffic Flow & ECMP Analyzer
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            Visualize traffic distribution across equal-cost paths and identify congestion points.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={calculateAggregatedLoads} variant="outline" size="sm">
            <BarChart2 className="w-4 h-4 mr-1" />
            All Flows
          </Button>
          <Button onClick={reset} variant="outline" size="sm">
            <RotateCcw className="w-4 h-4 mr-1" />
            Reset
          </Button>
        </div>

        <Separator />

        {/* Single Flow Analysis */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Single Flow Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Source</Label>
                <Select value={source} onValueChange={setSource}>
                  <SelectTrigger>
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    {nodes.map(node => (
                      <SelectItem key={node.id} value={node.id}>
                        {node.name || node.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Target</Label>
                <Select value={target} onValueChange={setTarget}>
                  <SelectTrigger>
                    <SelectValue placeholder="Target" />
                  </SelectTrigger>
                  <SelectContent>
                    {nodes.map(node => (
                      <SelectItem key={node.id} value={node.id}>
                        {node.name || node.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs">Traffic Demand (Mbps)</Label>
              <Input
                type="number"
                min="1"
                value={trafficDemand}
                onChange={(e) => setTrafficDemand(e.target.value)}
              />
            </div>

            <Button 
              onClick={calculateTrafficFlow} 
              className="w-full" 
              disabled={!source || !target || source === target}
            >
              <Play className="w-4 h-4 mr-1" />
              Calculate Flow
            </Button>
          </CardContent>
        </Card>

        {/* Flow Results */}
        {flowResult && (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    ECMP Load Distribution
                  </span>
                  <Button variant="outline" size="sm" onClick={exportReport}>
                    <Download className="w-3 h-3" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-blue-500/10 p-3 rounded">
                    <div className="text-2xl font-bold text-blue-600">
                      {flowResult.ecmpPaths.length}
                    </div>
                    <div className="text-xs text-muted-foreground">Equal-Cost Paths</div>
                  </div>
                  <div className="bg-green-500/10 p-3 rounded">
                    <div className="text-2xl font-bold text-green-600">
                      {flowResult.trafficPerPath.toFixed(0)}
                    </div>
                    <div className="text-xs text-muted-foreground">Mbps per Path</div>
                  </div>
                </div>

                <Alert>
                  <Percent className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Traffic splits equally across {flowResult.ecmpPaths.length} path(s) with cost {flowResult.ecmpPaths[0].cost}
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* ECMP Paths */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">ECMP Paths</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-48 overflow-y-auto">
                {flowResult.ecmpPaths.map((path, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded bg-muted/50 text-xs cursor-pointer hover:ring-2 hover:ring-primary"
                    onClick={() => setHighlightedPath(path.path)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="outline">Path {idx + 1}</Badge>
                      <span className="text-muted-foreground">
                        {flowResult.trafficPerPath.toFixed(1)} Mbps
                      </span>
                    </div>
                    <div className="text-muted-foreground">
                      {path.path.map(getNodeName).join(' → ')}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                      <span>Cost: {path.cost}</span>
                      <span>•</span>
                      <span>{path.hops} hops</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Link Loads */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Link Load Distribution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-64 overflow-y-auto">
                {flowResult.linkLoads
                  .sort((a, b) => b.projectedUtilization - a.projectedUtilization)
                  .map(load => (
                    <div
                      key={load.linkId}
                      className={`p-2 rounded border ${getRiskColor(load.congestionRisk)}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium">
                          {getNodeName(load.source)} ↔ {getNodeName(load.target)}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {load.trafficShare.toFixed(0)}%
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Current: {load.utilization.toFixed(0)}%</span>
                          <span>Projected: {load.projectedUtilization.toFixed(0)}%</span>
                        </div>
                        <Progress value={load.projectedUtilization} className="h-1" />
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {load.pathCount} path(s) • {load.capacity} Mbps capacity
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>
          </>
        )}

        {/* Aggregated Loads */}
        {aggregatedLoads && (
          <>
            <Separator />
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>Network-Wide Load Distribution</span>
                  <Button variant="outline" size="sm" onClick={exportReport}>
                    <Download className="w-3 h-3" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-80 overflow-y-auto">
                {Array.from(aggregatedLoads.values())
                  .sort((a, b) => b.projectedUtilization - a.projectedUtilization)
                  .map(load => (
                    <div
                      key={load.linkId}
                      className={`p-2 rounded border ${getRiskColor(load.congestionRisk)}`}
                      onClick={() => setHighlightedLinks(new Set([load.linkId]))}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium">
                          {getNodeName(load.source)} ↔ {getNodeName(load.target)}
                        </span>
                        <Badge variant={load.congestionRisk === 'critical' ? 'destructive' : 'outline'} className="text-xs">
                          {load.congestionRisk.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Load: {load.trafficShare.toFixed(0)} Mbps</span>
                          <span>Util: {load.projectedUtilization.toFixed(0)}%</span>
                        </div>
                        <Progress value={load.projectedUtilization} className="h-1" />
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {load.pathCount} flows • {load.capacity} Mbps capacity
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Showing projected utilization assuming 100 Mbps uniform traffic between all node pairs.
              </AlertDescription>
            </Alert>
          </>
        )}
      </div>
    </ScrollArea>
  );
}
