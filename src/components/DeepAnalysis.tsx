import { useState, useMemo } from 'react';
import { useNetworkStore } from '@/store/networkStore';
import { performDeepAnalysis } from '@/utils/graphAlgorithms';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  Globe, 
  Zap, 
  TrendingUp, 
  Network, 
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Shield
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export default function DeepAnalysis() {
  const topology = useNetworkStore(state => state.topology);
  const setHighlightedPath = useNetworkStore(state => state.setHighlightedPath);
  const setHighlightedLinks = useNetworkStore(state => state.setHighlightedLinks);
  
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ReturnType<typeof performDeepAnalysis> | null>(null);

  const handleAnalyze = () => {
    if (!topology) return;
    
    setAnalyzing(true);
    setTimeout(() => {
      const result = performDeepAnalysis(topology);
      setAnalysisResult(result);
      setAnalyzing(false);
    }, 500);
  };

  const handlePathHover = (path: string[]) => {
    setHighlightedPath(path);
    
    if (!topology) return;
    
    const linkIds = new Set<string>();
    for (let i = 0; i < path.length - 1; i++) {
      const link = topology.links.find(
        l => (l.source === path[i] && l.target === path[i + 1]) ||
             (l.target === path[i] && l.source === path[i + 1])
      );
      if (link) linkIds.add(link.id);
    }
    setHighlightedLinks(linkIds);
  };

  const getNodeName = (nodeId: string) => {
    return topology?.nodes.find(n => n.id === nodeId)?.name || nodeId;
  };

  const getLinkName = (linkId: string) => {
    const link = topology?.links.find(l => l.id === linkId);
    if (!link) return linkId;
    return `${getNodeName(link.source)} ↔ ${getNodeName(link.target)}`;
  };

  if (!topology) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground p-4">
        <p className="text-sm">Upload a topology to perform deep analysis</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-4 space-y-4 overflow-y-auto">
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary" />
          Deep Analysis
        </h3>

        <Button 
          onClick={handleAnalyze} 
          disabled={analyzing}
          className="w-full"
        >
          {analyzing ? 'Analyzing Network...' : 'Run Deep Analysis'}
        </Button>
      </div>

      {analysisResult && (
        <>
          <Separator />

          {/* Network Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Network Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Countries:</span>
                  <Badge>{analysisResult.networkStats.countries.length}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avg Path Cost:</span>
                  <Badge variant="outline">{analysisResult.networkStats.avgPathCost.toFixed(1)}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shortest Path:</span>
                  <span>{analysisResult.networkStats.shortestPath} hops</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Longest Path:</span>
                  <span>{analysisResult.networkStats.longestPath} hops</span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    Redundancy Score
                  </span>
                  <span className="font-semibold">{analysisResult.networkStats.redundancyScore.toFixed(1)}%</span>
                </div>
                <Progress value={analysisResult.networkStats.redundancyScore} className="h-2" />
              </div>
            </CardContent>
          </Card>

          {/* Critical Links */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                Critical Links
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analysisResult.networkStats.criticalLinks.map((linkId, index) => (
                  <div key={linkId} className="flex items-center gap-2 text-sm">
                    <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center">
                      {index + 1}
                    </Badge>
                    <span className="flex-1 truncate">{getLinkName(linkId)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Country Connectivity */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Network className="w-4 h-4" />
                Country Connectivity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(analysisResult.countryConnectivity).map(([country, data]) => (
                  <div key={country} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{country}</span>
                      <div className="flex gap-2">
                        <Badge variant="secondary">{data.nodes} nodes</Badge>
                        <Badge variant="outline">{data.connections} links</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Avg Utilization:</span>
                      <Progress value={data.avgUtilization} className="h-1 flex-1" />
                      <span>{data.avgUtilization.toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Country-to-Country Paths */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Country-to-Country Paths
            </h4>

            <Accordion type="single" collapsible className="space-y-2">
              {analysisResult.countryPaths.map((cp, index) => (
                <AccordionItem key={index} value={`item-${index}`} className="border rounded-lg">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline">
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline">{cp.sourceCountry}</Badge>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      <Badge variant="outline">{cp.targetCountry}</Badge>
                      {cp.bestPath && (
                        <Badge className="ml-auto">Best: {cp.bestPath.cost}</Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Paths:</span>
                          <span>{cp.totalPaths}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Avg Cost:</span>
                          <span>{cp.avgCost.toFixed(1)}</span>
                        </div>
                      </div>

                      {cp.bestPath && (
                        <Card 
                          className="cursor-pointer hover:border-primary transition-colors"
                          onMouseEnter={() => handlePathHover(cp.bestPath!.path)}
                          onMouseLeave={() => {
                            setHighlightedPath(null);
                            setHighlightedLinks(new Set());
                          }}
                        >
                          <CardContent className="p-3 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-medium flex items-center gap-1">
                                <Zap className="w-3 h-3 text-yellow-500" />
                                Best Path
                              </span>
                              <Badge variant="secondary">{cp.bestPath.hops} hops</Badge>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {cp.bestPath.path.map((nodeId, i) => (
                                <span key={i} className="flex items-center">
                                  <Badge variant="outline" className="text-xs">
                                    {getNodeName(nodeId)}
                                  </Badge>
                                  {i < cp.bestPath!.path.length - 1 && (
                                    <span className="mx-1 text-muted-foreground">→</span>
                                  )}
                                </span>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {cp.paths.length > 1 && (
                        <div className="text-xs text-muted-foreground">
                          +{cp.paths.length - 1} alternative path(s) available
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </>
      )}
    </div>
  );
}
