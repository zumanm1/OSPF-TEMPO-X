import { useState } from 'react';
import { useNetworkStore } from '@/store/networkStore';
import { NetworkNode, NetworkLink } from '@/types/network';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Edit2, Server, Link2, Save, Download, Upload, X, Check, AlertTriangle } from 'lucide-react';

export default function TopologyEditor() {
  const { topology, setTopology } = useNetworkStore();
  const [activeTab, setActiveTab] = useState('nodes');
  
  // Node form state
  const [nodeForm, setNodeForm] = useState<Partial<NetworkNode>>({
    id: '',
    name: '',
    country: '',
    type: 'router'
  });
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  
  // Link form state
  const [linkForm, setLinkForm] = useState<Partial<NetworkLink>>({
    id: '',
    source: '',
    target: '',
    cost: 10,
    capacity: 1000,
    type: 'standard',
    sourceInterface: '',
    targetInterface: '',
    is_asymmetric: false,
    forward_cost: 10,
    reverse_cost: 10
  });
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  
  const [showAddNodeDialog, setShowAddNodeDialog] = useState(false);
  const [showAddLinkDialog, setShowAddLinkDialog] = useState(false);

  const nodes = topology?.nodes || [];
  const links = topology?.links || [];

  // Node operations
  const handleAddNode = () => {
    if (!nodeForm.id || !nodeForm.name) return;
    
    const newNode: NetworkNode = {
      id: nodeForm.id,
      name: nodeForm.name,
      country: nodeForm.country || undefined,
      type: nodeForm.type || 'router'
    };
    
    const updatedTopology = {
      ...topology!,
      nodes: [...nodes, newNode]
    };
    
    setTopology(updatedTopology, `Added node: ${newNode.name}`);
    resetNodeForm();
    setShowAddNodeDialog(false);
  };

  const handleUpdateNode = () => {
    if (!editingNodeId || !nodeForm.name) return;
    
    const updatedNodes = nodes.map(node => 
      node.id === editingNodeId 
        ? { ...node, name: nodeForm.name!, country: nodeForm.country, type: nodeForm.type }
        : node
    );
    
    setTopology({ ...topology!, nodes: updatedNodes }, `Updated node: ${nodeForm.name}`);
    resetNodeForm();
    setEditingNodeId(null);
  };

  const handleDeleteNode = (nodeId: string) => {
    const nodeName = nodes.find(n => n.id === nodeId)?.name;
    const updatedNodes = nodes.filter(n => n.id !== nodeId);
    const updatedLinks = links.filter(l => l.source !== nodeId && l.target !== nodeId);
    
    setTopology({ ...topology!, nodes: updatedNodes, links: updatedLinks }, `Deleted node: ${nodeName}`);
  };

  const startEditNode = (node: NetworkNode) => {
    setNodeForm({
      id: node.id,
      name: node.name,
      country: node.country || '',
      type: node.type || 'router'
    });
    setEditingNodeId(node.id);
  };

  const resetNodeForm = () => {
    setNodeForm({ id: '', name: '', country: '', type: 'router' });
    setEditingNodeId(null);
  };

  // Link operations
  const handleAddLink = () => {
    if (!linkForm.source || !linkForm.target || linkForm.source === linkForm.target) return;
    
    const linkId = linkForm.id || `${linkForm.source}-${linkForm.target}`;
    
    const newLink: NetworkLink = {
      id: linkId,
      source: linkForm.source,
      target: linkForm.target,
      cost: linkForm.cost || 10,
      forward_cost: linkForm.is_asymmetric ? linkForm.forward_cost : linkForm.cost,
      reverse_cost: linkForm.is_asymmetric ? linkForm.reverse_cost : linkForm.cost,
      capacity: linkForm.capacity || 1000,
      type: linkForm.type as 'backbone' | 'asymmetric' | 'standard' || 'standard',
      sourceInterface: linkForm.sourceInterface || undefined,
      targetInterface: linkForm.targetInterface || undefined,
      is_asymmetric: linkForm.is_asymmetric || false
    };
    
    const updatedTopology = {
      ...topology!,
      links: [...links, newLink]
    };
    
    setTopology(updatedTopology, `Added link: ${linkForm.source} → ${linkForm.target}`);
    resetLinkForm();
    setShowAddLinkDialog(false);
  };

  const handleUpdateLink = () => {
    if (!editingLinkId) return;
    
    const updatedLinks = links.map(link => 
      link.id === editingLinkId 
        ? {
            ...link,
            cost: linkForm.cost || link.cost,
            forward_cost: linkForm.is_asymmetric ? linkForm.forward_cost : linkForm.cost,
            reverse_cost: linkForm.is_asymmetric ? linkForm.reverse_cost : linkForm.cost,
            capacity: linkForm.capacity,
            type: linkForm.type as 'backbone' | 'asymmetric' | 'standard',
            sourceInterface: linkForm.sourceInterface,
            targetInterface: linkForm.targetInterface,
            is_asymmetric: linkForm.is_asymmetric
          }
        : link
    );
    
    setTopology({ ...topology!, links: updatedLinks }, `Updated link: ${editingLinkId}`);
    resetLinkForm();
    setEditingLinkId(null);
  };

  const handleDeleteLink = (linkId: string) => {
    const updatedLinks = links.filter(l => l.id !== linkId);
    setTopology({ ...topology!, links: updatedLinks }, `Deleted link: ${linkId}`);
  };

  const startEditLink = (link: NetworkLink) => {
    setLinkForm({
      id: link.id,
      source: link.source,
      target: link.target,
      cost: link.cost,
      forward_cost: link.forward_cost || link.cost,
      reverse_cost: link.reverse_cost || link.cost,
      capacity: link.capacity,
      type: link.type || 'standard',
      sourceInterface: link.sourceInterface || '',
      targetInterface: link.targetInterface || '',
      is_asymmetric: link.is_asymmetric || false
    });
    setEditingLinkId(link.id);
  };

  const resetLinkForm = () => {
    setLinkForm({
      id: '',
      source: '',
      target: '',
      cost: 10,
      capacity: 1000,
      type: 'standard',
      sourceInterface: '',
      targetInterface: '',
      is_asymmetric: false,
      forward_cost: 10,
      reverse_cost: 10
    });
    setEditingLinkId(null);
  };

  // Export topology
  const handleExport = () => {
    if (!topology) return;
    const blob = new Blob([JSON.stringify(topology, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'topology.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const getNodeName = (nodeId: string) => nodes.find(n => n.id === nodeId)?.name || nodeId;

  if (!topology) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Load a topology to edit</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Edit2 className="w-4 h-4" />
            Topology Editor
          </CardTitle>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-3.5 h-3.5 mr-1" />
            Export
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-hidden p-3">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-2 mb-3">
            <TabsTrigger value="nodes" className="text-xs">
              <Server className="w-3.5 h-3.5 mr-1" />
              Nodes ({nodes.length})
            </TabsTrigger>
            <TabsTrigger value="links" className="text-xs">
              <Link2 className="w-3.5 h-3.5 mr-1" />
              Links ({links.length})
            </TabsTrigger>
          </TabsList>

          {/* Nodes Tab */}
          <TabsContent value="nodes" className="flex-1 overflow-hidden mt-0">
            <div className="flex flex-col h-full gap-3">
              {/* Add Node Button */}
              <Dialog open={showAddNodeDialog} onOpenChange={setShowAddNodeDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" className="w-full">
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Add Node
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Node</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Node ID *</Label>
                      <Input 
                        placeholder="e.g., R9" 
                        value={nodeForm.id || ''} 
                        onChange={e => setNodeForm({...nodeForm, id: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Name *</Label>
                      <Input 
                        placeholder="e.g., Router-Sydney" 
                        value={nodeForm.name || ''} 
                        onChange={e => setNodeForm({...nodeForm, name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Country</Label>
                      <Input 
                        placeholder="e.g., Australia" 
                        value={nodeForm.country || ''} 
                        onChange={e => setNodeForm({...nodeForm, country: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select value={nodeForm.type || 'router'} onValueChange={v => setNodeForm({...nodeForm, type: v})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="router">Router</SelectItem>
                          <SelectItem value="switch">Switch</SelectItem>
                          <SelectItem value="firewall">Firewall</SelectItem>
                          <SelectItem value="server">Server</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button onClick={handleAddNode} disabled={!nodeForm.id || !nodeForm.name}>
                      <Check className="w-3.5 h-3.5 mr-1" />
                      Add Node
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Node List */}
              <ScrollArea className="flex-1">
                <div className="space-y-2">
                  {nodes.map(node => (
                    <div 
                      key={node.id} 
                      className={`p-3 rounded-lg border ${editingNodeId === node.id ? 'border-primary bg-primary/5' : 'bg-muted/30'}`}
                    >
                      {editingNodeId === node.id ? (
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Name</Label>
                            <Input 
                              value={nodeForm.name || ''} 
                              onChange={e => setNodeForm({...nodeForm, name: e.target.value})}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Country</Label>
                            <Input 
                              value={nodeForm.country || ''} 
                              onChange={e => setNodeForm({...nodeForm, country: e.target.value})}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Type</Label>
                            <Select value={nodeForm.type || 'router'} onValueChange={v => setNodeForm({...nodeForm, type: v})}>
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="router">Router</SelectItem>
                                <SelectItem value="switch">Switch</SelectItem>
                                <SelectItem value="firewall">Firewall</SelectItem>
                                <SelectItem value="server">Server</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={handleUpdateNode} className="flex-1">
                              <Check className="w-3 h-3 mr-1" />
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={resetNodeForm}>
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{node.name}</span>
                              <Badge variant="outline" className="text-[10px]">{node.id}</Badge>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              {node.country && (
                                <Badge variant="secondary" className="text-[10px]">{node.country}</Badge>
                              )}
                              {node.type && (
                                <Badge variant="secondary" className="text-[10px]">{node.type}</Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEditNode(node)}>
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive">
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-destructive" />
                                    Delete Node?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will delete <strong>{node.name}</strong> and all connected links. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteNode(node.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          {/* Links Tab */}
          <TabsContent value="links" className="flex-1 overflow-hidden mt-0">
            <div className="flex flex-col h-full gap-3">
              {/* Add Link Button */}
              <Dialog open={showAddLinkDialog} onOpenChange={setShowAddLinkDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" className="w-full">
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Add Link
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add New Link</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Source Node *</Label>
                        <Select value={linkForm.source || ''} onValueChange={v => setLinkForm({...linkForm, source: v})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {nodes.map(n => (
                              <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Target Node *</Label>
                        <Select value={linkForm.target || ''} onValueChange={v => setLinkForm({...linkForm, target: v})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {nodes.filter(n => n.id !== linkForm.source).map(n => (
                              <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Source Interface</Label>
                        <Input 
                          placeholder="e.g., Gi0/0/1" 
                          value={linkForm.sourceInterface || ''} 
                          onChange={e => setLinkForm({...linkForm, sourceInterface: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Target Interface</Label>
                        <Input 
                          placeholder="e.g., Gi0/0/2" 
                          value={linkForm.targetInterface || ''} 
                          onChange={e => setLinkForm({...linkForm, targetInterface: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Asymmetric Costs</Label>
                      <Switch 
                        checked={linkForm.is_asymmetric || false} 
                        onCheckedChange={v => setLinkForm({...linkForm, is_asymmetric: v, type: v ? 'asymmetric' : linkForm.type})}
                      />
                    </div>

                    {linkForm.is_asymmetric ? (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Forward Cost</Label>
                          <Input 
                            type="number" 
                            value={linkForm.forward_cost || 10} 
                            onChange={e => setLinkForm({...linkForm, forward_cost: parseInt(e.target.value) || 10})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Reverse Cost</Label>
                          <Input 
                            type="number" 
                            value={linkForm.reverse_cost || 10} 
                            onChange={e => setLinkForm({...linkForm, reverse_cost: parseInt(e.target.value) || 10})}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label>Cost</Label>
                        <Input 
                          type="number" 
                          value={linkForm.cost || 10} 
                          onChange={e => setLinkForm({...linkForm, cost: parseInt(e.target.value) || 10})}
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Capacity (Mbps)</Label>
                        <Input 
                          type="number" 
                          value={linkForm.capacity || 1000} 
                          onChange={e => setLinkForm({...linkForm, capacity: parseInt(e.target.value) || 1000})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Type</Label>
                        <Select value={linkForm.type || 'standard'} onValueChange={v => setLinkForm({...linkForm, type: v as any})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="standard">Standard</SelectItem>
                            <SelectItem value="backbone">Backbone</SelectItem>
                            <SelectItem value="asymmetric">Asymmetric</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button onClick={handleAddLink} disabled={!linkForm.source || !linkForm.target || linkForm.source === linkForm.target}>
                      <Check className="w-3.5 h-3.5 mr-1" />
                      Add Link
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Link List */}
              <ScrollArea className="flex-1">
                <div className="space-y-2">
                  {links.map(link => (
                    <div 
                      key={link.id} 
                      className={`p-3 rounded-lg border ${editingLinkId === link.id ? 'border-primary bg-primary/5' : 'bg-muted/30'}`}
                    >
                      {editingLinkId === link.id ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label>Asymmetric Costs</Label>
                            <Switch 
                              checked={linkForm.is_asymmetric || false} 
                              onCheckedChange={v => setLinkForm({...linkForm, is_asymmetric: v})}
                            />
                          </div>
                          
                          {linkForm.is_asymmetric ? (
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label className="text-xs">Forward Cost</Label>
                                <Input 
                                  type="number"
                                  value={linkForm.forward_cost || 10} 
                                  onChange={e => setLinkForm({...linkForm, forward_cost: parseInt(e.target.value) || 10})}
                                  className="h-8 text-sm"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Reverse Cost</Label>
                                <Input 
                                  type="number"
                                  value={linkForm.reverse_cost || 10} 
                                  onChange={e => setLinkForm({...linkForm, reverse_cost: parseInt(e.target.value) || 10})}
                                  className="h-8 text-sm"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <Label className="text-xs">Cost</Label>
                              <Input 
                                type="number"
                                value={linkForm.cost || 10} 
                                onChange={e => setLinkForm({...linkForm, cost: parseInt(e.target.value) || 10})}
                                className="h-8 text-sm"
                              />
                            </div>
                          )}
                          
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Source Interface</Label>
                              <Input 
                                value={linkForm.sourceInterface || ''} 
                                onChange={e => setLinkForm({...linkForm, sourceInterface: e.target.value})}
                                className="h-8 text-sm"
                                placeholder="Gi0/0/1"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Target Interface</Label>
                              <Input 
                                value={linkForm.targetInterface || ''} 
                                onChange={e => setLinkForm({...linkForm, targetInterface: e.target.value})}
                                className="h-8 text-sm"
                                placeholder="Gi0/0/2"
                              />
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Capacity (Mbps)</Label>
                              <Input 
                                type="number"
                                value={linkForm.capacity || 1000} 
                                onChange={e => setLinkForm({...linkForm, capacity: parseInt(e.target.value) || 1000})}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Type</Label>
                              <Select value={linkForm.type || 'standard'} onValueChange={v => setLinkForm({...linkForm, type: v as any})}>
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="standard">Standard</SelectItem>
                                  <SelectItem value="backbone">Backbone</SelectItem>
                                  <SelectItem value="asymmetric">Asymmetric</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button size="sm" onClick={handleUpdateLink} className="flex-1">
                              <Check className="w-3 h-3 mr-1" />
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={resetLinkForm}>
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-1.5 text-sm">
                              <span className="font-medium">{getNodeName(link.source)}</span>
                              <span className="text-muted-foreground">→</span>
                              <span className="font-medium">{getNodeName(link.target)}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge variant="outline" className="text-[10px]">
                                Cost: {link.is_asymmetric ? `${link.forward_cost}/${link.reverse_cost}` : link.cost}
                              </Badge>
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
                              {link.sourceInterface && (
                                <Badge variant="secondary" className="text-[10px] bg-blue-500/20 text-blue-600">
                                  {link.sourceInterface}
                                </Badge>
                              )}
                              {link.targetInterface && (
                                <Badge variant="secondary" className="text-[10px] bg-purple-500/20 text-purple-600">
                                  {link.targetInterface}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEditLink(link)}>
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive">
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-destructive" />
                                    Delete Link?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will delete the link between <strong>{getNodeName(link.source)}</strong> and <strong>{getNodeName(link.target)}</strong>. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteLink(link.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
