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
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Clock,
  Zap,
  AlertTriangle,
  Download,
  Play,
  RotateCcw,
  TrendingUp,
  Radio
} from 'lucide-react';

interface LatencyPath {
  path: string[];
  ospfCost: number;
  hops: number;
  estimatedLatency: number; // ms
  propagationDelay: number; // ms
  processingDelay: number; // ms
  queueingDelay: number; // ms
  hopDetails: Array<{
    from: string;
    to: string;
    distance: number; // km
    propagationDelay: number; // ms
    processingDelay: number; // ms
    linkUtilization: number;
  }>;
}

export default function LatencyAnalyzer() {
  const topology = useNetworkStore(state => state.topology);
  const setHighlightedPath = useNetworkStore(state => state.setHighlightedPath);
  const setHighlightedLinks = useNetworkStore(state => state.setHighlightedLinks);

  const [source, setSource] = useState<string>('');
  const [target, setTarget] = useState<string>('');
  const [latencyPaths, setLatencyPaths] = useState<LatencyPath[]>([]);
  const [avgLinkDistance, setAvgLinkDistance] = useState<number[]>([500]); // km
  const [processingDelayPerHop, setProcessingDelayPerHop] = useState<number[]>([1]); // ms
  const [slaThreshold, setSlaThreshold] = useState<string>('50'); // ms

  const links = useMemo(() => topology?.links || [], [topology]);
  const nodes = useMemo(() => topology?.nodes || [], [topology]);

  const getNodeName = (nodeId: string) => {
    return nodes.find(n => n.id === nodeId)?.name || nodeId;
  };

  // Speed of light in fiber: ~200,000 km/s = 0.005 ms/km
  const PROPAGATION_SPEED = 0.005; // ms per km

  const calculateLatency = useCallback(() => {
    if (!topology || !source || !target || source === target) return;

    const paths = findKShortestPaths(topology, source, target, 5);
    if (paths.length === 0) {
      setLatencyPaths([]);
      return;
    }

    const latencyResults: LatencyPath[] = paths.map(pathResult => {
      const hopDetails: LatencyPath['hopDetails'] = [];
      let totalPropagationDelay = 0;
      let totalProcessingDelay = 0;
      let totalQueueingDelay = 0;

      for (let i = 0; i < pathResult.path.length - 1; i++) {
        const from = pathResult.path[i];
        const to = pathResult.path[i + 1];

        const link = links.find(
          l => (l.source === from && l.target === to) || (l.target === from && l.source === to)
        );

        // Estimate distance based on OSPF cost or use average
        const distance = link ? (link.cost * 10) : avgLinkDistance[0];
        const propagationDelay = distance * PROPAGATION_SPEED;
        const processingDelay = processingDelayPerHop[0];
        
        // Queueing delay increases with utilization
        const utilization = link?.utilization || 0;
        const queueingDelay = utilization > 50 ? (utilization / 100) * 2 : 0.1;

        hopDetails.push({
          from,
          to,
          distance,
          propagationDelay,
          processingDelay,
          linkUtilization: utilization
        });

        totalPropagationDelay += propagationDelay;
        totalProcessingDelay += processingDelay;
        totalQueueingDelay += queueingDelay;
      }

      const estimatedLatency = totalPropagationDelay + totalProcessingDelay + totalQueueingDelay;

      return {
        path: pathResult.path,
        ospfCost: pathResult.forwardCost,
        hops: pathResult.hops,
        estimatedLatency,
        propagationDelay: totalPropagationDelay,
        processingDelay: totalProcessingDelay,
        queueingDelay: totalQueueingDelay,
        hopDetails
      };
    });

    // Sort by latency
    latencyResults.sort((a, b) => a.estimatedLatency - b.estimatedLatency);
    setLatencyPaths(latencyResults);

    if (latencyResults.length > 0) {
      setHighlightedPath(latencyResults[0].path);
    }
  }, [topology, source, target, avgLinkDistance, processingDelayPerHop, links, setHighlightedPath]);

  const reset = () => {
    setSource('');
    setTarget('');
    setLatencyPaths([]);
    setHighlightedPath(null);
    setHighlightedLinks(new Set());
  };

  const exportReport = () => {
    if (latencyPaths.length === 0) return;

    const report = {
      timestamp: new Date().toISOString(),
      source: getNodeName(source),
      target: getNodeName(target),
      slaThreshold: parseFloat(slaThreshold),
      parameters: {
        avgLinkDistance: avgLinkDistance[0] + ' km',
        processingDelayPerHop: processingDelayPerHop[0] + ' ms'
      },
      paths: latencyPaths.map((path, idx) => ({
        rank: idx + 1,
        path: path.path.map(getNodeName).join(' → '),
        ospfCost: path.ospfCost,
        hops: path.hops,
        estimatedLatency: path.estimatedLatency.toFixed(2) + ' ms',
        propagationDelay: path.propagationDelay.toFixed(2) + ' ms',
        processingDelay: path.processingDelay.toFixed(2) + ' ms',
        queueingDelay: path.queueingDelay.toFixed(2) + ' ms',
        meetsS LA: path.estimatedLatency <= parseFloat(slaThreshold)
      }))
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `latency-analysis-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!topology) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground p-4">
        <p className="text-sm">Upload a topology to analyze latency</p>
      </div>
    );
  }

  const slaValue = parseFloat(slaThreshold) || 50;

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col p-4 space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Latency & Delay Estimator
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            Calculate end-to-end latency considering propagation, processing, and queueing delays.
          </p>
        </div>

        {/* Parameters */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Latency Parameters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs flex items-center justify-between">
                <span>Avg Link Distance</span>
                <span className="text-muted-foreground">{avgLinkDistance[0]} km</span>
              </Label>
              <Slider
                value={avgLinkDistance}
                onValueChange={setAvgLinkDistance}
                min={100}
                max={2000}
                step={50}
                className="mt-2"
              />
            </div>

            <div>
              <Label className="text-xs flex items-center justify-between">
                <span>Processing Delay/Hop</span>
                <span className="text-muted-foreground">{processingDelayPerHop[0]} ms</span>
              </Label>
              <Slider
                value={processingDelayPerHop}
                onValueChange={setProcessingDelayPerHop}
                min={0.1}
                max={5}
                step={0.1}
                className="mt-2"
              />
            </div>

            <div>
              <Label className="text-xs">SLA Threshold (ms)</Label>
              <Input
                type="number"
                min="1"
                value={slaThreshold}
                onChange={(e) => setSlaThreshold(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Path Selection */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Calculate Latency</CardTitle>
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

            <div className="grid grid-cols-2 gap-2">
              <Button 
                onClick={calculateLatency} 
                disabled={!source || !target || source === target}
                size="sm"
              >
                <Play className="w-4 h-4 mr-1" />
                Calculate
              </Button>
              <Button onClick={reset} variant="outline" size="sm">
                <RotateCcw className="w-4 h-4 mr-1" />
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {latencyPaths.length > 0 && (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>Latency Comparison</span>
                  <Button variant="outline" size="sm" onClick={exportReport}>
                    <Download className="w-3 h-3" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-green-500/10 p-3 rounded">
                    <div className="text-2xl font-bold text-green-600">
                      {latencyPaths[0].estimatedLatency.toFixed(1)}
                    </div>
                    <div className="text-xs text-muted-foreground">Best Latency (ms)</div>
                  </div>
                  <div className="bg-blue-500/10 p-3 rounded">
                    <div className="text-2xl font-bold text-blue-600">
                      {latencyPaths.filter(p => p.estimatedLatency <= slaValue).length}
                    </div>
                    <div className="text-xs text-muted-foreground">Meets SLA</div>
                  </div>
                </div>

                <Alert>
                  <Radio className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Propagation delay based on {avgLinkDistance[0]}km avg distance at ~200,000 km/s
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Path Details */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Paths Ranked by Latency</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-96 overflow-y-auto">
                {latencyPaths.map((path, idx) => {
                  const meetsS LA = path.estimatedLatency <= slaValue;
                  const isBest = idx === 0;

                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded border cursor-pointer hover:ring-2 hover:ring-primary transition-all ${
                        isBest 
                          ? 'bg-green-500/10 border-green-500/30' 
                          : meetsS LA 
                          ? 'bg-blue-500/10 border-blue-500/30'
                          : 'bg-red-500/10 border-red-500/30'
                      }`}
                      onClick={() => setHighlightedPath(path.path)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant={isBest ? 'default' : 'outline'} className="text-xs">
                          {isBest ? 'LOWEST LATENCY' : `Option ${idx + 1}`}
                        </Badge>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={meetsS LA ? 'default' : 'destructive'} 
                            className="text-xs"
                          >
                            {path.estimatedLatency.toFixed(1)} ms
                          </Badge>
                          {!meetsS LA && (
                            <AlertTriangle className="w-3 h-3 text-red-600" />
                          )}
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground mb-2">
                        {path.path.map(getNodeName).join(' → ')}
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                        <div>
                          <span className="text-muted-foreground">OSPF:</span> {path.ospfCost}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Hops:</span> {path.hops}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Dist:</span> {path.hopDetails.reduce((sum, h) => sum + h.distance, 0).toFixed(0)}km
                        </div>
                      </div>

                      {/* Delay Breakdown */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Propagation</span>
                          <span>{path.propagationDelay.toFixed(2)} ms</span>
                        </div>
                        <Progress 
                          value={(path.propagationDelay / path.estimatedLatency) * 100} 
                          className="h-1"
                        />
                        
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Processing</span>
                          <span>{path.processingDelay.toFixed(2)} ms</span>
                        </div>
                        <Progress 
                          value={(path.processingDelay / path.estimatedLatency) * 100} 
                          className="h-1"
                        />
                        
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Queueing</span>
                          <span>{path.queueingDelay.toFixed(2)} ms</span>
                        </div>
                        <Progress 
                          value={(path.queueingDelay / path.estimatedLatency) * 100} 
                          className="h-1"
                        />
                      </div>

                      {/* Cost vs Latency Trade-off */}
                      {path.ospfCost !== latencyPaths[0].ospfCost && (
                        <div className="mt-2 text-xs">
                          <Badge variant="outline" className="text-xs">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            +{((path.estimatedLatency - latencyPaths[0].estimatedLatency) / latencyPaths[0].estimatedLatency * 100).toFixed(0)}% latency
                          </Badge>
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Legend */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Delay Components</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <Zap className="w-3 h-3 text-blue-600" />
                  <span><strong>Propagation:</strong> Speed of light in fiber (~0.005 ms/km)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3 text-green-600" />
                  <span><strong>Processing:</strong> Router processing time per hop</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-3 h-3 text-orange-600" />
                  <span><strong>Queueing:</strong> Increases with link utilization</span>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </ScrollArea>
  );
}
