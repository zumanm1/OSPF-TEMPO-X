import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNetworkStore } from '@/store/networkStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { 
  Bell, 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  CheckCircle, 
  X, 
  Settings, 
  Trash2,
  RefreshCw,
  Download,
  Filter
} from 'lucide-react';

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info' | 'success';
  category: 'capacity' | 'cost' | 'connectivity' | 'asymmetry' | 'spof';
  title: string;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  linkId?: string;
  nodeId?: string;
}

interface AlertThresholds {
  capacityWarning: number;
  capacityCritical: number;
  costChangeThreshold: number;
  enableCapacityAlerts: boolean;
  enableCostAlerts: boolean;
  enableConnectivityAlerts: boolean;
  enableAsymmetryAlerts: boolean;
  enableSpofAlerts: boolean;
}

export default function AlertsSystem() {
  const topology = useNetworkStore(state => state.topology);
  const setHighlightedLinks = useNetworkStore(state => state.setHighlightedLinks);
  
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [thresholds, setThresholds] = useState<AlertThresholds>({
    capacityWarning: 70,
    capacityCritical: 90,
    costChangeThreshold: 50,
    enableCapacityAlerts: true,
    enableCostAlerts: true,
    enableConnectivityAlerts: true,
    enableAsymmetryAlerts: true,
    enableSpofAlerts: true
  });

  const nodes = useMemo(() => topology?.nodes || [], [topology]);
  const links = useMemo(() => topology?.links || [], [topology]);

  // Generate alerts based on topology analysis
  const generateAlerts = useCallback(() => {
    if (!topology) return;

    const newAlerts: Alert[] = [];
    const now = new Date();

    // Capacity alerts
    if (thresholds.enableCapacityAlerts) {
      links.forEach(link => {
        const utilization = link.utilization || 0;
        if (utilization >= thresholds.capacityCritical) {
          newAlerts.push({
            id: `cap-crit-${link.id}`,
            type: 'critical',
            category: 'capacity',
            title: 'Critical Capacity',
            message: `Link ${link.source} → ${link.target} at ${utilization.toFixed(1)}% utilization`,
            timestamp: now,
            acknowledged: false,
            linkId: link.id
          });
        } else if (utilization >= thresholds.capacityWarning) {
          newAlerts.push({
            id: `cap-warn-${link.id}`,
            type: 'warning',
            category: 'capacity',
            title: 'High Utilization',
            message: `Link ${link.source} → ${link.target} at ${utilization.toFixed(1)}% utilization`,
            timestamp: now,
            acknowledged: false,
            linkId: link.id
          });
        }
      });
    }

    // Asymmetry alerts
    if (thresholds.enableAsymmetryAlerts) {
      links.forEach(link => {
        if (link.is_asymmetric || (link.forward_cost !== link.reverse_cost)) {
          const diff = Math.abs((link.forward_cost || link.cost) - (link.reverse_cost || link.cost));
          if (diff > 0) {
            newAlerts.push({
              id: `asym-${link.id}`,
              type: 'warning',
              category: 'asymmetry',
              title: 'Asymmetric Routing',
              message: `Link ${link.source} ↔ ${link.target} has asymmetric costs (${link.forward_cost || link.cost}/${link.reverse_cost || link.cost})`,
              timestamp: now,
              acknowledged: false,
              linkId: link.id
            });
          }
        }
      });
    }

    // Connectivity alerts - check for isolated nodes
    if (thresholds.enableConnectivityAlerts) {
      nodes.forEach(node => {
        const connectedLinks = links.filter(l => l.source === node.id || l.target === node.id);
        if (connectedLinks.length === 0) {
          newAlerts.push({
            id: `conn-${node.id}`,
            type: 'critical',
            category: 'connectivity',
            title: 'Isolated Node',
            message: `Node ${node.name} has no connections`,
            timestamp: now,
            acknowledged: false,
            nodeId: node.id
          });
        } else if (connectedLinks.length === 1) {
          newAlerts.push({
            id: `spof-node-${node.id}`,
            type: 'warning',
            category: 'spof',
            title: 'Single Point of Failure',
            message: `Node ${node.name} has only one connection`,
            timestamp: now,
            acknowledged: false,
            nodeId: node.id
          });
        }
      });
    }

    // SPOF alerts - links that are the only path between regions
    if (thresholds.enableSpofAlerts) {
      const countries = [...new Set(nodes.map(n => n.country).filter(Boolean))];
      if (countries.length > 1) {
        // Check for links that connect different countries
        const interCountryLinks = links.filter(link => {
          const sourceNode = nodes.find(n => n.id === link.source);
          const targetNode = nodes.find(n => n.id === link.target);
          return sourceNode?.country && targetNode?.country && sourceNode.country !== targetNode.country;
        });

        // Group by country pairs
        const countryPairLinks = new Map<string, typeof links>();
        interCountryLinks.forEach(link => {
          const sourceNode = nodes.find(n => n.id === link.source);
          const targetNode = nodes.find(n => n.id === link.target);
          const pair = [sourceNode?.country, targetNode?.country].sort().join('-');
          if (!countryPairLinks.has(pair)) {
            countryPairLinks.set(pair, []);
          }
          countryPairLinks.get(pair)!.push(link);
        });

        countryPairLinks.forEach((pairLinks, pair) => {
          if (pairLinks.length === 1) {
            newAlerts.push({
              id: `spof-country-${pair}`,
              type: 'warning',
              category: 'spof',
              title: 'Regional SPOF',
              message: `Only one link connects ${pair.replace('-', ' and ')}`,
              timestamp: now,
              acknowledged: false,
              linkId: pairLinks[0].id
            });
          }
        });
      }
    }

    // Cost alerts - high cost links
    if (thresholds.enableCostAlerts) {
      const avgCost = links.reduce((sum, l) => sum + l.cost, 0) / links.length;
      links.forEach(link => {
        if (link.cost > avgCost * 2) {
          newAlerts.push({
            id: `cost-high-${link.id}`,
            type: 'info',
            category: 'cost',
            title: 'High Cost Link',
            message: `Link ${link.source} → ${link.target} has cost ${link.cost} (avg: ${avgCost.toFixed(0)})`,
            timestamp: now,
            acknowledged: false,
            linkId: link.id
          });
        }
      });
    }

    setAlerts(newAlerts);
  }, [topology, links, nodes, thresholds]);

  // Auto-generate alerts when topology changes
  useEffect(() => {
    generateAlerts();
  }, [generateAlerts]);

  const acknowledgeAlert = (alertId: string) => {
    setAlerts(prev => prev.map(a => 
      a.id === alertId ? { ...a, acknowledged: true } : a
    ));
  };

  const dismissAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  const clearAllAlerts = () => {
    setAlerts([]);
  };

  const highlightAlertTarget = (alert: Alert) => {
    if (alert.linkId) {
      setHighlightedLinks(new Set([alert.linkId]));
    }
  };

  const filteredAlerts = useMemo(() => {
    if (filterType === 'all') return alerts;
    if (filterType === 'unacknowledged') return alerts.filter(a => !a.acknowledged);
    return alerts.filter(a => a.type === filterType || a.category === filterType);
  }, [alerts, filterType]);

  const alertCounts = useMemo(() => ({
    critical: alerts.filter(a => a.type === 'critical').length,
    warning: alerts.filter(a => a.type === 'warning').length,
    info: alerts.filter(a => a.type === 'info').length,
    unacknowledged: alerts.filter(a => !a.acknowledged).length
  }), [alerts]);

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'info': return <Info className="w-4 h-4 text-blue-500" />;
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      capacity: 'bg-purple-500/20 text-purple-600',
      cost: 'bg-blue-500/20 text-blue-600',
      connectivity: 'bg-red-500/20 text-red-600',
      asymmetry: 'bg-orange-500/20 text-orange-600',
      spof: 'bg-yellow-500/20 text-yellow-600'
    };
    return colors[category] || '';
  };

  const exportAlerts = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      summary: alertCounts,
      alerts: alerts.map(a => ({
        ...a,
        timestamp: a.timestamp.toISOString()
      }))
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `network-alerts-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!topology) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Load a topology to view alerts</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Alerts System
            {alertCounts.unacknowledged > 0 && (
              <Badge variant="destructive" className="text-[10px]">
                {alertCounts.unacknowledged}
              </Badge>
            )}
          </CardTitle>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={generateAlerts}>
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowSettings(!showSettings)}>
              <Settings className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={exportAlerts}>
              <Download className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-3 space-y-3">
        {/* Alert Summary */}
        <div className="grid grid-cols-4 gap-2">
          <div className="stat-card text-center border-l-4 border-l-red-500">
            <div className="text-lg font-bold text-red-500">{alertCounts.critical}</div>
            <div className="text-[10px] text-muted-foreground font-medium">Critical</div>
          </div>
          <div className="stat-card text-center border-l-4 border-l-yellow-500">
            <div className="text-lg font-bold text-yellow-500">{alertCounts.warning}</div>
            <div className="text-[10px] text-muted-foreground font-medium">Warning</div>
          </div>
          <div className="stat-card text-center border-l-4 border-l-blue-500">
            <div className="text-lg font-bold text-blue-500">{alertCounts.info}</div>
            <div className="text-[10px] text-muted-foreground font-medium">Info</div>
          </div>
          <div className="stat-card text-center border-l-4 border-l-primary">
            <div className="text-lg font-bold">{alerts.length}</div>
            <div className="text-[10px] text-muted-foreground font-medium">Total</div>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="p-3 rounded-lg border bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 space-y-3 border-primary/20">
            <h4 className="text-xs font-semibold gradient-text">Alert Thresholds</h4>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Capacity Warning (%)</Label>
                <span className="text-xs font-mono">{thresholds.capacityWarning}%</span>
              </div>
              <Slider
                value={[thresholds.capacityWarning]}
                onValueChange={([v]) => setThresholds(prev => ({ ...prev, capacityWarning: v }))}
                min={50}
                max={95}
                step={5}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Capacity Critical (%)</Label>
                <span className="text-xs font-mono">{thresholds.capacityCritical}%</span>
              </div>
              <Slider
                value={[thresholds.capacityCritical]}
                onValueChange={([v]) => setThresholds(prev => ({ ...prev, capacityCritical: v }))}
                min={70}
                max={100}
                step={5}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Capacity Alerts</Label>
                <Switch
                  checked={thresholds.enableCapacityAlerts}
                  onCheckedChange={v => setThresholds(prev => ({ ...prev, enableCapacityAlerts: v }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Cost Alerts</Label>
                <Switch
                  checked={thresholds.enableCostAlerts}
                  onCheckedChange={v => setThresholds(prev => ({ ...prev, enableCostAlerts: v }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Connectivity Alerts</Label>
                <Switch
                  checked={thresholds.enableConnectivityAlerts}
                  onCheckedChange={v => setThresholds(prev => ({ ...prev, enableConnectivityAlerts: v }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Asymmetry Alerts</Label>
                <Switch
                  checked={thresholds.enableAsymmetryAlerts}
                  onCheckedChange={v => setThresholds(prev => ({ ...prev, enableAsymmetryAlerts: v }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">SPOF Alerts</Label>
                <Switch
                  checked={thresholds.enableSpofAlerts}
                  onCheckedChange={v => setThresholds(prev => ({ ...prev, enableSpofAlerts: v }))}
                />
              </div>
            </div>
          </div>
        )}

        {/* Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="flex-1 h-8 text-xs rounded border bg-background px-2"
          >
            <option value="all">All Alerts</option>
            <option value="unacknowledged">Unacknowledged</option>
            <option value="critical">Critical Only</option>
            <option value="warning">Warnings Only</option>
            <option value="capacity">Capacity</option>
            <option value="connectivity">Connectivity</option>
            <option value="asymmetry">Asymmetry</option>
            <option value="spof">SPOF</option>
          </select>
          {alerts.length > 0 && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={clearAllAlerts}>
              <Trash2 className="w-3 h-3 mr-1" />
              Clear
            </Button>
          )}
        </div>

        {/* Alert List */}
        <ScrollArea className="flex-1">
          <div className="space-y-2">
            {filteredAlerts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                <p className="text-sm">No alerts</p>
              </div>
            ) : (
              filteredAlerts.map(alert => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg border ${
                    alert.acknowledged ? 'opacity-60 bg-muted/20' : 'bg-muted/40'
                  } ${
                    alert.type === 'critical' ? 'border-red-500/30' :
                    alert.type === 'warning' ? 'border-yellow-500/30' :
                    'border-border'
                  }`}
                  onClick={() => highlightAlertTarget(alert)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      {getAlertIcon(alert.type)}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{alert.title}</span>
                          <Badge variant="secondary" className={`text-[10px] ${getCategoryBadge(alert.category)}`}>
                            {alert.category}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{alert.message}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {alert.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {!alert.acknowledged && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => { e.stopPropagation(); acknowledgeAlert(alert.id); }}
                        >
                          <CheckCircle className="w-3 h-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => { e.stopPropagation(); dismissAlert(alert.id); }}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
