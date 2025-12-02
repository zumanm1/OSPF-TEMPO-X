import { useCallback, useState } from 'react';
import { Upload, FileJson, AlertCircle, Database } from 'lucide-react';
import { useNetworkStore } from '@/store/networkStore';
import { NetworkTopology } from '@/types/network';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export default function FileUpload() {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setTopology = useNetworkStore(state => state.setTopology);

  // Normalize topology data to handle different JSON formats
  const normalizeTopology = (data: any): any => {
    if (!data.nodes || !data.links) return data;

    // Normalize nodes - ensure name exists
    const normalizedNodes = data.nodes.map((node: any) => ({
      ...node,
      name: node.name || node.hostname || node.id,
      type: node.type || node.node_type,
    }));

    // Track used IDs to ensure uniqueness
    const usedIds = new Set<string>();
    
    // Normalize links - auto-generate IDs and map field names
    const normalizedLinks = data.links.map((link: any, index: number) => {
      // Generate ID if missing: source-target-index
      let linkId = link.id || `${link.source}-${link.target}-${index}`;
      
      // Ensure ID uniqueness
      if (usedIds.has(linkId)) {
        linkId = `${linkId}-${Date.now()}-${index}`;
      }
      usedIds.add(linkId);
      
      // Map interface field names (source_interface -> sourceInterface)
      const sourceInterface = link.sourceInterface || link.source_interface;
      const targetInterface = link.targetInterface || link.target_interface;
      
      // Map type field (edge_type -> type)
      let linkType = link.type || link.edge_type;
      if (linkType === 'asymmetric') linkType = 'asymmetric';
      else if (linkType === 'backbone') linkType = 'backbone';
      else linkType = 'standard';

      // Extract capacity from nested structure if present
      let capacity = link.capacity;
      if (!capacity && link.source_capacity?.total_capacity_mbps) {
        capacity = link.source_capacity.total_capacity_mbps;
      }

      // Extract utilization from nested traffic structure
      let utilization = link.utilization;
      if (utilization === undefined && link.traffic?.forward_utilization_pct !== undefined) {
        utilization = link.traffic.forward_utilization_pct;
      }

      // Preserve forward_cost and reverse_cost for asymmetric links
      const forwardCost = link.forward_cost ?? link.cost;
      const reverseCost = link.reverse_cost ?? link.cost;
      const isAsymmetric = link.is_asymmetric || linkType === 'asymmetric' || forwardCost !== reverseCost;

      return {
        ...link,
        id: linkId,
        sourceInterface,
        targetInterface,
        type: linkType,
        capacity,
        utilization,
        forward_cost: forwardCost,
        reverse_cost: reverseCost,
        is_asymmetric: isAsymmetric,
      };
    });

    return {
      ...data,
      nodes: normalizedNodes,
      links: normalizedLinks,
    };
  };

  const validateTopology = (data: any): data is NetworkTopology => {
    if (!data.nodes || !Array.isArray(data.nodes)) {
      setError('Invalid topology: missing or invalid nodes array');
      return false;
    }
    if (!data.links || !Array.isArray(data.links)) {
      setError('Invalid topology: missing or invalid links array');
      return false;
    }
    
    // Validate nodes have required fields
    for (const node of data.nodes) {
      if (!node.id || !node.name) {
        setError('Invalid node: missing id or name');
        return false;
      }
    }
    
    // Validate links have required fields (after normalization, id should exist)
    for (const link of data.links) {
      if (!link.source || !link.target || link.cost === undefined) {
        setError('Invalid link: missing source, target, or cost');
        return false;
      }
    }
    
    return true;
  };

  const handleFile = useCallback((file: File) => {
    setError(null);
    
    if (!file.name.endsWith('.json')) {
      setError('Please upload a JSON file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const rawData = JSON.parse(e.target?.result as string);
        const data = normalizeTopology(rawData);
        if (validateTopology(data)) {
          setTopology(data);
        }
      } catch (err) {
        setError('Invalid JSON file format');
      }
    };
    reader.readAsText(file);
  }, [setTopology]);

  const loadSampleTopology = useCallback(async () => {
    setError(null);
    setLoading(true);
    
    try {
      // Use import.meta.env.BASE_URL for correct path in all deployment scenarios
      const basePath = import.meta.env.BASE_URL || '/';
      const response = await fetch(`${basePath}sample-topology.json`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const rawData = await response.json();
      const data = normalizeTopology(rawData);
      if (validateTopology(data)) {
        setTopology(data);
      }
    } catch (err) {
      console.error('Failed to load sample topology:', err);
      setError('Failed to load sample topology. Please try uploading a file instead.');
    } finally {
      setLoading(false);
    }
  }, [setTopology]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [handleFile]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  }, [handleFile]);

  return (
    <div className="space-y-4">
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 transition-colors ${
          dragActive
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="file-upload"
          accept=".json"
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="flex flex-col items-center justify-center space-y-3 text-center">
          <div className="p-3 bg-primary/10 rounded-full">
            {dragActive ? (
              <FileJson className="w-8 h-8 text-primary" />
            ) : (
              <Upload className="w-8 h-8 text-muted-foreground" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium">
              {dragActive ? 'Drop your file here' : 'Drag & drop your OSPF topology JSON'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              or click to browse
            </p>
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button 
        variant="outline" 
        className="w-full gap-2"
        onClick={loadSampleTopology}
        disabled={loading}
      >
        <Database className="w-4 h-4" />
        {loading ? 'Loading...' : 'Load Sample Topology'}
      </Button>
    </div>
  );
}
