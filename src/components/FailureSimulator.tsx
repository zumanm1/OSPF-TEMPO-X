import { useState, useMemo, useCallback } from 'react';
import { useNetworkStore } from '@/store/networkStore';
import { findKShortestPaths } from '@/utils/graphAlgorithms';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Zap,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Download,
  Play,
  RotateCcw,
  Shield,
  ShieldAlert,
  Network
} from 'lucide-react';
import { NetworkTopology } from '@/types/network';

interface FailureScenario {
  failedLinks: string[];
  unreachablePairs: Array<{ source: string; target: string }>;
  affectedPaths: number;
  totalPaths: number;
  spofLinks: string[];
  redundancyScore: number;
}

export default function FailureSimulator() {
  const topology = useNetworkStore(state => state.topology);
  const setHighlightedLinks = useNetworkStore(state => state.setHighlightedLinks);
  const setHighlightedPath = useNetworkStore(state => state.setHighlightedPath);

  const [selectedLinks, setSelectedLinks] = useState<Set<string>>(new Set());
  const [simulationResult, setSimulationResult] = useState<FailureScenario | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [spofAnalysis, setSpofAnalysis] = useState<Map<string, number> | null>(null);

  const links = useMemo(() => topology?.links || [], [topology]);
  const nodes = useMemo(() => topology?.nodes || [], [topology]);

  const getNodeName = (nodeId: string) => {
    return nodes.find(n => n.id === nodeId)?.name || nodeId;
  };

  const getLinkName = (linkId: string) => {
    const link = links.find(l => l.id === linkId);
    if (!link) return linkId;
    return `${getNodeName(link.source)} ↔ ${getNodeName(link.target)}`;
  };

  const toggleLinkSelection = (linkId: string) => {
    setSelectedLinks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(linkId)) {
        newSet.delete(linkId);
      } else {
        newSet.add(linkId);
      }
      return newSet;
    });
  };

  const createFailureTopology = useCallback((failedLinkIds: string[]): NetworkTopology | null => {
    if (!topology) return null;

    const activeLinks = topology.links.filter(link => !failedLinkIds.includes(link.id));
    return { ...topology, links: activeLinks };
  }, [topology]);

  const runFailureSimulation = useCallback(() => {
    if (!topology || selectedLinks.size === 0) return;

    setIsRunning(true);
    const failedLinkIds = Array.from(selectedLinks);
    const failureTopology = createFailureTopology(failedLinkIds);
    
    if (!failureTopology) {
      setIsRunning(false);
      return;
    }

    const unreachablePairs: Array<{ source: string; target: string }> = [];
    let totalPaths = 0;
    let affectedPaths = 0;

    // Test all node pairs
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        totalPaths++;
        const source = nodes[i].id;
        const target = nodes[j].id;

        const originalPaths = findKShortestPaths(topology, source, target, 1);
        const failurePaths = findKShortestPaths(failureTopology, source, target, 1);

        if (originalPaths.length > 0 && failurePaths.length === 0) {
          unreachablePairs.push({ source, target });
          affectedPaths++;
        } else if (originalPaths.length > 0 && failurePaths.length > 0) {
          // Check if path changed
          const pathChanged = originalPaths[0].path.length !== failurePaths[0].path.length ||
            !originalPaths[0].path.every((node, idx) => node === failurePaths[0].path[idx]);
          if (pathChanged) affectedPaths++;
        }
      }
    }

    const redundancyScore = ((totalPaths - unreachablePairs.length) / totalPaths) * 100;

    setSimulationResult({
      failedLinks: failedLinkIds,
      unreachablePairs,
      affectedPaths,
      totalPaths,
      spofLinks: [],
      redundancyScore
    });

    setIsRunning(false);
    setHighlightedLinks(selectedLinks);
  }, [topology, selectedLinks, nodes, createFailureTopology, setHighlightedLinks]);

  const runSpofAnalysis = useCallback(() => {
    if (!topology) return;

    setIsRunning(true);
    const spofMap = new Map<string, number>();

    // Test each link individually
    links.forEach(link => {
      const failureTopology = createFailureTopology([link.id]);
      if (!failureTopology) return;

      let brokenPaths = 0;

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const source = nodes[i].id;
          const target = nodes[j].id;

          const originalPaths = findKShortestPaths(topology, source, target, 1);
          const failurePaths = findKShortestPaths(failureTopology, source, target, 1);

          if (originalPaths.length > 0 && failurePaths.length === 0) {
            brokenPaths++;
          }
        }
      }

      if (brokenPaths > 0) {
        spofMap.set(link.id, brokenPaths);
      }
    });

    setSpofAnalysis(spofMap);
    setIsRunning(false);
  }, [topology, links, nodes, createFailureTopology]);

  const resetSimulation = () => {
    setSelectedLinks(new Set());
    setSimulationResult(null);
    setSpofAnalysis(null);
    setHighlightedLinks(new Set());
    setHighlightedPath(null);
  };

  const exportReport = () => {
    if (!simulationResult && !spofAnalysis) return;

    const report: any = {
      timestamp: new Date().toISOString(),
      topology: {
        nodes: nodes.length,
        links: links.length
      }
    };

    if (simulationResult) {
      report.failureSimulation = {
        failedLinks: simulationResult.failedLinks.map(getLinkName),
        unreachablePairs: simulationResult.unreachablePairs.map(pair => ({
          source: getNodeName(pair.source),
          target: getNodeName(pair.target)
        })),
        affectedPaths: simulationResult.affectedPaths,
        totalPaths: simulationResult.totalPaths,
        redundancyScore: simulationResult.redundancyScore.toFixed(2) + '%'
      };
    }

    if (spofAnalysis) {
      report.spofAnalysis = Array.from(spofAnalysis.entries())
        .map(([linkId, count]) => ({
          link: getLinkName(linkId),
          brokenPaths: count
        }))
        .sort((a, b) => b.brokenPaths - a.brokenPaths);
    }

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `failure-analysis-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!topology) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground p-4">
        <p className="text-sm">Upload a topology to simulate failures</p>
      </div>
    );
  }

  const sortedSpofLinks = spofAnalysis 
    ? Array.from(spofAnalysis.entries()).sort((a, b) => b[1] - a[1])
    : [];

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col p-4 space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Link Failure Simulator
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            Test network resilience by simulating link failures and identifying single points of failure.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={runSpofAnalysis} disabled={isRunning} variant="outline" size="sm">
            <ShieldAlert className="w-4 h-4 mr-1" />
            Find SPOFs
          </Button>
          <Button onClick={resetSimulation} variant="outline" size="sm">
            <RotateCcw className="w-4 h-4 mr-1" />
            Reset
          </Button>
        </div>

        <Separator />

        {/* Link Selection */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Select Links to Fail</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-48 overflow-y-auto">
            {links.map(link => (
              <div key={link.id} className="flex items-center space-x-2">
                <Checkbox
                  id={link.id}
                  checked={selectedLinks.has(link.id)}
                  onCheckedChange={() => toggleLinkSelection(link.id)}
                />
                <label
                  htmlFor={link.id}
                  className="text-xs flex-1 cursor-pointer"
                >
                  {getNodeName(link.source)} ↔ {getNodeName(link.target)}
                  <span className="text-muted-foreground ml-2">
                    (Cost: {link.forward_cost ?? link.cost})
                  </span>
                </label>
              </div>
            ))}
          </CardContent>
        </Card>

        {selectedLinks.size > 0 && (
          <Button onClick={runFailureSimulation} disabled={isRunning} className="w-full">
            <Play className="w-4 h-4 mr-1" />
            {isRunning ? 'Simulating...' : `Simulate ${selectedLinks.size} Link Failure(s)`}
          </Button>
        )}

        {/* Simulation Results */}
        {simulationResult && (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Network className="w-4 h-4" />
                    Failure Impact
                  </span>
                  <Button variant="outline" size="sm" onClick={exportReport}>
                    <Download className="w-3 h-3" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-red-500/10 p-3 rounded">
                    <div className="text-2xl font-bold text-red-600">
                      {simulationResult.unreachablePairs.length}
                    </div>
                    <div className="text-xs text-muted-foreground">Broken Paths</div>
                  </div>
                  <div className="bg-orange-500/10 p-3 rounded">
                    <div className="text-2xl font-bold text-orange-600">
                      {simulationResult.affectedPaths}
                    </div>
                    <div className="text-xs text-muted-foreground">Affected Paths</div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Redundancy Score</span>
                    <span className={simulationResult.redundancyScore >= 95 ? 'text-green-600' : 'text-red-600'}>
                      {simulationResult.redundancyScore.toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={simulationResult.redundancyScore} className="h-2" />
                </div>

                <div className="text-xs text-muted-foreground">
                  {simulationResult.totalPaths} total paths tested
                </div>
              </CardContent>
            </Card>

            {simulationResult.unreachablePairs.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-red-600">
                    Unreachable Node Pairs ({simulationResult.unreachablePairs.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 max-h-48 overflow-y-auto">
                  {simulationResult.unreachablePairs.map((pair, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs bg-red-500/10 p-2 rounded">
                      <XCircle className="w-3 h-3 text-red-600" />
                      <span>{getNodeName(pair.source)} → {getNodeName(pair.target)}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {simulationResult.unreachablePairs.length === 0 && (
              <Alert>
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-xs">
                  All node pairs remain reachable. Network has redundancy for the selected link failures.
                </AlertDescription>
              </Alert>
            )}
          </>
        )}

        {/* SPOF Analysis Results */}
        {spofAnalysis && sortedSpofLinks.length > 0 && (
          <>
            <Separator />
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-red-600" />
                    Single Points of Failure ({sortedSpofLinks.length})
                  </span>
                  <Button variant="outline" size="sm" onClick={exportReport}>
                    <Download className="w-3 h-3" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-64 overflow-y-auto">
                {sortedSpofLinks.map(([linkId, brokenPaths]) => {
                  const link = links.find(l => l.id === linkId);
                  if (!link) return null;

                  const severity = brokenPaths > 5 ? 'critical' : brokenPaths > 2 ? 'high' : 'medium';
                  const colorClass = severity === 'critical' 
                    ? 'bg-red-500/10 border-red-500/30' 
                    : severity === 'high' 
                    ? 'bg-orange-500/10 border-orange-500/30' 
                    : 'bg-yellow-500/10 border-yellow-500/30';

                  return (
                    <div
                      key={linkId}
                      className={`p-2 rounded border cursor-pointer hover:ring-2 hover:ring-primary ${colorClass}`}
                      onClick={() => setHighlightedLinks(new Set([linkId]))}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">
                          {getNodeName(link.source)} ↔ {getNodeName(link.target)}
                        </span>
                        <Badge variant="destructive" className="text-xs">
                          {brokenPaths} paths
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Cost: {link.forward_cost ?? link.cost}
                        {link.capacity && ` • ${link.capacity} Mbps`}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription className="text-xs">
                These links are critical - their failure would break connectivity between node pairs.
              </AlertDescription>
            </Alert>
          </>
        )}

        {spofAnalysis && sortedSpofLinks.length === 0 && (
          <Alert>
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-xs">
              No single points of failure detected. Network has full N+1 redundancy.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </ScrollArea>
  );
}
