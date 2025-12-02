import { useMemo } from 'react';
import { useNetworkStore } from '@/store/networkStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeftRight, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  Scale,
  Download,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface AsymmetricLink {
  id: string;
  source: string;
  target: string;
  forwardCost: number;
  reverseCost: number;
  difference: number;
  percentDiff: number;
  capacity?: number;
  sourceInterface?: string;
  targetInterface?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export default function AsymmetryAnalyzer() {
  const topology = useNetworkStore(state => state.topology);
  const setHighlightedLinks = useNetworkStore(state => state.setHighlightedLinks);

  const asymmetricLinks = useMemo(() => {
    if (!topology) return [];

    const links: AsymmetricLink[] = [];

    topology.links.forEach(link => {
      const forwardCost = link.forward_cost ?? link.cost;
      const reverseCost = link.reverse_cost ?? link.cost;
      const difference = Math.abs(forwardCost - reverseCost);
      
      if (difference > 0) {
        const maxCost = Math.max(forwardCost, reverseCost);
        const percentDiff = (difference / maxCost) * 100;
        
        let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
        if (percentDiff > 100) severity = 'critical';
        else if (percentDiff > 50) severity = 'high';
        else if (percentDiff > 25) severity = 'medium';

        links.push({
          id: link.id,
          source: link.source,
          target: link.target,
          forwardCost,
          reverseCost,
          difference,
          percentDiff,
          capacity: link.capacity,
          sourceInterface: link.sourceInterface,
          targetInterface: link.targetInterface,
          severity
        });
      }
    });

    // Sort by severity (critical first) then by difference
    return links.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return b.difference - a.difference;
    });
  }, [topology]);

  const stats = useMemo(() => {
    if (!topology) return null;

    const totalLinks = topology.links.length;
    const asymmetricCount = asymmetricLinks.length;
    const criticalCount = asymmetricLinks.filter(l => l.severity === 'critical').length;
    const highCount = asymmetricLinks.filter(l => l.severity === 'high').length;
    const avgDifference = asymmetricCount > 0 
      ? asymmetricLinks.reduce((sum, l) => sum + l.difference, 0) / asymmetricCount 
      : 0;
    const maxDifference = asymmetricCount > 0 
      ? Math.max(...asymmetricLinks.map(l => l.difference)) 
      : 0;

    return {
      totalLinks,
      asymmetricCount,
      symmetricCount: totalLinks - asymmetricCount,
      criticalCount,
      highCount,
      avgDifference: avgDifference.toFixed(1),
      maxDifference
    };
  }, [topology, asymmetricLinks]);

  const getNodeName = (nodeId: string) => {
    return topology?.nodes.find(n => n.id === nodeId)?.name || nodeId;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-500/10 border-red-500/20';
      case 'high': return 'text-orange-600 bg-orange-500/10 border-orange-500/20';
      case 'medium': return 'text-yellow-600 bg-yellow-500/10 border-yellow-500/20';
      default: return 'text-green-600 bg-green-500/10 border-green-500/20';
    }
  };

  const handleHighlightLink = (linkId: string) => {
    setHighlightedLinks(new Set([linkId]));
  };

  const handleHighlightAll = () => {
    setHighlightedLinks(new Set(asymmetricLinks.map(l => l.id)));
  };

  const handleExportReport = () => {
    if (!topology || asymmetricLinks.length === 0) return;

    const report = {
      timestamp: new Date().toISOString(),
      summary: stats,
      asymmetricLinks: asymmetricLinks.map(link => ({
        linkId: link.id,
        source: getNodeName(link.source),
        target: getNodeName(link.target),
        forwardCost: link.forwardCost,
        reverseCost: link.reverseCost,
        difference: link.difference,
        percentDifference: link.percentDiff.toFixed(1) + '%',
        severity: link.severity,
        capacity: link.capacity,
        sourceInterface: link.sourceInterface,
        targetInterface: link.targetInterface
      }))
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `asymmetry-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!topology) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground p-4">
        <p className="text-sm">Upload a topology to analyze cost asymmetry</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col p-4 space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <Scale className="w-5 h-5 text-primary" />
            Cost Asymmetry Analyzer
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            Identifies links where forward and reverse OSPF costs differ significantly.
          </p>
        </div>

        {/* Summary Stats */}
        {stats && (
          <div className="grid grid-cols-2 gap-2">
            <Card>
              <CardContent className="p-3">
                <div className="text-xs text-muted-foreground">Asymmetric Links</div>
                <div className="text-2xl font-bold">{stats.asymmetricCount}</div>
                <div className="text-xs text-muted-foreground">
                  of {stats.totalLinks} total
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="text-xs text-muted-foreground">Critical/High</div>
                <div className="text-2xl font-bold text-red-600">
                  {stats.criticalCount + stats.highCount}
                </div>
                <div className="text-xs text-muted-foreground">
                  need attention
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Asymmetry Distribution */}
        {stats && stats.asymmetricCount > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Asymmetry Distribution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>Symmetric Links</span>
                <span>{stats.symmetricCount} ({((stats.symmetricCount / stats.totalLinks) * 100).toFixed(0)}%)</span>
              </div>
              <Progress 
                value={(stats.symmetricCount / stats.totalLinks) * 100} 
                className="h-2"
              />
              <div className="flex justify-between text-xs">
                <span>Avg Cost Difference</span>
                <span>{stats.avgDifference}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Max Cost Difference</span>
                <span className="text-red-600 font-semibold">{stats.maxDifference}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        {asymmetricLinks.length > 0 && (
          <div className="flex gap-2">
            <Button
              onClick={handleHighlightAll}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <Eye className="w-4 h-4 mr-1" />
              Highlight All
            </Button>
            <Button
              onClick={handleExportReport}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
          </div>
        )}

        <Separator />

        {/* Asymmetric Links List */}
        {asymmetricLinks.length === 0 ? (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No asymmetric links detected. All links have equal forward and reverse costs.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase">
              Asymmetric Links ({asymmetricLinks.length})
            </h4>
            
            {asymmetricLinks.map((link) => (
              <Card 
                key={link.id} 
                className={`cursor-pointer hover:ring-2 hover:ring-primary transition-all ${getSeverityColor(link.severity)}`}
                onClick={() => handleHighlightLink(link.id)}
              >
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium truncate">
                      {getNodeName(link.source)} ↔ {getNodeName(link.target)}
                    </div>
                    <Badge variant="outline" className={getSeverityColor(link.severity)}>
                      {link.severity.toUpperCase()}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-green-600" />
                      <span>Forward: {link.forwardCost}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingDown className="w-3 h-3 text-blue-600" />
                      <span>Reverse: {link.reverseCost}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1">
                      <ArrowLeftRight className="w-3 h-3" />
                      <span>Δ {link.difference} ({link.percentDiff.toFixed(0)}%)</span>
                    </div>
                    {link.capacity && (
                      <span className="text-orange-600">{link.capacity} Mbps</span>
                    )}
                  </div>

                  {(link.sourceInterface || link.targetInterface) && (
                    <div className="text-xs text-muted-foreground">
                      {link.sourceInterface} ↔ {link.targetInterface}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Legend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Severity Legend</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-red-600 bg-red-500/10">Critical</Badge>
              <span>&gt;100% difference</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-orange-600 bg-orange-500/10">High</Badge>
              <span>50-100% difference</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-yellow-600 bg-yellow-500/10">Medium</Badge>
              <span>25-50% difference</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-green-600 bg-green-500/10">Low</Badge>
              <span>&lt;25% difference</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
