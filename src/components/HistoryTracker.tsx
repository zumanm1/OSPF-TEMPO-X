import { useMemo } from 'react';
import { useNetworkStore } from '@/store/networkStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  History,
  RotateCcw,
  Download,
  Trash2,
  Clock,
  GitCompare,
  Save,
  CheckCircle
} from 'lucide-react';
import { useState } from 'react';

export default function HistoryTracker() {
  const topology = useNetworkStore(state => state.topology);
  const topologyHistory = useNetworkStore(state => state.topologyHistory);
  const currentHistoryIndex = useNetworkStore(state => state.currentHistoryIndex);
  const saveSnapshot = useNetworkStore(state => state.saveSnapshot);
  const restoreSnapshot = useNetworkStore(state => state.restoreSnapshot);
  const clearHistory = useNetworkStore(state => state.clearHistory);

  const [snapshotDescription, setSnapshotDescription] = useState('');
  const [compareMode, setCompareMode] = useState(false);
  const [compareSnapshot, setCompareSnapshot] = useState<string | null>(null);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSaveSnapshot = () => {
    if (!snapshotDescription.trim()) return;
    saveSnapshot(snapshotDescription);
    setSnapshotDescription('');
  };

  const handleRestore = (snapshotId: string) => {
    restoreSnapshot(snapshotId);
  };

  const compareTopologies = useMemo(() => {
    if (!compareSnapshot || !topology) return null;

    const snapshot = topologyHistory.find(s => s.id === compareSnapshot);
    if (!snapshot) return null;

    const currentLinks = topology.links;
    const snapshotLinks = snapshot.topology.links;

    const addedLinks = currentLinks.filter(
      cl => !snapshotLinks.find(sl => sl.id === cl.id)
    );

    const removedLinks = snapshotLinks.filter(
      sl => !currentLinks.find(cl => cl.id === sl.id)
    );

    const modifiedLinks = currentLinks.filter(cl => {
      const sl = snapshotLinks.find(s => s.id === cl.id);
      if (!sl) return false;
      return cl.cost !== sl.cost || 
             cl.forward_cost !== sl.forward_cost || 
             cl.reverse_cost !== sl.reverse_cost;
    }).map(cl => {
      const sl = snapshotLinks.find(s => s.id === cl.id)!;
      return {
        current: cl,
        snapshot: sl
      };
    });

    const currentNodes = topology.nodes;
    const snapshotNodes = snapshot.topology.nodes;

    const addedNodes = currentNodes.filter(
      cn => !snapshotNodes.find(sn => sn.id === cn.id)
    );

    const removedNodes = snapshotNodes.filter(
      sn => !currentNodes.find(cn => cn.id === sn.id)
    );

    return {
      addedLinks,
      removedLinks,
      modifiedLinks,
      addedNodes,
      removedNodes,
      snapshotDate: snapshot.timestamp,
      snapshotDescription: snapshot.description
    };
  }, [compareSnapshot, topology, topologyHistory]);

  const exportHistory = () => {
    const report = {
      timestamp: new Date().toISOString(),
      currentTopology: {
        nodes: topology?.nodes.length || 0,
        links: topology?.links.length || 0
      },
      history: topologyHistory.map(snapshot => ({
        id: snapshot.id,
        timestamp: snapshot.timestamp,
        description: snapshot.description,
        nodes: snapshot.topology.nodes.length,
        links: snapshot.topology.links.length
      }))
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `topology-history-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!topology) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground p-4">
        <p className="text-sm">Upload a topology to track changes</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col p-4 space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Change History & Rollback
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            Track topology changes over time and restore previous states.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-2">
          <Card>
            <CardContent className="p-3">
              <div className="text-xs text-muted-foreground">Snapshots</div>
              <div className="text-2xl font-bold">{topologyHistory.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="text-xs text-muted-foreground">Current Index</div>
              <div className="text-2xl font-bold">{currentHistoryIndex + 1}</div>
            </CardContent>
          </Card>
        </div>

        {/* Save Snapshot */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Save Current State</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Input
              placeholder="Snapshot description..."
              value={snapshotDescription}
              onChange={(e) => setSnapshotDescription(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveSnapshot()}
            />
            <Button 
              onClick={handleSaveSnapshot} 
              className="w-full" 
              size="sm"
              disabled={!snapshotDescription.trim()}
            >
              <Save className="w-4 h-4 mr-1" />
              Save Snapshot
            </Button>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button 
            onClick={() => setCompareMode(!compareMode)} 
            variant="outline" 
            size="sm"
          >
            <GitCompare className="w-4 h-4 mr-1" />
            {compareMode ? 'Exit Compare' : 'Compare'}
          </Button>
          <Button onClick={exportHistory} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
        </div>

        <Separator />

        {/* History Timeline */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Timeline ({topologyHistory.length})</span>
              {topologyHistory.length > 1 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearHistory}
                  className="h-6 text-xs"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Clear
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-96 overflow-y-auto">
            {topologyHistory.length === 0 ? (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  No snapshots yet. Changes will be tracked automatically.
                </AlertDescription>
              </Alert>
            ) : (
              topologyHistory.slice().reverse().map((snapshot, idx) => {
                const actualIndex = topologyHistory.length - 1 - idx;
                const isCurrent = actualIndex === currentHistoryIndex;
                
                return (
                  <div
                    key={snapshot.id}
                    className={`p-3 rounded border cursor-pointer transition-all ${
                      isCurrent 
                        ? 'bg-primary/10 border-primary/30' 
                        : compareSnapshot === snapshot.id
                        ? 'bg-blue-500/10 border-blue-500/30'
                        : 'bg-muted/50 hover:bg-muted'
                    }`}
                    onClick={() => {
                      if (compareMode) {
                        setCompareSnapshot(snapshot.id);
                      } else {
                        handleRestore(snapshot.id);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {formatDate(snapshot.timestamp)}
                        </span>
                      </div>
                      {isCurrent && (
                        <Badge variant="default" className="text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Current
                        </Badge>
                      )}
                      {compareSnapshot === snapshot.id && (
                        <Badge variant="outline" className="text-xs bg-blue-500/10">
                          Comparing
                        </Badge>
                      )}
                    </div>
                    
                    <div className="text-sm font-medium mb-1">
                      {snapshot.description}
                    </div>
                    
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{snapshot.topology.nodes.length} nodes</span>
                      <span>•</span>
                      <span>{snapshot.topology.links.length} links</span>
                    </div>

                    {!isCurrent && !compareMode && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full mt-2 h-7 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRestore(snapshot.id);
                        }}
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Restore
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Comparison Results */}
        {compareMode && compareTopologies && (
          <>
            <Separator />
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  Changes Since: {compareTopologies.snapshotDescription}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-xs text-muted-foreground">
                  {formatDate(compareTopologies.snapshotDate)}
                </div>

                {/* Summary */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-green-500/10 p-2 rounded text-center">
                    <div className="text-lg font-bold text-green-600">
                      {compareTopologies.addedLinks.length + compareTopologies.addedNodes.length}
                    </div>
                    <div className="text-xs text-muted-foreground">Added</div>
                  </div>
                  <div className="bg-orange-500/10 p-2 rounded text-center">
                    <div className="text-lg font-bold text-orange-600">
                      {compareTopologies.modifiedLinks.length}
                    </div>
                    <div className="text-xs text-muted-foreground">Modified</div>
                  </div>
                  <div className="bg-red-500/10 p-2 rounded text-center">
                    <div className="text-lg font-bold text-red-600">
                      {compareTopologies.removedLinks.length + compareTopologies.removedNodes.length}
                    </div>
                    <div className="text-xs text-muted-foreground">Removed</div>
                  </div>
                </div>

                {/* Details */}
                {compareTopologies.modifiedLinks.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-muted-foreground">
                      Modified Links:
                    </div>
                    {compareTopologies.modifiedLinks.map((mod, idx) => (
                      <div key={idx} className="text-xs bg-orange-500/10 p-2 rounded">
                        <div className="font-medium">
                          {mod.current.source} ↔ {mod.current.target}
                        </div>
                        <div className="text-muted-foreground">
                          Cost: {mod.snapshot.cost} → {mod.current.cost}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {compareTopologies.addedLinks.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-muted-foreground">
                      Added Links:
                    </div>
                    {compareTopologies.addedLinks.map((link, idx) => (
                      <div key={idx} className="text-xs bg-green-500/10 p-2 rounded">
                        {link.source} ↔ {link.target} (Cost: {link.cost})
                      </div>
                    ))}
                  </div>
                )}

                {compareTopologies.removedLinks.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-muted-foreground">
                      Removed Links:
                    </div>
                    {compareTopologies.removedLinks.map((link, idx) => (
                      <div key={idx} className="text-xs bg-red-500/10 p-2 rounded">
                        {link.source} ↔ {link.target}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </ScrollArea>
  );
}
