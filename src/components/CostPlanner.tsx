import { useState, useMemo, useCallback } from 'react';
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
import { 
  DollarSign, 
  ArrowRight, 
  Undo2, 
  Check, 
  AlertTriangle, 
  Eye, 
  Download,
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  RefreshCw
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function CostPlanner() {
  const topology = useNetworkStore(state => state.topology);
  const costChanges = useNetworkStore(state => state.costChanges);
  const addCostChange = useNetworkStore(state => state.addCostChange);
  const removeCostChange = useNetworkStore(state => state.removeCostChange);
  const applyCostChanges = useNetworkStore(state => state.applyCostChanges);
  const resetCostChanges = useNetworkStore(state => state.resetCostChanges);
  const setHighlightedLinks = useNetworkStore(state => state.setHighlightedLinks);

  const [selectedLinkId, setSelectedLinkId] = useState<string>('');
  const [newForwardCost, setNewForwardCost] = useState<string>('');
  const [newReverseCost, setNewReverseCost] = useState<string>('');
  const [editBothDirections, setEditBothDirections] = useState<boolean>(true);
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [previewResult, setPreviewResult] = useState<ReturnType<typeof calculateBlastRadius> | null>(null);

  const links = useMemo(() => {
    return topology?.links || [];
  }, [topology]);

  const selectedLink = useMemo(() => {
    return links.find(l => l.id === selectedLinkId);
  }, [links, selectedLinkId]);

  const isAsymmetric = useMemo(() => {
    if (!selectedLink) return false;
    return selectedLink.is_asymmetric || selectedLink.type === 'asymmetric' || 
           (selectedLink.forward_cost !== undefined && selectedLink.reverse_cost !== undefined &&
            selectedLink.forward_cost !== selectedLink.reverse_cost);
  }, [selectedLink]);

  const handleLinkSelect = (linkId: string) => {
    setSelectedLinkId(linkId);
    const link = links.find(l => l.id === linkId);
    if (link) {
      const fwdCost = link.forward_cost ?? link.cost;
      const revCost = link.reverse_cost ?? link.cost;
      setNewForwardCost(fwdCost.toString());
      setNewReverseCost(revCost.toString());
      setHighlightedLinks(new Set([linkId]));
    }
    setShowPreview(false);
    setPreviewResult(null);
  };

  const handlePreviewImpact = useCallback(() => {
    if (!topology || !selectedLink) return;

    const fwdCost = parseInt(newForwardCost);
    if (isNaN(fwdCost) || fwdCost < 1) return;

    const result = calculateBlastRadius(topology, selectedLink.id, fwdCost);
    setPreviewResult(result);
    setShowPreview(true);

    // Highlight affected links
    const affectedLinkIds = new Set<string>([selectedLink.id]);
    setHighlightedLinks(affectedLinkIds);
  }, [topology, selectedLink, newForwardCost, setHighlightedLinks]);

  const handleAddChange = () => {
    if (!selectedLink) return;

    const fwdCost = parseInt(newForwardCost);
    const revCost = parseInt(newReverseCost);
    
    if (isNaN(fwdCost) || fwdCost < 1) return;

    addCostChange({
      linkId: selectedLink.id,
      originalCost: selectedLink.cost,
      newCost: fwdCost,
      originalForwardCost: selectedLink.forward_cost ?? selectedLink.cost,
      newForwardCost: fwdCost,
      originalReverseCost: selectedLink.reverse_cost ?? selectedLink.cost,
      newReverseCost: editBothDirections && !isNaN(revCost) ? revCost : (selectedLink.reverse_cost ?? selectedLink.cost),
      direction: editBothDirections ? 'both' : 'forward'
    });

    setSelectedLinkId('');
    setNewForwardCost('');
    setNewReverseCost('');
    setShowPreview(false);
    setPreviewResult(null);
    setHighlightedLinks(new Set());
  };

  const handleApply = () => {
    applyCostChanges();
    setHighlightedLinks(new Set());
  };

  const handleReset = () => {
    resetCostChanges();
    setHighlightedLinks(new Set());
  };

  const handleExportPlan = () => {
    if (!topology || costChanges.length === 0) return;

    const exportData = {
      timestamp: new Date().toISOString(),
      changes: costChanges.map(change => {
        const link = links.find(l => l.id === change.linkId);
        return {
          linkId: change.linkId,
          source: link?.source,
          target: link?.target,
          sourceInterface: link?.sourceInterface,
          targetInterface: link?.targetInterface,
          originalCost: change.originalCost,
          newCost: change.newCost,
          direction: change.direction
        };
      })
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ospf-cost-plan-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getNodeName = (nodeId: string) => {
    return topology?.nodes.find(n => n.id === nodeId)?.name || nodeId;
  };

  const getSeverity = (result: ReturnType<typeof calculateBlastRadius> | null) => {
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
        <p className="text-sm">Upload a topology to plan cost changes</p>
      </div>
    );
  }

  const severity = getSeverity(previewResult);

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col p-4 space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            OSPF Cost Planner
          </h3>

          <div className="space-y-4">
            <div>
              <Label htmlFor="link">Select Link</Label>
              <Select value={selectedLinkId} onValueChange={handleLinkSelect}>
                <SelectTrigger id="link">
                  <SelectValue placeholder="Select a link to modify" />
                </SelectTrigger>
                <SelectContent>
                  {links.map(link => (
                    <SelectItem key={link.id} value={link.id}>
                      <div className="flex items-center gap-2">
                        <span>{getNodeName(link.source)} → {getNodeName(link.target)}</span>
                        <Badge variant="outline" className="text-xs">
                          {link.forward_cost ?? link.cost}
                          {(link.is_asymmetric || link.type === 'asymmetric') && (
                            <span className="ml-1">/ {link.reverse_cost ?? link.cost}</span>
                          )}
                        </Badge>
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
                      <span className="text-xs text-blue-500">{selectedLink.sourceInterface}</span>
                    </div>
                  )}
                  {selectedLink.type && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <Badge variant={selectedLink.type === 'asymmetric' ? 'destructive' : 'secondary'}>{selectedLink.type}</Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {selectedLink && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <ArrowLeftRight className="w-4 h-4" />
                    Edit Both Directions
                  </Label>
                  <Switch 
                    checked={editBothDirections} 
                    onCheckedChange={setEditBothDirections}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="fwdCost" className="text-xs">Forward Cost</Label>
                    <Input
                      id="fwdCost"
                      type="number"
                      min="1"
                      value={newForwardCost}
                      onChange={(e) => {
                        setNewForwardCost(e.target.value);
                        if (editBothDirections) setNewReverseCost(e.target.value);
                      }}
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
                      disabled={!editBothDirections && !isAsymmetric}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handlePreviewImpact}
                    variant="outline"
                    disabled={!newForwardCost}
                    className="flex-1"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Preview
                  </Button>
                  <Button
                    onClick={handleAddChange}
                    disabled={!newForwardCost}
                    className="flex-1"
                  >
                    Add to Plan
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Impact Preview */}
        {showPreview && previewResult && (
          <>
            <Separator />
            <Card className={`border-2 ${severity?.color}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Impact Preview
                  </span>
                  <Badge variant="outline" className={severity?.color}>
                    {severity?.level.toUpperCase()}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Affected Nodes</span>
                    <span className="font-semibold">
                      {previewResult.affectedNodes.size} / {topology.nodes.length}
                    </span>
                  </div>
                  <Progress 
                    value={(previewResult.affectedNodes.size / topology.nodes.length) * 100}
                    className="h-2"
                  />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Paths Affected</span>
                  <Badge>{previewResult.affectedPaths.length}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Path Changes</span>
                  <Badge variant="destructive">
                    {previewResult.affectedPaths.filter(p => p.pathChanged).length}
                  </Badge>
                </div>
                {previewResult.affectedPaths.length > 0 && (
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {previewResult.affectedPaths.slice(0, 5).map((path, idx) => (
                      <div key={idx} className="text-xs flex items-center justify-between bg-muted/50 p-2 rounded">
                        <span>{getNodeName(path.source)} → {getNodeName(path.target)}</span>
                        <div className="flex items-center gap-1">
                          <span>{path.oldCost}</span>
                          {path.newCost > path.oldCost ? (
                            <TrendingUp className="w-3 h-3 text-red-500" />
                          ) : (
                            <TrendingDown className="w-3 h-3 text-green-500" />
                          )}
                          <span>{path.newCost}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

      {costChanges.length > 0 && (
        <>
          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase">
                Pending Changes ({costChanges.length})
              </h4>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleExportPlan}
                  title="Export Plan"
                >
                  <Download className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleReset}
                >
                  <Undo2 className="w-3 h-3 mr-1" />
                  Reset
                </Button>
                <Button
                  size="sm"
                  onClick={handleApply}
                >
                  <Check className="w-3 h-3 mr-1" />
                  Apply
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {costChanges.map((change) => {
                const link = links.find(l => l.id === change.linkId);
                if (!link) return null;

                return (
                  <Card key={change.linkId}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium">
                          {getNodeName(link.source)} → {getNodeName(link.target)}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeCostChange(change.linkId)}
                          className="h-6 w-6 p-0"
                        >
                          ×
                        </Button>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-xs text-muted-foreground w-8">Fwd:</span>
                          <Badge variant="outline">{change.originalForwardCost ?? change.originalCost}</Badge>
                          <ArrowRight className="w-3 h-3 text-muted-foreground" />
                          <Badge variant="default">{change.newForwardCost ?? change.newCost}</Badge>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {(change.newForwardCost ?? change.newCost) > (change.originalForwardCost ?? change.originalCost) ? '+' : ''}
                            {(change.newForwardCost ?? change.newCost) - (change.originalForwardCost ?? change.originalCost)}
                          </span>
                        </div>
                        {change.direction === 'both' && (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-xs text-muted-foreground w-8">Rev:</span>
                            <Badge variant="outline">{change.originalReverseCost ?? change.originalCost}</Badge>
                            <ArrowRight className="w-3 h-3 text-muted-foreground" />
                            <Badge variant="default">{change.newReverseCost ?? change.newCost}</Badge>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          <Alert>
            <RefreshCw className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Click "Apply" to update the network topology with these cost changes.
              This will recalculate all paths and affect OSPF routing decisions.
            </AlertDescription>
          </Alert>
        </>
      )}
      </div>
    </ScrollArea>
  );
}
