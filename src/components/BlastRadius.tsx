import { useState, useMemo } from 'react';
import { useNetworkStore } from '@/store/networkStore';
import { calculateBlastRadius } from '@/utils/graphAlgorithms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { AlertTriangle, Activity, TrendingUp, TrendingDown, Download, Eye, Zap } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';

export default function BlastRadius() {
  const topology = useNetworkStore(state => state.topology);
  const setHighlightedLinks = useNetworkStore(state => state.setHighlightedLinks);

  const [selectedLinkId, setSelectedLinkId] = useState<string>('');
  const [simulatedCost, setSimulatedCost] = useState<string>('');
  const [simulateLinkDown, setSimulateLinkDown] = useState<boolean>(false);
  const [result, setResult] = useState<ReturnType<typeof calculateBlastRadius> | null>(null);
  const [calculating, setCalculating] = useState(false);

  const links = useMemo(() => {
    return topology?.links || [];
  }, [topology]);

  const selectedLink = useMemo(() => {
    return links.find(l => l.id === selectedLinkId);
  }, [links, selectedLinkId]);

  const handleLinkSelect = (linkId: string) => {
    setSelectedLinkId(linkId);
    const link = links.find(l => l.id === linkId);
    if (link) {
      setSimulatedCost((link.forward_cost ?? link.cost).toString());
      setHighlightedLinks(new Set([linkId]));
    }
    setResult(null);
  };

  const handleAnalyze = () => {
    if (!topology || !selectedLink) return;

    // If simulating link down, use very high cost (65535 is OSPF max)
    const cost = simulateLinkDown ? 65535 : parseInt(simulatedCost);
    if (!simulateLinkDown && (isNaN(cost) || cost < 1)) return;

    setCalculating(true);

    setTimeout(() => {
      const blastResult = calculateBlastRadius(topology, selectedLink.id, cost);
      setResult(blastResult);
      
      // Highlight all affected links
      const affectedLinkIds = new Set<string>([selectedLink.id]);
      // Find links that are part of affected paths
      blastResult.affectedPaths.forEach(path => {
        if (path.pathChanged) {
          // Mark this as a critical change
          affectedLinkIds.add(selectedLink.id);
        }
      });
      setHighlightedLinks(affectedLinkIds);
      setCalculating(false);
    }, 100);
  };

  const handleClear = () => {
    setSelectedLinkId('');
    setSimulatedCost('');
    setSimulateLinkDown(false);
    setResult(null);
    setHighlightedLinks(new Set());
  };

  const handleExportReport = () => {
    if (!result || !selectedLink || !topology) return;

    const report = {
      timestamp: new Date().toISOString(),
      analysis: {
        link: {
          id: selectedLink.id,
          source: selectedLink.source,
          target: selectedLink.target,
          originalCost: selectedLink.forward_cost ?? selectedLink.cost,
          simulatedCost: simulateLinkDown ? 'LINK_DOWN (65535)' : simulatedCost,
          sourceInterface: selectedLink.sourceInterface,
          targetInterface: selectedLink.targetInterface
        },
        impact: {
          severity: getSeverity()?.level,
          affectedNodesCount: result.affectedNodes.size,
          totalNodes: topology.nodes.length,
          affectedPathsCount: result.affectedPaths.length,
          pathChangesCount: result.affectedPaths.filter(p => p.pathChanged).length
        },
        affectedPaths: result.affectedPaths.map(p => ({
          source: p.source,
          target: p.target,
          oldCost: p.oldCost,
          newCost: p.newCost,
          costDelta: p.newCost - p.oldCost,
          pathChanged: p.pathChanged
        })),
        affectedNodes: Array.from(result.affectedNodes)
      }
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blast-radius-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getNodeName = (nodeId: string) => {
    return topology?.nodes.find(n => n.id === nodeId)?.name || nodeId;
  };

  const getSeverity = () => {
    if (!result || !topology) return null;
    
    const impactPercentage = (result.affectedNodes.size / topology.nodes.length) * 100;
    
    if (impactPercentage > 75) return { level: 'critical', color: 'text-red-600', bg: 'bg-red-500' };
    if (impactPercentage > 50) return { level: 'high', color: 'text-orange-600', bg: 'bg-orange-500' };
    if (impactPercentage > 25) return { level: 'medium', color: 'text-yellow-600', bg: 'bg-yellow-500' };
    return { level: 'low', color: 'text-green-600', bg: 'bg-green-500' };
  };

  if (!topology) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground p-4">
        <p className="text-sm">Upload a topology to analyze blast radius</p>
      </div>
    );
  }

  const severity = getSeverity();

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col p-4 space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            OSPF Impact Analysis
          </h3>

          <div className="space-y-4">
            <div>
              <Label htmlFor="blast-link">Select Link</Label>
              <Select value={selectedLinkId} onValueChange={handleLinkSelect}>
                <SelectTrigger id="blast-link">
                  <SelectValue placeholder="Select a link to analyze" />
                </SelectTrigger>
                <SelectContent>
                  {links.map(link => (
                    <SelectItem key={link.id} value={link.id}>
                      <div className="flex items-center gap-2">
                        <span>{getNodeName(link.source)} → {getNodeName(link.target)}</span>
                        <Badge variant="outline" className="text-xs">
                          {link.forward_cost ?? link.cost}
                        </Badge>
                        {link.type === 'asymmetric' && (
                          <Badge variant="secondary" className="text-xs">Asym</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedLink && (
              <Card className="bg-muted/50">
                <CardContent className="pt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Forward Cost:</span>
                    <Badge variant="outline">{selectedLink.forward_cost ?? selectedLink.cost}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reverse Cost:</span>
                    <Badge variant="outline">{selectedLink.reverse_cost ?? selectedLink.cost}</Badge>
                  </div>
                  {selectedLink.sourceInterface && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Interfaces:</span>
                      <span className="text-xs text-blue-500">
                        {selectedLink.sourceInterface}
                      </span>
                    </div>
                  )}
                  {selectedLink.type && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <Badge variant={selectedLink.type === 'asymmetric' ? 'destructive' : 'secondary'}>
                        {selectedLink.type}
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {selectedLink && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-red-500" />
                    Simulate Link Down
                  </Label>
                  <Switch 
                    checked={simulateLinkDown} 
                    onCheckedChange={(checked) => {
                      setSimulateLinkDown(checked);
                      if (checked) setSimulatedCost('65535');
                    }}
                  />
                </div>

                {!simulateLinkDown && (
                  <div>
                    <Label htmlFor="simCost">Simulated Cost</Label>
                    <Input
                      id="simCost"
                      type="number"
                      min="1"
                      max="65535"
                      placeholder="Enter simulated cost"
                      value={simulatedCost}
                      onChange={(e) => setSimulatedCost(e.target.value)}
                    />
                  </div>
                )}

                {simulateLinkDown && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Simulating link failure (cost = 65535). This shows what happens if this link goes down.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handleAnalyze}
                    disabled={(!simulatedCost && !simulateLinkDown) || calculating}
                    className="flex-1"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    {calculating ? 'Analyzing...' : 'Analyze Impact'}
                  </Button>
                  <Button
                    onClick={handleClear}
                    variant="outline"
                    disabled={!result && !selectedLinkId}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

      {result && (
        <>
          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase">
                Impact Results
              </h4>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleExportReport}
                title="Export Report"
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>

            <Card className={`border-2 ${severity?.color}`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Impact Severity
                  </span>
                  <Badge variant="outline" className={severity?.color}>
                    {severity?.level.toUpperCase()}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Affected Nodes</span>
                    <span className="font-semibold">
                      {result.affectedNodes.size} / {topology.nodes.length}
                    </span>
                  </div>
                  <Progress 
                    value={(result.affectedNodes.size / topology.nodes.length) * 100}
                    className="h-2"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Affected Paths</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Paths Affected</span>
                    <Badge>{result.affectedPaths.length}</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Path Changes</span>
                    <Badge variant="secondary">
                      {result.affectedPaths.filter(p => p.pathChanged).length}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {result.affectedPaths.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase">
                  Path Details
                </h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {result.affectedPaths.slice(0, 10).map((path, index) => (
                    <Card key={index} className="text-xs">
                      <CardContent className="p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            {getNodeName(path.source)} → {getNodeName(path.target)}
                          </span>
                          {path.pathChanged && (
                            <Badge variant="destructive" className="text-xs">
                              Path Changed
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span>Cost: {path.oldCost}</span>
                          {path.newCost > path.oldCost ? (
                            <TrendingUp className="w-3 h-3 text-red-500" />
                          ) : path.newCost < path.oldCost ? (
                            <TrendingDown className="w-3 h-3 text-green-500" />
                          ) : null}
                          <span>{path.newCost}</span>
                          <span className="ml-auto">
                            ({path.newCost > path.oldCost ? '+' : ''}
                            {path.newCost - path.oldCost})
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {result.affectedPaths.length > 10 && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      ... and {result.affectedPaths.length - 10} more paths
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Affected Nodes List */}
            {result.affectedNodes.size > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase">
                  Affected Nodes ({result.affectedNodes.size})
                </h4>
                <div className="flex flex-wrap gap-1">
                  {Array.from(result.affectedNodes).slice(0, 20).map((nodeId) => (
                    <Badge key={nodeId} variant="outline" className="text-xs">
                      {getNodeName(nodeId)}
                    </Badge>
                  ))}
                  {result.affectedNodes.size > 20 && (
                    <Badge variant="secondary" className="text-xs">
                      +{result.affectedNodes.size - 20} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
      </div>
    </ScrollArea>
  );
}
