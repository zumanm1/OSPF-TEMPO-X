import { useMemo } from 'react';
import { useNetworkStore } from '@/store/networkStore';
import FileUpload from './FileUpload';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Search, Network, Link2, TrendingUp, Moon, Sun, Map, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface SidebarProps {
  onOpenVisualization?: () => void;
}

export default function Sidebar({ onOpenVisualization }: SidebarProps) {
  const topology = useNetworkStore(state => state.topology);
  const searchQuery = useNetworkStore(state => state.searchQuery);
  const setSearchQuery = useNetworkStore(state => state.setSearchQuery);
  const darkMode = useNetworkStore(state => state.darkMode);
  const toggleDarkMode = useNetworkStore(state => state.toggleDarkMode);

  const stats = useMemo(() => {
    if (!topology) return null;

    const nodeCount = topology.nodes.length;
    const linkCount = topology.links.length;
    const asymmetricLinks = topology.links.filter(l => l.type === 'asymmetric').length;
    const avgCost = topology.links.reduce((sum, l) => sum + l.cost, 0) / linkCount;
    const backboneLinks = topology.links.filter(l => l.type === 'backbone').length;
    const countries = [...new Set(topology.nodes.map(n => n.country).filter(Boolean))];

    return {
      nodeCount,
      linkCount,
      asymmetricLinks,
      avgCost: avgCost.toFixed(1),
      backboneLinks,
      countries
    };
  }, [topology]);

  return (
    <div className="w-80 h-full bg-gradient-to-b from-card to-card/95 border-r border-border/50 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-border/30 bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold gradient-text">Network Config</h2>
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleDarkMode}
            className="h-8 w-8 hover:bg-primary/10 smooth-transition"
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <FileUpload />
        </div>

        {topology && (
          <>
            <Separator />

            <div>
              <Label className="section-header">Quick Stats</Label>
              <div className="grid grid-cols-2 gap-2">
                <Card className="stat-card">
                  <CardHeader className="p-3 pb-2">
                    <CardTitle className="text-xs text-muted-foreground font-normal">
                      Nodes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <div className="flex items-center gap-2">
                      <Network className="w-4 h-4 text-blue-500" />
                      <span className="text-2xl font-bold">{stats?.nodeCount}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="stat-card">
                  <CardHeader className="p-3 pb-2">
                    <CardTitle className="text-xs text-muted-foreground font-normal">
                      Links
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <div className="flex items-center gap-2">
                      <Link2 className="w-4 h-4 text-green-500" />
                      <span className="text-2xl font-bold">{stats?.linkCount}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="p-3 pb-2">
                    <CardTitle className="text-xs text-muted-foreground font-normal">
                      Avg Cost
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      <span className="text-2xl font-bold">{stats?.avgCost}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="p-3 pb-2">
                    <CardTitle className="text-xs text-muted-foreground font-normal">
                      Asymmetric
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">{stats?.asymmetricLinks}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <Separator />

            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase mb-2 block">
                Link Types
              </Label>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                  Backbone: {stats?.backboneLinks}
                </Badge>
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                  Asymmetric: {stats?.asymmetricLinks}
                </Badge>
                <Badge variant="outline" className="bg-slate-500/10 text-slate-600 border-slate-500/20">
                  Standard: {(stats?.linkCount || 0) - (stats?.backboneLinks || 0) - (stats?.asymmetricLinks || 0)}
                </Badge>
              </div>
            </div>

            <Separator />

            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase mb-2 block">
                Countries
              </Label>
              <div className="flex flex-wrap gap-1">
                {stats?.countries.map(country => (
                  <Badge key={country} variant="secondary" className="text-xs">
                    <Globe className="w-3 h-3 mr-1" />
                    {country}
                  </Badge>
                ))}
                {(!stats?.countries || stats.countries.length === 0) && (
                  <span className="text-xs text-muted-foreground">No country data</span>
                )}
              </div>
            </div>

            <Separator />

            <div>
              <Label htmlFor="search" className="text-xs font-semibold text-muted-foreground uppercase mb-2 block">
                Search Network
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search nodes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <Separator />

            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase mb-2 block">
                Visualization
              </Label>
              <Button 
                variant="outline" 
                className="w-full gap-2"
                onClick={onOpenVisualization}
              >
                <Map className="w-4 h-4" />
                Open Topology Visualization
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
