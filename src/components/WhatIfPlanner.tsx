import { useState, useMemo, useCallback } from 'react';
import { useNetworkStore } from '@/store/networkStore';
import { findKShortestPaths, findBandwidthAwarePaths, BandwidthAwarePath } from '@/utils/graphAlgorithms';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Beaker,
  Play,
  RotateCcw,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Download,
  Plus,
  Trash2,
  Eye,
  GitCompare,
  Gauge,
  HardDrive,
  Zap
} from 'lucide-react';
import { NetworkTopology, NetworkLink, PathResult } from '@/types/network';

interface ScenarioChange {
  linkId: string;
  originalForwardCost: number;
  originalReverseCost: number;
  newForwardCost: number;
  newReverseCost: number;
  linkDisabled: boolean;
}

interface PathComparison {
  source: string;
  target: string;
  originalPath: PathResult | null;
  scenarioPath: PathResult | null;
  costDelta: number;
  pathChanged: boolean;
  routeShift: 'same' | 'different' | 'broken';
}

export default function WhatIfPlanner() {
  const topology = useNetworkStore(state => state.topology);
  const setHighlightedPath = useNetworkStore(state => state.setHighlightedPath);
  const setHighlightedLinks = useNetworkStore(state => state.setHighlightedLinks);

  const [scenarioChanges, setScenarioChanges] = useState<ScenarioChange[]>([]);
  const [selectedLinkId, setSelectedLinkId] = useState<string>('');
  const [newForwardCost, setNewForwardCost] = useState<string>('');
  const [newReverseCost, setNewReverseCost] = useState<string>('');
  const [disableLink, setDisableLink] = useState<boolean>(false);
  const [scenarioResults, setScenarioResults] = useState<PathComparison[] | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  // Bandwidth-aware path calculator state
  const [bwSource, setBwSource] = useState<string>('');
  const [bwTarget, setBwTarget] = useState<string>('');
  const [requiredBandwidth, setRequiredBandwidth] = useState<string>('0');
  const [costWeight, setCostWeight] = useState<number[]>([50]);
  const [bwPaths, setBwPaths] = useState<BandwidthAwarePath[]>([]);

  const links = useMemo(() => topology?.links || [], [topology]);
  const nodes = useMemo(() => topology?.nodes || [], [topology]);

  const selectedLink = useMemo(() => {
    return links.find(l => l.id === selectedLinkId);
  }, [links, selectedLinkId]);

  const getNodeName = (nodeId: string) => {
    return nodes.find(n => n.id === nodeId)?.name || nodeId;
  };

  const handleLinkSelect = (linkId: string) => {
    setSelectedLinkId(linkId);
    const link = links.find(l => l.id === linkId);
    if (link) {
      setNewForwardCost((link.forward_cost ?? link.cost).toString());
      setNewReverseCost((link.reverse_cost ?? link.cost).toString());
      setDisableLink(false);
      setHighlightedLinks(new Set([linkId]));
    }
  };

  const handleAddChange = () => {
    if (!selectedLink) return;

    const fwdCost = parseInt(newForwardCost);
    const revCost = parseInt(newReverseCost);

    if (!disableLink && (isNaN(fwdCost) || fwdCost < 1)) return;

    const change: ScenarioChange = {
      linkId: selectedLink.id,
      originalForwardCost: selectedLink.forward_cost ?? selectedLink.cost,
      originalReverseCost: selectedLink.reverse_cost ?? selectedLink.cost,
      newForwardCost: disableLink ? Infinity : fwdCost,
      newReverseCost: disableLink ? Infinity : (isNaN(revCost) ? fwdCost : revCost),
      linkDisabled: disableLink
    };

    setScenarioChanges(prev => {
      const existing = prev.findIndex(c => c.linkId === change.linkId);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = change;
        return updated;
      }
      return [...prev, change];
    });

    setSelectedLinkId('');
    setNewForwardCost('');
    setNewReverseCost('');
    setDisableLink(false);
    setHighlightedLinks(new Set());
  };

  const handleRemoveChange = (linkId: string) => {
    setScenarioChanges(prev => prev.filter(c => c.linkId !== linkId));
  };

  const createScenarioTopology = useCallback((): NetworkTopology | null => {
    if (!topology) return null;

    const modifiedLinks = topology.links.map(link => {
      const change = scenarioChanges.find(c => c.linkId === link.id);
      if (change) {
        if (change.linkDisabled) {
          return { ...link, cost: 999999, forward_cost: 999999, reverse_cost: 999999 };
        }
        return {
          ...link,
          cost: change.newForwardCost,
          forward_cost: change.newForwardCost,
          reverse_cost: change.newReverseCost
        };
      }
      return link;
    }).filter(link => {
      const change = scenarioChanges.find(c => c.linkId === link.id);
      return !change?.linkDisabled;
    });

    return { ...topology, links: modifiedLinks };
  }, [topology, scenarioChanges]);

  const runScenario = useCallback(() => {
    if (!topology || scenarioChanges.length === 0) return;

    setIsRunning(true);
    const scenarioTopology = createScenarioTopology();
    if (!scenarioTopology) {
      setIsRunning(false);
      return;
    }

    const comparisons: PathComparison[] = [];

    // Compare paths for all node pairs
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const source = nodes[i].id;
        const target = nodes[j].id;

        const originalPaths = findKShortestPaths(topology, source, target, 1);
        const scenarioPaths = findKShortestPaths(scenarioTopology, source, target, 1);

        const originalPath = originalPaths[0] || null;
        const scenarioPath = scenarioPaths[0] || null;

        let routeShift: 'same' | 'different' | 'broken' = 'same';
        if (!scenarioPath && originalPath) {
          routeShift = 'broken';
        } else if (originalPath && scenarioPath) {
          const pathsEqual = originalPath.path.length === scenarioPath.path.length &&
            originalPath.path.every((node, idx) => node === scenarioPath.path[idx]);
          routeShift = pathsEqual ? 'same' : 'different';
        }

        const costDelta = (scenarioPath?.forwardCost ?? Infinity) - (originalPath?.forwardCost ?? 0);

        comparisons.push({
          source,
          target,
          originalPath,
          scenarioPath,
          costDelta,
          pathChanged: routeShift !== 'same',
          routeShift
        });
      }
    }

    // Sort by impact (broken first, then different, then same)
    comparisons.sort((a, b) => {
      const order = { broken: 0, different: 1, same: 2 };
      return order[a.routeShift] - order[b.routeShift];
    });

    setScenarioResults(comparisons);
    setIsRunning(false);
  }, [topology, scenarioChanges, nodes, createScenarioTopology]);

  const resetScenario = () => {
    setScenarioChanges([]);
    setScenarioResults(null);
    setHighlightedLinks(new Set());
    setHighlightedPath(null);
  };

  // Bandwidth-aware path calculation
  const calculateBandwidthPaths = useCallback(() => {
    if (!topology || !bwSource || !bwTarget || bwSource === bwTarget) return;

    const paths = findBandwidthAwarePaths(
      topology,
      bwSource,
      bwTarget,
      parseInt(requiredBandwidth) || 0,
      costWeight[0] / 100,
      5
    );
    setBwPaths(paths);

    if (paths.length > 0) {
      setHighlightedPath(paths[0].path);
      setHighlightedLinks(new Set(paths[0].hopDetails.map(h => h.linkId)));
    }
  }, [topology, bwSource, bwTarget, requiredBandwidth, costWeight, setHighlightedPath, setHighlightedLinks]);

  const handleHighlightBwPath = (path: BandwidthAwarePath) => {
    setHighlightedPath(path.path);
    setHighlightedLinks(new Set(path.hopDetails.map(h => h.linkId)));
  };

  const stats = useMemo(() => {
    if (!scenarioResults) return null;

    const broken = scenarioResults.filter(r => r.routeShift === 'broken').length;
    const different = scenarioResults.filter(r => r.routeShift === 'different').length;
    const same = scenarioResults.filter(r => r.routeShift === 'same').length;
    const avgCostDelta = scenarioResults
      .filter(r => r.routeShift !== 'broken')
      .reduce((sum, r) => sum + r.costDelta, 0) / (scenarioResults.length - broken || 1);

    return { broken, different, same, avgCostDelta, total: scenarioResults.length };
  }, [scenarioResults]);

  const handleHighlightComparison = (comparison: PathComparison) => {
    if (comparison.scenarioPath) {
      setHighlightedPath(comparison.scenarioPath.path);
      const linkIds = new Set<string>();
      for (let i = 0; i < comparison.scenarioPath.path.length - 1; i++) {
        const link = links.find(
          l => (l.source === comparison.scenarioPath!.path[i] && l.target === comparison.scenarioPath!.path[i + 1]) ||
               (l.target === comparison.scenarioPath!.path[i] && l.source === comparison.scenarioPath!.path[i + 1])
        );
        if (link) linkIds.add(link.id);
      }
      setHighlightedLinks(linkIds);
    }
  };

  const exportScenario = () => {
    if (!scenarioResults) return;

    const report = {
      timestamp: new Date().toISOString(),
      changes: scenarioChanges.map(c => ({
        link: `${getNodeName(links.find(l => l.id === c.linkId)?.source || '')} → ${getNodeName(links.find(l => l.id === c.linkId)?.target || '')}`,
        originalForward: c.originalForwardCost,
        originalReverse: c.originalReverseCost,
        newForward: c.linkDisabled ? 'DISABLED' : c.newForwardCost,
        newReverse: c.linkDisabled ? 'DISABLED' : c.newReverseCost
      })),
      summary: stats,
      affectedPaths: scenarioResults.filter(r => r.routeShift !== 'same').map(r => ({
        source: getNodeName(r.source),
        target: getNodeName(r.target),
        status: r.routeShift,
        costDelta: r.costDelta,
        originalPath: r.originalPath?.path.map(getNodeName).join(' → '),
        newPath: r.scenarioPath?.path.map(getNodeName).join(' → ') || 'UNREACHABLE'
      }))
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `what-if-scenario-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!topology) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground p-4">
        <p className="text-sm">Upload a topology to run what-if scenarios</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col p-4 space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <Beaker className="w-5 h-5 text-primary" />
            What-If Scenario Planner
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            Simulate cost changes and see immediate impact on path selection.
          </p>
        </div>

        {/* Add Change Section */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Add Scenario Change</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="link" className="text-xs">Select Link</Label>
              <Select value={selectedLinkId} onValueChange={handleLinkSelect}>
                <SelectTrigger id="link">
                  <SelectValue placeholder="Select a link" />
                </SelectTrigger>
                <SelectContent>
                  {links.map(link => (
                    <SelectItem key={link.id} value={link.id}>
                      <div className="flex items-center gap-2">
                        <span>{getNodeName(link.source)} → {getNodeName(link.target)}</span>
                        <Badge variant="outline" className="text-xs">
                          {link.forward_cost ?? link.cost}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedLink && (
              <>
                <div className="flex items-center justify-between">
                  <Label className="text-xs flex items-center gap-2">
                    <XCircle className="w-3 h-3 text-red-500" />
                    Disable Link
                  </Label>
                  <Switch checked={disableLink} onCheckedChange={setDisableLink} />
                </div>

                {!disableLink && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="fwdCost" className="text-xs">Forward Cost</Label>
                      <Input
                        id="fwdCost"
                        type="number"
                        min="1"
                        value={newForwardCost}
                        onChange={(e) => setNewForwardCost(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="revCost" className="text-xs">Reverse Cost</Label>
                      <Input
                        id="revCost"
                        type="number"
                        min="1"
                        value={newReverseCost}
                        onChange={(e) => setNewReverseCost(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <Button onClick={handleAddChange} className="w-full" size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Add to Scenario
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Pending Changes */}
        {scenarioChanges.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>Scenario Changes ({scenarioChanges.length})</span>
                <Button variant="ghost" size="sm" onClick={resetScenario}>
                  <RotateCcw className="w-3 h-3" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {scenarioChanges.map(change => {
                const link = links.find(l => l.id === change.linkId);
                if (!link) return null;

                return (
                  <div key={change.linkId} className="flex items-center justify-between bg-muted/50 p-2 rounded text-xs">
                    <div className="flex-1">
                      <div className="font-medium">
                        {getNodeName(link.source)} → {getNodeName(link.target)}
                      </div>
                      {change.linkDisabled ? (
                        <Badge variant="destructive" className="text-xs">DISABLED</Badge>
                      ) : (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <span>{change.originalForwardCost}</span>
                          <ArrowRight className="w-3 h-3" />
                          <span className={change.newForwardCost > change.originalForwardCost ? 'text-red-500' : 'text-green-500'}>
                            {change.newForwardCost}
                          </span>
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveChange(change.linkId)}
                      className="h-6 w-6 p-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                );
              })}

              <div className="flex gap-2 pt-2">
                <Button onClick={runScenario} className="flex-1" disabled={isRunning}>
                  <Play className="w-4 h-4 mr-1" />
                  {isRunning ? 'Running...' : 'Run Scenario'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* Results */}
        {scenarioResults && stats && (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <GitCompare className="w-4 h-4" />
                    Scenario Impact
                  </span>
                  <Button variant="outline" size="sm" onClick={exportScenario}>
                    <Download className="w-3 h-3" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-red-500/10 p-2 rounded">
                    <div className="text-xl font-bold text-red-600">{stats.broken}</div>
                    <div className="text-xs text-muted-foreground">Broken</div>
                  </div>
                  <div className="bg-orange-500/10 p-2 rounded">
                    <div className="text-xl font-bold text-orange-600">{stats.different}</div>
                    <div className="text-xs text-muted-foreground">Rerouted</div>
                  </div>
                  <div className="bg-green-500/10 p-2 rounded">
                    <div className="text-xl font-bold text-green-600">{stats.same}</div>
                    <div className="text-xs text-muted-foreground">Unchanged</div>
                  </div>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Avg Cost Delta</span>
                  <Badge variant={stats.avgCostDelta > 0 ? 'destructive' : 'default'}>
                    {stats.avgCostDelta > 0 ? '+' : ''}{stats.avgCostDelta.toFixed(1)}
                  </Badge>
                </div>

                <Progress 
                  value={((stats.same) / stats.total) * 100} 
                  className="h-2"
                />
                <div className="text-xs text-muted-foreground text-center">
                  {((stats.same / stats.total) * 100).toFixed(0)}% paths unaffected
                </div>
              </CardContent>
            </Card>

            {/* Affected Paths */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Affected Paths</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-64 overflow-y-auto">
                {scenarioResults.filter(r => r.routeShift !== 'same').slice(0, 20).map((comparison, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded text-xs cursor-pointer hover:ring-2 hover:ring-primary ${
                      comparison.routeShift === 'broken' ? 'bg-red-500/10' : 'bg-orange-500/10'
                    }`}
                    onClick={() => handleHighlightComparison(comparison)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">
                        {getNodeName(comparison.source)} → {getNodeName(comparison.target)}
                      </span>
                      {comparison.routeShift === 'broken' ? (
                        <Badge variant="destructive" className="text-xs">BROKEN</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          {comparison.costDelta > 0 ? '+' : ''}{comparison.costDelta}
                        </Badge>
                      )}
                    </div>
                    {comparison.routeShift === 'different' && comparison.scenarioPath && (
                      <div className="text-muted-foreground">
                        New: {comparison.scenarioPath.path.map(getNodeName).join(' → ')}
                      </div>
                    )}
                  </div>
                ))}
                {scenarioResults.filter(r => r.routeShift !== 'same').length > 20 && (
                  <div className="text-xs text-muted-foreground text-center">
                    +{scenarioResults.filter(r => r.routeShift !== 'same').length - 20} more affected paths
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {scenarioChanges.length === 0 && !scenarioResults && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Add link changes above to create a what-if scenario. You can modify costs or disable links to see how traffic would be rerouted.
            </AlertDescription>
          </Alert>
        )}

        <Separator />

        {/* Bandwidth-Aware Path Calculator */}
        <div>
          <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <Gauge className="w-5 h-5 text-primary" />
            Bandwidth-Aware Paths
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            Find optimal paths considering both OSPF cost and available bandwidth.
          </p>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Path Parameters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Source</Label>
                <Select value={bwSource} onValueChange={setBwSource}>
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
                <Select value={bwTarget} onValueChange={setBwTarget}>
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
              <Label className="text-xs">Required Bandwidth (Mbps)</Label>
              <Input
                type="number"
                min="0"
                value={requiredBandwidth}
                onChange={(e) => setRequiredBandwidth(e.target.value)}
                placeholder="0 = no minimum"
              />
            </div>

            <div>
              <Label className="text-xs flex items-center justify-between">
                <span>Optimization Priority</span>
                <span className="text-muted-foreground">
                  {costWeight[0]}% Cost / {100 - costWeight[0]}% Bandwidth
                </span>
              </Label>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-muted-foreground">BW</span>
                <Slider
                  value={costWeight}
                  onValueChange={setCostWeight}
                  min={0}
                  max={100}
                  step={10}
                  className="flex-1"
                />
                <span className="text-xs text-muted-foreground">Cost</span>
              </div>
            </div>

            <Button 
              onClick={calculateBandwidthPaths} 
              className="w-full" 
              disabled={!bwSource || !bwTarget || bwSource === bwTarget}
            >
              <Zap className="w-4 h-4 mr-1" />
              Calculate Optimal Paths
            </Button>
          </CardContent>
        </Card>

        {/* Bandwidth-Aware Results */}
        {bwPaths.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Recommended Paths ({bwPaths.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-80 overflow-y-auto">
              {bwPaths.map((path, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded border cursor-pointer hover:ring-2 hover:ring-primary transition-all ${
                    idx === 0 ? 'bg-green-500/10 border-green-500/30' : 'bg-muted/50'
                  }`}
                  onClick={() => handleHighlightBwPath(path)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant={idx === 0 ? 'default' : 'outline'} className="text-xs">
                      {idx === 0 ? 'RECOMMENDED' : `Option ${idx + 1}`}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Score: {path.score.toFixed(3)}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-green-600" />
                      <span>Cost: {path.ospfCost}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <HardDrive className="w-3 h-3 text-blue-600" />
                      <span>{path.availableBandwidth.toFixed(0)}M</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ArrowRight className="w-3 h-3" />
                      <span>{path.hops} hops</span>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground mb-2">
                    {path.path.map(getNodeName).join(' → ')}
                  </div>

                  {/* Per-hop bandwidth details */}
                  <div className="space-y-1 bg-background/50 rounded p-2">
                    <div className="text-xs font-semibold text-muted-foreground">Per-Hop Details:</div>
                    {path.hopDetails.map((hop, hopIdx) => (
                      <div key={hopIdx} className="flex items-center justify-between text-xs">
                        <span className="truncate flex-1">
                          {getNodeName(hop.from)} → {getNodeName(hop.to)}
                        </span>
                        <div className="flex items-center gap-2 ml-2">
                          <span className="text-green-600">→{hop.forwardCost}</span>
                          <span className="text-blue-600">←{hop.reverseCost}</span>
                          <span className={`${hop.utilization > 70 ? 'text-red-600' : 'text-orange-600'}`}>
                            {hop.availableBandwidth.toFixed(0)}M
                          </span>
                          {hop.utilization > 70 && (
                            <Badge variant="destructive" className="text-xs px-1">
                              {hop.utilization.toFixed(0)}%
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {path.bottleneckLink && (
                    <div className="mt-2 text-xs text-amber-600 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Bottleneck: {path.availableBandwidth.toFixed(0)} Mbps available
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {bwSource && bwTarget && bwPaths.length === 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              No paths found meeting the bandwidth requirement. Try reducing the required bandwidth.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </ScrollArea>
  );
}
