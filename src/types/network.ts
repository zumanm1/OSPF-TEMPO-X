export interface NetworkNode {
  id: string;
  name: string;
  country?: string;
  type?: string;
  x?: number;
  y?: number;
}

export interface NetworkLink {
  id: string;
  source: string;
  target: string;
  cost: number;
  forward_cost?: number;
  reverse_cost?: number;
  capacity?: number;
  utilization?: number;
  type?: 'backbone' | 'asymmetric' | 'standard';
  sourceInterface?: string;
  targetInterface?: string;
  is_asymmetric?: boolean;
}

export interface NetworkTopology {
  nodes: NetworkNode[];
  links: NetworkLink[];
  metadata?: {
    name?: string;
    version?: string;
    timestamp?: string;
  };
}

export interface HopDetail {
  from: string;
  to: string;
  linkId: string;
  forwardCost: number;
  reverseCost: number;
  capacity?: number;
  interface?: string;
}

export interface PathResult {
  path: string[];
  cost: number;
  forwardCost: number;
  reverseCost: number;
  hops: number;
  hopDetails: HopDetail[];
  minCapacity?: number;
  bottleneck?: {
    linkId: string;
    capacity: number;
    utilization: number;
  };
}

export interface CostChange {
  linkId: string;
  originalCost: number;
  newCost: number;
  originalForwardCost?: number;
  newForwardCost?: number;
  originalReverseCost?: number;
  newReverseCost?: number;
  direction?: 'forward' | 'reverse' | 'both';
}

export interface BlastRadiusResult {
  affectedNodes: Set<string>;
  affectedPaths: Array<{
    source: string;
    target: string;
    oldPath: string[];
    newPath: string[];
    costDelta: number;
  }>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface CountryPathResult {
  sourceCountry: string;
  targetCountry: string;
  paths: Array<{
    sourceNode: string;
    targetNode: string;
    path: string[];
    cost: number;
    hops: number;
  }>;
  bestPath: {
    sourceNode: string;
    targetNode: string;
    path: string[];
    cost: number;
    hops: number;
  } | null;
  avgCost: number;
  totalPaths: number;
}

export interface DeepAnalysisResult {
  countryPaths: CountryPathResult[];
  networkStats: {
    totalNodes: number;
    totalLinks: number;
    countries: string[];
    avgPathCost: number;
    longestPath: number;
    shortestPath: number;
    criticalLinks: string[];
    redundancyScore: number;
  };
  countryConnectivity: {
    [country: string]: {
      nodes: number;
      connections: number;
      avgUtilization: number;
    };
  };
}
