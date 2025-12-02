import { useState, useMemo, useCallback } from 'react';
import { useNetworkStore } from '@/store/networkStore';
import { findKShortestPaths } from '@/utils/graphAlgorithms';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Wrench, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Download,
  Play,
  Trash2,
  Plus,
  Shield,
  Route
} from 'lucide-react';

interface MaintenanceWindow {
  id: string;
  name: string;
  targetType: 'node' | 'link';
  targetId: string;
  scheduledStart: string;
  duration: number; // minutes
  status: 'planned' | 'in-progress' | 'completed';
  impactAnalysis?: ImpactAnalysis;
}

interface ImpactAnalysis {
  affectedPaths: number;
  totalPaths: number;
  brokenConnections: string[];
  reroutableTraffic: number;
  criticalImpact: boolean;
  alternativePaths: Map<string, string[]>;
}

export default function MaintenancePlanner() {
  const topology = useNetworkStore(state => state.topology);
  const setHighlightedLinks = useNetworkStore(state => state.setHighlightedLinks);
  
  const [maintenanceWindows, setMaintenanceWindows] = useState<MaintenanceWindow[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedWindow, setSelectedWindow] = useState<string | null>(null);
  
  // Form state
  const [formName, setFormName] = useState('');
  const [formTargetType, setFormTargetType] = useState<'node' | 'link'>('link');
  const [formTargetId, setFormTargetId] = useState('');
  const [formScheduledStart, setFormScheduledStart] = useState('');
  const [formDuration, setFormDuration] = useState('60');

  const nodes = useMemo(() => topology?.nodes || [], [topology]);
  const links = useMemo(() => topology?.links || [], [topology]);

  const getNodeName = (nodeId: string) => nodes.find(n => n.id === nodeId)?.name || nodeId;

  const getLinkName = (linkId: string) => {
    const link = links.find(l => l.id === linkId);
    if (!link) return linkId;
    return `${getNodeName(link.source)} → ${getNodeName(link.target)}`;
  };

  // Analyze impact of taking a component offline
  const analyzeImpact = useCallback((targetType: 'node' | 'link', targetId: string): ImpactAnalysis => {
    if (!topology) {
      return {
        affectedPaths: 0,
        totalPaths: 0,
        brokenConnections: [],
        reroutableTraffic: 0,
        criticalImpact: false,
        alternativePaths: new Map()
      };
    }

    // Create modified topology without the target
    let modifiedLinks = [...links];
    let modifiedNodes = [...nodes];

    if (targetType === 'link') {
      modifiedLinks = links.filter(l => l.id !== targetId);
    } else {
      modifiedNodes = nodes.filter(n => n.id !== targetId);
      modifiedLinks = links.filter(l => l.source !== targetId && l.target !== targetId);
    }

    const modifiedTopology = {
      ...topology,
      nodes: modifiedNodes,
      links: modifiedLinks
    };

    let affectedPaths = 0;
    let totalPaths = 0;
    const brokenConnections: string[] = [];
    const alternativePaths = new Map<string, string[]>();

    // Check all node pairs
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const source = nodes[i].id;
        const target = nodes[j].id;

        // Skip if either node is the maintenance target
        if (targetType === 'node' && (source === targetId || target === targetId)) continue;

        totalPaths++;

        // Check original path
        const originalPaths = findKShortestPaths(topology, source, target, 1);
        const modifiedPaths = findKShortestPaths(modifiedTopology, source, target, 3);

        if (originalPaths.length > 0) {
          const originalPath = originalPaths[0];
          
          // Check if original path uses the target
          let usesTarget = false;
          if (targetType === 'link') {
            for (let k = 0; k < originalPath.path.length - 1; k++) {
              const link = links.find(l => 
                (l.source === originalPath.path[k] && l.target === originalPath.path[k + 1]) ||
                (l.target === originalPath.path[k] && l.source === originalPath.path[k + 1])
              );
              if (link?.id === targetId) {
                usesTarget = true;
                break;
              }
            }
          } else {
            usesTarget = originalPath.path.includes(targetId);
          }

          if (usesTarget) {
            affectedPaths++;
            
            if (modifiedPaths.length === 0) {
              brokenConnections.push(`${getNodeName(source)} ↔ ${getNodeName(target)}`);
            } else {
              alternativePaths.set(
                `${source}-${target}`,
                modifiedPaths[0].path.map(p => getNodeName(p))
              );
            }
          }
        }
      }
    }

    const reroutableTraffic = totalPaths > 0 
      ? ((affectedPaths - brokenConnections.length) / affectedPaths) * 100 
      : 100;

    return {
      affectedPaths,
      totalPaths,
      brokenConnections,
      reroutableTraffic: isNaN(reroutableTraffic) ? 100 : reroutableTraffic,
      criticalImpact: brokenConnections.length > 0,
      alternativePaths
    };
  }, [topology, nodes, links, getNodeName]);

  const addMaintenanceWindow = () => {
    if (!formName || !formTargetId) return;

    const impactAnalysis = analyzeImpact(formTargetType, formTargetId);

    const newWindow: MaintenanceWindow = {
      id: `mw-${Date.now()}`,
      name: formName,
      targetType: formTargetType,
      targetId: formTargetId,
      scheduledStart: formScheduledStart,
      duration: parseInt(formDuration) || 60,
      status: 'planned',
      impactAnalysis
    };

    setMaintenanceWindows(prev => [...prev, newWindow]);
    resetForm();
    setShowAddForm(false);
  };

  const removeMaintenanceWindow = (id: string) => {
    setMaintenanceWindows(prev => prev.filter(w => w.id !== id));
    if (selectedWindow === id) setSelectedWindow(null);
  };

  const resetForm = () => {
    setFormName('');
    setFormTargetType('link');
    setFormTargetId('');
    setFormScheduledStart('');
    setFormDuration('60');
  };

  const highlightTarget = (window: MaintenanceWindow) => {
    if (window.targetType === 'link') {
      setHighlightedLinks(new Set([window.targetId]));
    } else {
      const connectedLinks = links
        .filter(l => l.source === window.targetId || l.target === window.targetId)
        .map(l => l.id);
      setHighlightedLinks(new Set(connectedLinks));
    }
  };

  const exportPlan = () => {
    const plan = {
      exportedAt: new Date().toISOString(),
      maintenanceWindows: maintenanceWindows.map(w => ({
        ...w,
        targetName: w.targetType === 'link' ? getLinkName(w.targetId) : getNodeName(w.targetId),
        impactSummary: w.impactAnalysis ? {
          affectedPaths: w.impactAnalysis.affectedPaths,
          totalPaths: w.impactAnalysis.totalPaths,
          brokenConnections: w.impactAnalysis.brokenConnections,
          reroutableTraffic: w.impactAnalysis.reroutableTraffic.toFixed(1) + '%',
          criticalImpact: w.impactAnalysis.criticalImpact
        } : null
      }))
    };

    const blob = new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `maintenance-plan-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedWindowData = maintenanceWindows.find(w => w.id === selectedWindow);

  if (!topology) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Load a topology to plan maintenance</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Wrench className="w-4 h-4" />
            Maintenance Planner
          </CardTitle>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={exportPlan}>
              <Download className="w-3 h-3 mr-1" />
              Export
            </Button>
            <Button size="sm" className="h-7 text-xs" onClick={() => setShowAddForm(true)}>
              <Plus className="w-3 h-3 mr-1" />
              Add
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-3 space-y-3">
        {/* Add Form */}
        {showAddForm && (
          <div className="p-3 rounded-lg border bg-muted/30 space-y-3">
            <h4 className="text-xs font-semibold">Schedule Maintenance Window</h4>
            
            <div className="space-y-2">
              <Label className="text-xs">Name</Label>
              <Input
                placeholder="e.g., Link upgrade R1-R2"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label className="text-xs">Target Type</Label>
                <Select value={formTargetType} onValueChange={(v: 'node' | 'link') => { setFormTargetType(v); setFormTargetId(''); }}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="link">Link</SelectItem>
                    <SelectItem value="node">Node</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Target</Label>
                <Select value={formTargetId} onValueChange={setFormTargetId}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {formTargetType === 'link' ? (
                      links.map(l => (
                        <SelectItem key={l.id} value={l.id}>
                          {getNodeName(l.source)} → {getNodeName(l.target)}
                        </SelectItem>
                      ))
                    ) : (
                      nodes.map(n => (
                        <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label className="text-xs">Scheduled Start</Label>
                <Input
                  type="datetime-local"
                  value={formScheduledStart}
                  onChange={e => setFormScheduledStart(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Duration (min)</Label>
                <Input
                  type="number"
                  value={formDuration}
                  onChange={e => setFormDuration(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button size="sm" className="flex-1" onClick={addMaintenanceWindow} disabled={!formName || !formTargetId}>
                <CheckCircle className="w-3 h-3 mr-1" />
                Schedule
              </Button>
              <Button size="sm" variant="outline" onClick={() => { resetForm(); setShowAddForm(false); }}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Maintenance Windows List */}
        <ScrollArea className="flex-1">
          <div className="space-y-2">
            {maintenanceWindows.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm">No maintenance windows scheduled</p>
                <p className="text-xs">Click "Add" to schedule maintenance</p>
              </div>
            ) : (
              maintenanceWindows.map(window => (
                <div
                  key={window.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedWindow === window.id ? 'border-primary bg-primary/5' : 'bg-muted/30 hover:bg-muted/50'
                  } ${window.impactAnalysis?.criticalImpact ? 'border-red-500/30' : ''}`}
                  onClick={() => { setSelectedWindow(window.id); highlightTarget(window); }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{window.name}</span>
                        <Badge variant={window.status === 'planned' ? 'secondary' : window.status === 'in-progress' ? 'default' : 'outline'} className="text-[10px]">
                          {window.status}
                        </Badge>
                        {window.impactAnalysis?.criticalImpact && (
                          <Badge variant="destructive" className="text-[10px]">
                            <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
                            Critical
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {window.targetType === 'link' ? getLinkName(window.targetId) : getNodeName(window.targetId)}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {window.duration} min
                        </span>
                        {window.scheduledStart && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(window.scheduledStart).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => { e.stopPropagation(); removeMaintenanceWindow(window.id); }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>

                  {/* Impact Summary */}
                  {window.impactAnalysis && (
                    <div className="mt-2 pt-2 border-t border-border/50">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <div className="text-xs font-bold">{window.impactAnalysis.affectedPaths}</div>
                          <div className="text-[10px] text-muted-foreground">Affected</div>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-red-500">{window.impactAnalysis.brokenConnections.length}</div>
                          <div className="text-[10px] text-muted-foreground">Broken</div>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-green-500">{window.impactAnalysis.reroutableTraffic.toFixed(0)}%</div>
                          <div className="text-[10px] text-muted-foreground">Reroutable</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Selected Window Details */}
        {selectedWindowData?.impactAnalysis && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-xs font-semibold flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" />
                Impact Analysis
              </h4>
              
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>Reroutable Traffic</span>
                  <span className={selectedWindowData.impactAnalysis.reroutableTraffic >= 90 ? 'text-green-500' : 'text-yellow-500'}>
                    {selectedWindowData.impactAnalysis.reroutableTraffic.toFixed(1)}%
                  </span>
                </div>
                <Progress value={selectedWindowData.impactAnalysis.reroutableTraffic} className="h-2" />
              </div>

              {selectedWindowData.impactAnalysis.brokenConnections.length > 0 && (
                <div className="p-2 rounded bg-red-500/10 border border-red-500/20">
                  <div className="text-xs font-medium text-red-500 mb-1">Broken Connections</div>
                  <div className="space-y-1">
                    {selectedWindowData.impactAnalysis.brokenConnections.slice(0, 5).map((conn, idx) => (
                      <div key={idx} className="text-[10px] text-muted-foreground">{conn}</div>
                    ))}
                    {selectedWindowData.impactAnalysis.brokenConnections.length > 5 && (
                      <div className="text-[10px] text-muted-foreground">
                        +{selectedWindowData.impactAnalysis.brokenConnections.length - 5} more
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedWindowData.impactAnalysis.alternativePaths.size > 0 && (
                <div className="p-2 rounded bg-green-500/10 border border-green-500/20">
                  <div className="text-xs font-medium text-green-500 mb-1 flex items-center gap-1">
                    <Route className="w-3 h-3" />
                    Alternative Paths Available
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {selectedWindowData.impactAnalysis.alternativePaths.size} paths can be rerouted
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
