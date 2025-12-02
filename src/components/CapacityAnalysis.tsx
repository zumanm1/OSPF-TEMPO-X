import { useMemo, useState } from 'react';
import { useNetworkStore } from '@/store/networkStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BarChart3, AlertCircle, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function CapacityAnalysis() {
  const topology = useNetworkStore(state => state.topology);
  const [growthPercentage, setGrowthPercentage] = useState<string>('');
  const [showGrowthSimulation, setShowGrowthSimulation] = useState(false);

  const capacityStats = useMemo(() => {
    if (!topology) return null;

    const linksWithCapacity = topology.links.filter(
      l => l.capacity !== undefined && l.utilization !== undefined
    );

    if (linksWithCapacity.length === 0) return null;

    const avgUtilization =
      linksWithCapacity.reduce((sum, l) => sum + (l.utilization || 0), 0) /
      linksWithCapacity.length;

    const congestionPoints = linksWithCapacity.filter(l => (l.utilization || 0) > 80);
    const warningPoints = linksWithCapacity.filter(
      l => (l.utilization || 0) > 60 && (l.utilization || 0) <= 80
    );

    const totalCapacity = linksWithCapacity.reduce((sum, l) => sum + (l.capacity || 0), 0);
    const usedCapacity = linksWithCapacity.reduce(
      (sum, l) => sum + ((l.capacity || 0) * (l.utilization || 0)) / 100,
      0
    );

    return {
      linksWithCapacity,
      avgUtilization: avgUtilization.toFixed(1),
      congestionPoints,
      warningPoints,
      totalCapacity,
      usedCapacity: usedCapacity.toFixed(0),
      headroom: ((totalCapacity - usedCapacity) / totalCapacity * 100).toFixed(1)
    };
  }, [topology]);

  const simulatedGrowth = useMemo(() => {
    if (!capacityStats || !growthPercentage || !showGrowthSimulation) return null;

    const growth = parseFloat(growthPercentage);
    if (isNaN(growth)) return null;

    const projectedLinks = capacityStats.linksWithCapacity.map(link => {
      const currentUtil = link.utilization || 0;
      const projectedUtil = Math.min(100, currentUtil * (1 + growth / 100));
      return {
        ...link,
        projectedUtilization: projectedUtil,
        atRisk: projectedUtil > 80
      };
    });

    const atRiskCount = projectedLinks.filter(l => l.atRisk).length;

    return {
      projectedLinks,
      atRiskCount
    };
  }, [capacityStats, growthPercentage, showGrowthSimulation]);

  const getNodeName = (nodeId: string) => {
    return topology?.nodes.find(n => n.id === nodeId)?.name || nodeId;
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization > 80) return 'text-red-600';
    if (utilization > 60) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getUtilizationBg = (utilization: number) => {
    if (utilization > 80) return 'bg-red-500';
    if (utilization > 60) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const handleSimulate = () => {
    setShowGrowthSimulation(true);
  };

  const handleClear = () => {
    setGrowthPercentage('');
    setShowGrowthSimulation(false);
  };

  if (!topology) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground p-4">
        <p className="text-sm">Upload a topology to analyze capacity</p>
      </div>
    );
  }

  if (!capacityStats) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No capacity data available in the topology. Links must have capacity and utilization fields.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-4 space-y-4 overflow-y-auto">
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          Capacity Analysis
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground font-normal">
                Avg Utilization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{capacityStats.avgUtilization}%</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground font-normal">
                Headroom
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{capacityStats.headroom}%</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground font-normal">
                Congestion Points
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {capacityStats.congestionPoints.length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground font-normal">
                Warning Points
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {capacityStats.warningPoints.length}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase">
          Traffic Growth Simulation
        </h4>

        <div>
          <Label htmlFor="growth">Growth Percentage (%)</Label>
          <div className="flex gap-2">
            <Input
              id="growth"
              type="number"
              min="0"
              max="200"
              placeholder="e.g., 20"
              value={growthPercentage}
              onChange={(e) => setGrowthPercentage(e.target.value)}
            />
            <Button onClick={handleSimulate} disabled={!growthPercentage}>
              <TrendingUp className="w-4 h-4 mr-1" />
              Simulate
            </Button>
          </div>
        </div>

        {simulatedGrowth && (
          <Alert variant={simulatedGrowth.atRiskCount > 0 ? 'destructive' : 'default'}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              With {growthPercentage}% growth, {simulatedGrowth.atRiskCount} link(s) will exceed 80% utilization
            </AlertDescription>
          </Alert>
        )}
      </div>

      <Separator />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase">
            Link Utilization
          </h4>
          {showGrowthSimulation && (
            <Button size="sm" variant="outline" onClick={handleClear}>
              Clear Simulation
            </Button>
          )}
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {(simulatedGrowth?.projectedLinks || capacityStats.linksWithCapacity)
            .sort((a, b) => {
              const aUtil = 'projectedUtilization' in a ? (a.projectedUtilization as number) : (a.utilization || 0);
              const bUtil = 'projectedUtilization' in b ? (b.projectedUtilization as number) : (b.utilization || 0);
              return bUtil - aUtil;
            })
            .map((link) => {
              const currentUtil = link.utilization || 0;
              const displayUtil = 'projectedUtilization' in link ? (link.projectedUtilization as number) : currentUtil;
              const isProjected = 'projectedUtilization' in link;
              const atRisk = 'atRisk' in link ? (link.atRisk as boolean) : false;

              return (
                <Card key={link.id} className={isProjected && atRisk ? 'border-red-500' : ''}>
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">
                        {getNodeName(link.source)} → {getNodeName(link.target)}
                      </span>
                      <Badge
                        variant="outline"
                        className={getUtilizationColor(displayUtil)}
                      >
                        {displayUtil.toFixed(1)}%
                      </Badge>
                    </div>

                    <Progress
                      value={displayUtil}
                      className="h-2"
                    />

                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>
                        {((link.capacity || 0) * displayUtil / 100).toFixed(0)} / {link.capacity} Mbps
                      </span>
                      {isProjected && (
                        <span className="text-orange-600">
                          +{(displayUtil - currentUtil).toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      </div>
    </div>
  );
}
