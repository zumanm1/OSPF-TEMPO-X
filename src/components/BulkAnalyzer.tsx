import { useState, useMemo, useCallback } from 'react';
import { useNetworkStore } from '@/store/networkStore';
import { findKShortestPaths } from '@/utils/graphAlgorithms';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import {
  FileText,
  Download,
  Play,
  RotateCcw,
  Table,
  FileSpreadsheet,
  CheckCircle,
  Loader2
} from 'lucide-react';

interface BulkPathResult {
  source: string;
  target: string;
  primaryPath: string[];
  backupPath: string[] | null;
  cost: number;
  hops: number;
  minCapacity: number;
  hasRedundancy: boolean;
}

export default function BulkAnalyzer() {
  const topology = useNetworkStore(state => state.topology);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [bulkResults, setBulkResults] = useState<BulkPathResult[]>([]);
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const nodes = useMemo(() => topology?.nodes || [], [topology]);
  const links = useMemo(() => topology?.links || [], [topology]);

  const getNodeName = (nodeId: string) => {
    return nodes.find(n => n.id === nodeId)?.name || nodeId;
  };

  const toggleNodeSelection = (nodeId: string) => {
    setSelectedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedNodes(new Set());
    } else {
      setSelectedNodes(new Set(nodes.map(n => n.id)));
    }
    setSelectAll(!selectAll);
  };

  const runBulkAnalysis = useCallback(() => {
    if (!topology) return;

    setIsAnalyzing(true);
    const results: BulkPathResult[] = [];
    const nodesToAnalyze = selectedNodes.size > 0 
      ? Array.from(selectedNodes) 
      : nodes.map(n => n.id);

    // Calculate paths for all pairs
    for (let i = 0; i < nodesToAnalyze.length; i++) {
      for (let j = i + 1; j < nodesToAnalyze.length; j++) {
        const source = nodesToAnalyze[i];
        const target = nodesToAnalyze[j];

        const paths = findKShortestPaths(topology, source, target, 2);
        
        if (paths.length > 0) {
          const primary = paths[0];
          const backup = paths.length > 1 ? paths[1] : null;

          results.push({
            source,
            target,
            primaryPath: primary.path,
            backupPath: backup?.path || null,
            cost: primary.forwardCost,
            hops: primary.hops,
            minCapacity: primary.bottleneck?.capacity || 0,
            hasRedundancy: backup !== null
          });
        }
      }
    }

    setBulkResults(results);
    setIsAnalyzing(false);
  }, [topology, selectedNodes, nodes]);

  const exportToCSV = () => {
    if (bulkResults.length === 0) return;

    const headers = [
      'Source',
      'Target',
      'Primary Path',
      'Backup Path',
      'OSPF Cost',
      'Hops',
      'Min Capacity (Mbps)',
      'Has Redundancy'
    ];

    const rows = bulkResults.map(result => [
      getNodeName(result.source),
      getNodeName(result.target),
      result.primaryPath.map(getNodeName).join(' → '),
      result.backupPath ? result.backupPath.map(getNodeName).join(' → ') : 'None',
      result.cost,
      result.hops,
      result.minCapacity,
      result.hasRedundancy ? 'Yes' : 'No'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bulk-path-analysis-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToJSON = () => {
    if (bulkResults.length === 0) return;

    const report = {
      timestamp: new Date().toISOString(),
      topology: {
        nodes: nodes.length,
        links: links.length
      },
      analysis: {
        totalPairs: bulkResults.length,
        withRedundancy: bulkResults.filter(r => r.hasRedundancy).length,
        withoutRedundancy: bulkResults.filter(r => !r.hasRedundancy).length,
        avgCost: (bulkResults.reduce((sum, r) => sum + r.cost, 0) / bulkResults.length).toFixed(2),
        avgHops: (bulkResults.reduce((sum, r) => sum + r.hops, 0) / bulkResults.length).toFixed(2)
      },
      paths: bulkResults.map(result => ({
        source: getNodeName(result.source),
        target: getNodeName(result.target),
        primaryPath: result.primaryPath.map(getNodeName),
        backupPath: result.backupPath?.map(getNodeName) || null,
        cost: result.cost,
        hops: result.hops,
        minCapacity: result.minCapacity,
        hasRedundancy: result.hasRedundancy
      }))
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bulk-path-analysis-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportRoutingTable = () => {
    if (bulkResults.length === 0) return;

    // Group by source node to create routing table
    const routingTables: { [key: string]: any[] } = {};

    bulkResults.forEach(result => {
      if (!routingTables[result.source]) {
        routingTables[result.source] = [];
      }

      const nextHop = result.primaryPath.length > 1 ? result.primaryPath[1] : result.target;

      routingTables[result.source].push({
        destination: getNodeName(result.target),
        nextHop: getNodeName(nextHop),
        cost: result.cost,
        interface: 'auto',
        path: result.primaryPath.map(getNodeName).join(' → ')
      });
    });

    const report = {
      timestamp: new Date().toISOString(),
      routingTables: Object.entries(routingTables).map(([sourceId, routes]) => ({
        router: getNodeName(sourceId),
        routes: routes.sort((a, b) => a.cost - b.cost)
      }))
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `routing-tables-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setBulkResults([]);
    setSelectedNodes(new Set());
    setSelectAll(false);
  };

  if (!topology) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground p-4">
        <p className="text-sm">Upload a topology for bulk analysis</p>
      </div>
    );
  }

  const stats = useMemo(() => {
    if (bulkResults.length === 0) return null;

    return {
      total: bulkResults.length,
      withRedundancy: bulkResults.filter(r => r.hasRedundancy).length,
      withoutRedundancy: bulkResults.filter(r => !r.hasRedundancy).length,
      avgCost: bulkResults.reduce((sum, r) => sum + r.cost, 0) / bulkResults.length,
      avgHops: bulkResults.reduce((sum, r) => sum + r.hops, 0) / bulkResults.length,
      maxCost: Math.max(...bulkResults.map(r => r.cost)),
      minCost: Math.min(...bulkResults.map(r => r.cost))
    };
  }, [bulkResults]);

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col p-4 space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Bulk Path Analysis & Export
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            Calculate paths for all node pairs and export routing documentation.
          </p>
        </div>

        {/* Node Selection */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Select Nodes ({selectedNodes.size} selected)</span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={toggleSelectAll}
                className="h-6 text-xs"
              >
                {selectAll ? 'Deselect All' : 'Select All'}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-48 overflow-y-auto">
            {nodes.map(node => (
              <div key={node.id} className="flex items-center space-x-2">
                <Checkbox
                  id={node.id}
                  checked={selectedNodes.has(node.id)}
                  onCheckedChange={() => toggleNodeSelection(node.id)}
                />
                <label
                  htmlFor={node.id}
                  className="text-xs flex-1 cursor-pointer"
                >
                  {node.name || node.id}
                  {node.country && (
                    <span className="text-muted-foreground ml-2">({node.country})</span>
                  )}
                </label>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button 
            onClick={runBulkAnalysis} 
            disabled={isAnalyzing}
            className="w-full"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-1" />
                Run Analysis
              </>
            )}
          </Button>
          <Button onClick={reset} variant="outline">
            <RotateCcw className="w-4 h-4 mr-1" />
            Reset
          </Button>
        </div>

        {/* Results Summary */}
        {stats && (
          <>
            <Separator />
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Analysis Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-blue-500/10 p-3 rounded">
                    <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                    <div className="text-xs text-muted-foreground">Total Paths</div>
                  </div>
                  <div className="bg-green-500/10 p-3 rounded">
                    <div className="text-2xl font-bold text-green-600">
                      {stats.withRedundancy}
                    </div>
                    <div className="text-xs text-muted-foreground">With Backup</div>
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg Cost:</span>
                    <span className="font-semibold">{stats.avgCost.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg Hops:</span>
                    <span className="font-semibold">{stats.avgHops.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cost Range:</span>
                    <span className="font-semibold">{stats.minCost} - {stats.maxCost}</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Redundancy Coverage</span>
                    <span>{((stats.withRedundancy / stats.total) * 100).toFixed(0)}%</span>
                  </div>
                  <Progress value={(stats.withRedundancy / stats.total) * 100} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Export Options */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Export Documentation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button onClick={exportToCSV} variant="outline" className="w-full" size="sm">
                  <FileSpreadsheet className="w-4 h-4 mr-1" />
                  Export to CSV
                </Button>
                <Button onClick={exportToJSON} variant="outline" className="w-full" size="sm">
                  <FileText className="w-4 h-4 mr-1" />
                  Export to JSON
                </Button>
                <Button onClick={exportRoutingTable} variant="outline" className="w-full" size="sm">
                  <Table className="w-4 h-4 mr-1" />
                  Export Routing Tables
                </Button>
              </CardContent>
            </Card>

            {/* Results Preview */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Results Preview (First 20)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-96 overflow-y-auto">
                {bulkResults.slice(0, 20).map((result, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded text-xs ${
                      result.hasRedundancy 
                        ? 'bg-green-500/10 border border-green-500/20' 
                        : 'bg-orange-500/10 border border-orange-500/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">
                        {getNodeName(result.source)} → {getNodeName(result.target)}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        Cost: {result.cost}
                      </Badge>
                    </div>
                    <div className="text-muted-foreground">
                      {result.primaryPath.map(getNodeName).join(' → ')}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span>{result.hops} hops</span>
                      {result.hasRedundancy ? (
                        <Badge variant="default" className="text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Backup Available
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-orange-600">
                          No Backup
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
                {bulkResults.length > 20 && (
                  <div className="text-xs text-muted-foreground text-center">
                    +{bulkResults.length - 20} more results (export to see all)
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {bulkResults.length === 0 && !isAnalyzing && (
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Select nodes and run analysis to calculate all paths. Results can be exported to CSV, JSON, or routing table format.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </ScrollArea>
  );
}
