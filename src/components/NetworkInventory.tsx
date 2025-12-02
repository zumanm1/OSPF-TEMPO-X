import { useState, useMemo } from 'react';
import { useNetworkStore } from '@/store/networkStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Package, 
  Server, 
  Link2, 
  Search, 
  Download, 
  Filter,
  SortAsc,
  SortDesc,
  Globe,
  Activity,
  Gauge
} from 'lucide-react';

type SortField = 'name' | 'id' | 'country' | 'type' | 'connections' | 'cost' | 'capacity' | 'utilization';
type SortDirection = 'asc' | 'desc';

export default function NetworkInventory() {
  const topology = useNetworkStore(state => state.topology);
  const setHighlightedLinks = useNetworkStore(state => state.setHighlightedLinks);
  const setHighlightedPath = useNetworkStore(state => state.setHighlightedPath);
  
  const [activeTab, setActiveTab] = useState('nodes');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCountry, setFilterCountry] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const nodes = useMemo(() => topology?.nodes || [], [topology]);
  const links = useMemo(() => topology?.links || [], [topology]);

  const countries = useMemo(() => 
    [...new Set(nodes.map(n => n.country).filter(Boolean))] as string[],
    [nodes]
  );

  const nodeTypes = useMemo(() => 
    [...new Set(nodes.map(n => n.type).filter(Boolean))] as string[],
    [nodes]
  );

  const linkTypes = useMemo(() => 
    [...new Set(links.map(l => l.type).filter(Boolean))] as string[],
    [links]
  );

  // Node statistics
  const nodeStats = useMemo(() => {
    const stats = nodes.map(node => {
      const connectedLinks = links.filter(l => l.source === node.id || l.target === node.id);
      const totalCapacity = connectedLinks.reduce((sum, l) => sum + (l.capacity || 0), 0);
      const avgUtilization = connectedLinks.length > 0
        ? connectedLinks.reduce((sum, l) => sum + (l.utilization || 0), 0) / connectedLinks.length
        : 0;
      
      return {
        ...node,
        connections: connectedLinks.length,
        totalCapacity,
        avgUtilization,
        connectedNodes: [...new Set(connectedLinks.map(l => 
          l.source === node.id ? l.target : l.source
        ))]
      };
    });
    return stats;
  }, [nodes, links]);

  // Link statistics
  const linkStats = useMemo(() => {
    return links.map(link => {
      const sourceNode = nodes.find(n => n.id === link.source);
      const targetNode = nodes.find(n => n.id === link.target);
      return {
        ...link,
        sourceName: sourceNode?.name || link.source,
        targetName: targetNode?.name || link.target,
        sourceCountry: sourceNode?.country,
        targetCountry: targetNode?.country,
        isInterCountry: sourceNode?.country !== targetNode?.country
      };
    });
  }, [links, nodes]);

  // Filtered and sorted nodes
  const filteredNodes = useMemo(() => {
    let result = nodeStats;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(n => 
        n.name.toLowerCase().includes(term) ||
        n.id.toLowerCase().includes(term) ||
        n.country?.toLowerCase().includes(term)
      );
    }

    if (filterCountry !== 'all') {
      result = result.filter(n => n.country === filterCountry);
    }

    if (filterType !== 'all') {
      result = result.filter(n => n.type === filterType);
    }

    result.sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortField) {
        case 'name': aVal = a.name; bVal = b.name; break;
        case 'id': aVal = a.id; bVal = b.id; break;
        case 'country': aVal = a.country || ''; bVal = b.country || ''; break;
        case 'type': aVal = a.type || ''; bVal = b.type || ''; break;
        case 'connections': aVal = a.connections; bVal = b.connections; break;
        default: aVal = a.name; bVal = b.name;
      }
      if (typeof aVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return result;
  }, [nodeStats, searchTerm, filterCountry, filterType, sortField, sortDirection]);

  // Filtered and sorted links
  const filteredLinks = useMemo(() => {
    let result = linkStats;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(l => 
        l.sourceName.toLowerCase().includes(term) ||
        l.targetName.toLowerCase().includes(term) ||
        l.id.toLowerCase().includes(term)
      );
    }

    if (filterType !== 'all') {
      result = result.filter(l => l.type === filterType);
    }

    result.sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortField) {
        case 'cost': aVal = a.cost; bVal = b.cost; break;
        case 'capacity': aVal = a.capacity || 0; bVal = b.capacity || 0; break;
        case 'utilization': aVal = a.utilization || 0; bVal = b.utilization || 0; break;
        case 'type': aVal = a.type || ''; bVal = b.type || ''; break;
        default: aVal = a.sourceName; bVal = b.sourceName;
      }
      if (typeof aVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return result;
  }, [linkStats, searchTerm, filterType, sortField, sortDirection]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? 
      <SortAsc className="w-3 h-3 ml-1" /> : 
      <SortDesc className="w-3 h-3 ml-1" />;
  };

  const highlightNode = (nodeId: string) => {
    const connectedLinkIds = links
      .filter(l => l.source === nodeId || l.target === nodeId)
      .map(l => l.id);
    setHighlightedLinks(new Set(connectedLinkIds));
  };

  const highlightLink = (linkId: string) => {
    setHighlightedLinks(new Set([linkId]));
  };

  const exportInventory = () => {
    const inventory = {
      exportedAt: new Date().toISOString(),
      summary: {
        totalNodes: nodes.length,
        totalLinks: links.length,
        countries: countries.length,
        nodeTypes: nodeTypes,
        linkTypes: linkTypes
      },
      nodes: nodeStats.map(n => ({
        id: n.id,
        name: n.name,
        country: n.country,
        type: n.type,
        connections: n.connections,
        totalCapacity: n.totalCapacity,
        avgUtilization: n.avgUtilization.toFixed(2) + '%'
      })),
      links: linkStats.map(l => ({
        id: l.id,
        source: l.sourceName,
        target: l.targetName,
        cost: l.cost,
        capacity: l.capacity,
        utilization: (l.utilization || 0).toFixed(2) + '%',
        type: l.type,
        isInterCountry: l.isInterCountry
      }))
    };

    const blob = new Blob([JSON.stringify(inventory, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `network-inventory-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    let csv = '';
    
    if (activeTab === 'nodes') {
      csv = 'ID,Name,Country,Type,Connections,Total Capacity,Avg Utilization\n';
      filteredNodes.forEach(n => {
        csv += `${n.id},${n.name},${n.country || ''},${n.type || ''},${n.connections},${n.totalCapacity},${n.avgUtilization.toFixed(2)}%\n`;
      });
    } else {
      csv = 'ID,Source,Target,Cost,Capacity,Utilization,Type,Inter-Country\n';
      filteredLinks.forEach(l => {
        csv += `${l.id},${l.sourceName},${l.targetName},${l.cost},${l.capacity || ''},${(l.utilization || 0).toFixed(2)}%,${l.type || ''},${l.isInterCountry}\n`;
      });
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `network-${activeTab}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!topology) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Load a topology to view inventory</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Package className="w-4 h-4" />
            Network Inventory
          </CardTitle>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={exportCSV}>
              <Download className="w-3 h-3 mr-1" />
              CSV
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={exportInventory}>
              <Download className="w-3 h-3 mr-1" />
              JSON
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-3 space-y-3">
        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-2">
          <div className="text-center p-2 rounded bg-blue-500/10 border border-blue-500/20">
            <div className="text-lg font-bold text-blue-500">{nodes.length}</div>
            <div className="text-[10px] text-muted-foreground">Nodes</div>
          </div>
          <div className="text-center p-2 rounded bg-green-500/10 border border-green-500/20">
            <div className="text-lg font-bold text-green-500">{links.length}</div>
            <div className="text-[10px] text-muted-foreground">Links</div>
          </div>
          <div className="text-center p-2 rounded bg-purple-500/10 border border-purple-500/20">
            <div className="text-lg font-bold text-purple-500">{countries.length}</div>
            <div className="text-[10px] text-muted-foreground">Countries</div>
          </div>
          <div className="text-center p-2 rounded bg-orange-500/10 border border-orange-500/20">
            <div className="text-lg font-bold text-orange-500">
              {links.reduce((sum, l) => sum + (l.capacity || 0), 0).toLocaleString()}
            </div>
            <div className="text-[10px] text-muted-foreground">Total Mbps</div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>
          {activeTab === 'nodes' && (
            <Select value={filterCountry} onValueChange={setFilterCountry}>
              <SelectTrigger className="w-28 h-8 text-xs">
                <Globe className="w-3 h-3 mr-1" />
                <SelectValue placeholder="Country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                {countries.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-28 h-8 text-xs">
              <Filter className="w-3 h-3 mr-1" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {(activeTab === 'nodes' ? nodeTypes : linkTypes).map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="nodes" className="text-xs">
              <Server className="w-3.5 h-3.5 mr-1" />
              Nodes ({filteredNodes.length})
            </TabsTrigger>
            <TabsTrigger value="links" className="text-xs">
              <Link2 className="w-3.5 h-3.5 mr-1" />
              Links ({filteredLinks.length})
            </TabsTrigger>
          </TabsList>

          {/* Nodes Table */}
          <TabsContent value="nodes" className="flex-1 mt-2 overflow-hidden">
            <ScrollArea className="h-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="text-xs cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleSort('name')}
                    >
                      Name <SortIcon field="name" />
                    </TableHead>
                    <TableHead 
                      className="text-xs cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleSort('country')}
                    >
                      Country <SortIcon field="country" />
                    </TableHead>
                    <TableHead 
                      className="text-xs cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleSort('type')}
                    >
                      Type <SortIcon field="type" />
                    </TableHead>
                    <TableHead 
                      className="text-xs cursor-pointer hover:bg-muted/50 text-right"
                      onClick={() => toggleSort('connections')}
                    >
                      Links <SortIcon field="connections" />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredNodes.map(node => (
                    <TableRow 
                      key={node.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => highlightNode(node.id)}
                    >
                      <TableCell className="text-xs">
                        <div>
                          <span className="font-medium">{node.name}</span>
                          <span className="text-muted-foreground ml-1">({node.id})</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {node.country && (
                          <Badge variant="secondary" className="text-[10px]">
                            {node.country}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {node.type && (
                          <Badge variant="outline" className="text-[10px]">
                            {node.type}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-right">
                        <Badge variant="secondary" className="text-[10px]">
                          {node.connections}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>

          {/* Links Table */}
          <TabsContent value="links" className="flex-1 mt-2 overflow-hidden">
            <ScrollArea className="h-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Link</TableHead>
                    <TableHead 
                      className="text-xs cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleSort('cost')}
                    >
                      Cost <SortIcon field="cost" />
                    </TableHead>
                    <TableHead 
                      className="text-xs cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleSort('capacity')}
                    >
                      Capacity <SortIcon field="capacity" />
                    </TableHead>
                    <TableHead 
                      className="text-xs cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleSort('type')}
                    >
                      Type <SortIcon field="type" />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLinks.map(link => (
                    <TableRow 
                      key={link.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => highlightLink(link.id)}
                    >
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-1">
                          <span className="font-medium">{link.sourceName}</span>
                          <span className="text-muted-foreground">→</span>
                          <span className="font-medium">{link.targetName}</span>
                          {link.isInterCountry && (
                            <Globe className="w-3 h-3 text-blue-500 ml-1" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-mono">{link.cost}</TableCell>
                      <TableCell className="text-xs">
                        {link.capacity ? `${link.capacity} Mbps` : '-'}
                      </TableCell>
                      <TableCell className="text-xs">
                        {link.type && (
                          <Badge 
                            variant="secondary" 
                            className={`text-[10px] ${
                              link.type === 'backbone' ? 'bg-green-500/20 text-green-600' :
                              link.type === 'asymmetric' ? 'bg-orange-500/20 text-orange-600' : ''
                            }`}
                          >
                            {link.type}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
