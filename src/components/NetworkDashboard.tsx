import { useMemo } from 'react';
import { useNetworkStore } from '@/store/networkStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  LayoutDashboard, 
  Server, 
  Link2, 
  Globe, 
  Activity,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Gauge,
  Shield,
  Zap
} from 'lucide-react';

interface HealthMetric {
  name: string;
  value: number;
  status: 'good' | 'warning' | 'critical';
  description: string;
}

export default function NetworkDashboard() {
  const topology = useNetworkStore(state => state.topology);
  
  const nodes = useMemo(() => topology?.nodes || [], [topology]);
  const links = useMemo(() => topology?.links || [], [topology]);

  // Calculate health metrics
  const healthMetrics = useMemo((): HealthMetric[] => {
    if (!topology) return [];

    const metrics: HealthMetric[] = [];

    // 1. Connectivity Score - % of nodes with 2+ connections
    const nodesWithRedundancy = nodes.filter(node => {
      const connections = links.filter(l => l.source === node.id || l.target === node.id);
      return connections.length >= 2;
    }).length;
    const connectivityScore = nodes.length > 0 ? (nodesWithRedundancy / nodes.length) * 100 : 0;
    metrics.push({
      name: 'Connectivity',
      value: connectivityScore,
      status: connectivityScore >= 80 ? 'good' : connectivityScore >= 50 ? 'warning' : 'critical',
      description: `${nodesWithRedundancy}/${nodes.length} nodes have redundant paths`
    });

    // 2. Capacity Health - % of links under 70% utilization
    const healthyLinks = links.filter(l => (l.utilization || 0) < 70).length;
    const capacityScore = links.length > 0 ? (healthyLinks / links.length) * 100 : 100;
    metrics.push({
      name: 'Capacity',
      value: capacityScore,
      status: capacityScore >= 80 ? 'good' : capacityScore >= 50 ? 'warning' : 'critical',
      description: `${healthyLinks}/${links.length} links under 70% utilization`
    });

    // 3. Symmetry Score - % of links with symmetric costs
    const symmetricLinks = links.filter(l => !l.is_asymmetric && l.forward_cost === l.reverse_cost).length;
    const symmetryScore = links.length > 0 ? (symmetricLinks / links.length) * 100 : 100;
    metrics.push({
      name: 'Symmetry',
      value: symmetryScore,
      status: symmetryScore >= 90 ? 'good' : symmetryScore >= 70 ? 'warning' : 'critical',
      description: `${symmetricLinks}/${links.length} links have symmetric costs`
    });

    // 4. Geographic Diversity - connections between different countries
    const countries = [...new Set(nodes.map(n => n.country).filter(Boolean))];
    const interCountryLinks = links.filter(l => {
      const sourceNode = nodes.find(n => n.id === l.source);
      const targetNode = nodes.find(n => n.id === l.target);
      return sourceNode?.country && targetNode?.country && sourceNode.country !== targetNode.country;
    }).length;
    const diversityScore = countries.length > 1 ? Math.min(100, (interCountryLinks / (countries.length - 1)) * 50) : 100;
    metrics.push({
      name: 'Diversity',
      value: diversityScore,
      status: diversityScore >= 70 ? 'good' : diversityScore >= 40 ? 'warning' : 'critical',
      description: `${interCountryLinks} inter-country links across ${countries.length} regions`
    });

    return metrics;
  }, [topology, nodes, links]);

  // Overall health score
  const overallHealth = useMemo(() => {
    if (healthMetrics.length === 0) return 0;
    return healthMetrics.reduce((sum, m) => sum + m.value, 0) / healthMetrics.length;
  }, [healthMetrics]);

  // Network statistics
  const stats = useMemo(() => {
    if (!topology) return null;

    const countries = [...new Set(nodes.map(n => n.country).filter(Boolean))];
    const avgCost = links.length > 0 ? links.reduce((sum, l) => sum + l.cost, 0) / links.length : 0;
    const totalCapacity = links.reduce((sum, l) => sum + (l.capacity || 0), 0);
    const avgUtilization = links.length > 0 
      ? links.reduce((sum, l) => sum + (l.utilization || 0), 0) / links.length 
      : 0;
    const backboneLinks = links.filter(l => l.type === 'backbone').length;
    const asymmetricLinks = links.filter(l => l.is_asymmetric || l.type === 'asymmetric').length;

    // Calculate average degree (connections per node)
    const avgDegree = nodes.length > 0 
      ? (links.length * 2) / nodes.length 
      : 0;

    return {
      countries,
      avgCost,
      totalCapacity,
      avgUtilization,
      backboneLinks,
      asymmetricLinks,
      avgDegree
    };
  }, [topology, nodes, links]);

  // Critical items
  const criticalItems = useMemo(() => {
    const items: Array<{ type: string; message: string; severity: 'critical' | 'warning' }> = [];

    // High utilization links
    links.forEach(link => {
      if ((link.utilization || 0) >= 90) {
        const sourceNode = nodes.find(n => n.id === link.source);
        const targetNode = nodes.find(n => n.id === link.target);
        items.push({
          type: 'capacity',
          message: `${sourceNode?.name || link.source} → ${targetNode?.name || link.target} at ${link.utilization?.toFixed(0)}%`,
          severity: 'critical'
        });
      } else if ((link.utilization || 0) >= 70) {
        const sourceNode = nodes.find(n => n.id === link.source);
        const targetNode = nodes.find(n => n.id === link.target);
        items.push({
          type: 'capacity',
          message: `${sourceNode?.name || link.source} → ${targetNode?.name || link.target} at ${link.utilization?.toFixed(0)}%`,
          severity: 'warning'
        });
      }
    });

    // Single-connected nodes (SPOF)
    nodes.forEach(node => {
      const connections = links.filter(l => l.source === node.id || l.target === node.id);
      if (connections.length === 1) {
        items.push({
          type: 'spof',
          message: `${node.name} has only 1 connection`,
          severity: 'warning'
        });
      } else if (connections.length === 0) {
        items.push({
          type: 'isolated',
          message: `${node.name} is isolated`,
          severity: 'critical'
        });
      }
    });

    return items.slice(0, 10); // Limit to top 10
  }, [nodes, links]);

  // Country distribution
  const countryDistribution = useMemo(() => {
    const distribution = new Map<string, number>();
    nodes.forEach(node => {
      const country = node.country || 'Unknown';
      distribution.set(country, (distribution.get(country) || 0) + 1);
    });
    return Array.from(distribution.entries())
      .sort((a, b) => b[1] - a[1]);
  }, [nodes]);

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getHealthBg = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (!topology) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Load a topology to view dashboard</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <LayoutDashboard className="w-4 h-4" />
          Network Dashboard
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-3">
        <ScrollArea className="h-full">
          <div className="space-y-4">
            {/* Overall Health Score */}
            <div className="text-center p-4 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200/50 dark:border-blue-800/50">
              <div className="text-xs text-muted-foreground mb-1 font-medium">Overall Health Score</div>
              <div className={`text-4xl font-bold smooth-transition ${getHealthColor(overallHealth)}`}>
                {overallHealth.toFixed(0)}%
              </div>
              <div className="flex items-center justify-center gap-1 mt-2">
                {overallHealth >= 80 ? (
                  <><CheckCircle className="w-4 h-4 text-green-500" /><span className="text-xs text-green-600 dark:text-green-400 font-medium">Healthy</span></>
                ) : overallHealth >= 50 ? (
                  <><AlertTriangle className="w-4 h-4 text-yellow-500" /><span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">Needs Attention</span></>
                ) : (
                  <><AlertTriangle className="w-4 h-4 text-red-500" /><span className="text-xs text-red-600 dark:text-red-400 font-medium">Critical</span></>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="stat-card text-center">
                <Server className="w-4 h-4 mx-auto text-blue-500 mb-1" />
                <div className="text-lg font-bold">{nodes.length}</div>
                <div className="text-[10px] text-muted-foreground">Nodes</div>
              </div>
              <div className="stat-card text-center">
                <Link2 className="w-4 h-4 mx-auto text-green-500 mb-1" />
                <div className="text-lg font-bold">{links.length}</div>
                <div className="text-[10px] text-muted-foreground">Links</div>
              </div>
              <div className="stat-card text-center">
                <Globe className="w-4 h-4 mx-auto text-purple-500 mb-1" />
                <div className="text-lg font-bold">{stats?.countries.length || 0}</div>
                <div className="text-[10px] text-muted-foreground">Regions</div>
              </div>
            </div>

            {/* Health Metrics */}
            <div className="space-y-2">
              <h4 className="section-header flex items-center gap-1">
                <Activity className="w-3.5 h-3.5" />
                Health Metrics
              </h4>
              {healthMetrics.map(metric => (
                <div key={metric.name} className="p-3 rounded-lg bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border border-border/50 hover:border-primary/30 smooth-transition">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold">{metric.name}</span>
                    <span className={`text-xs font-bold smooth-transition ${getHealthColor(metric.value)}`}>
                      {metric.value.toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={metric.value} className={`h-2 ${getHealthBg(metric.value)}`} />
                  <p className="text-[10px] text-muted-foreground mt-2">{metric.description}</p>
                </div>
              ))}
            </div>

            {/* Network Stats */}
            {stats && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold flex items-center gap-1">
                  <Gauge className="w-3.5 h-3.5" />
                  Network Statistics
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded bg-muted/30">
                    <span className="text-muted-foreground">Avg Cost</span>
                    <div className="font-mono font-bold">{stats.avgCost.toFixed(1)}</div>
                  </div>
                  <div className="p-2 rounded bg-muted/30">
                    <span className="text-muted-foreground">Total Capacity</span>
                    <div className="font-mono font-bold">{stats.totalCapacity.toLocaleString()} Mbps</div>
                  </div>
                  <div className="p-2 rounded bg-muted/30">
                    <span className="text-muted-foreground">Avg Utilization</span>
                    <div className="font-mono font-bold">{stats.avgUtilization.toFixed(1)}%</div>
                  </div>
                  <div className="p-2 rounded bg-muted/30">
                    <span className="text-muted-foreground">Avg Degree</span>
                    <div className="font-mono font-bold">{stats.avgDegree.toFixed(1)}</div>
                  </div>
                  <div className="p-2 rounded bg-muted/30">
                    <span className="text-muted-foreground">Backbone Links</span>
                    <div className="font-mono font-bold text-green-500">{stats.backboneLinks}</div>
                  </div>
                  <div className="p-2 rounded bg-muted/30">
                    <span className="text-muted-foreground">Asymmetric Links</span>
                    <div className="font-mono font-bold text-orange-500">{stats.asymmetricLinks}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Critical Items */}
            {criticalItems.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
                  Attention Required ({criticalItems.length})
                </h4>
                <div className="space-y-1">
                  {criticalItems.map((item, idx) => (
                    <div 
                      key={idx} 
                      className={`p-2 rounded text-xs flex items-center gap-2 ${
                        item.severity === 'critical' 
                          ? 'bg-red-500/10 border border-red-500/20' 
                          : 'bg-yellow-500/10 border border-yellow-500/20'
                      }`}
                    >
                      {item.severity === 'critical' ? (
                        <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3 h-3 text-yellow-500 shrink-0" />
                      )}
                      <span className="truncate">{item.message}</span>
                      <Badge variant="outline" className="text-[9px] ml-auto shrink-0">
                        {item.type}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Country Distribution */}
            {countryDistribution.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5" />
                  Geographic Distribution
                </h4>
                <div className="space-y-1">
                  {countryDistribution.map(([country, count]) => (
                    <div key={country} className="flex items-center gap-2">
                      <span className="text-xs w-20 truncate">{country}</span>
                      <div className="flex-1 h-2 bg-muted rounded overflow-hidden">
                        <div 
                          className="h-full bg-primary" 
                          style={{ width: `${(count / nodes.length) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono w-8 text-right">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
