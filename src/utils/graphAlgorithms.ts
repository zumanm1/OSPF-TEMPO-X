import { NetworkTopology, NetworkLink, PathResult } from '@/types/network';

interface Graph {
  [nodeId: string]: { [neighbor: string]: number };
}

export function buildGraph(topology: NetworkTopology): Graph {
  const graph: Graph = {};
  
  // Initialize all nodes
  topology.nodes.forEach(node => {
    graph[node.id] = {};
  });
  
  // Add edges
  topology.links.forEach(link => {
    if (!graph[link.source]) graph[link.source] = {};
    if (!graph[link.target]) graph[link.target] = {};
    
    // Forward direction uses cost (or forward_cost)
    const forwardCost = (link as any).forward_cost ?? link.cost;
    graph[link.source][link.target] = forwardCost;
    
    // Reverse direction - use reverse_cost for asymmetric, same cost otherwise
    const reverseCost = (link as any).reverse_cost ?? link.cost;
    graph[link.target][link.source] = reverseCost;
  });
  
  return graph;
}

export function dijkstra(
  graph: Graph,
  source: string,
  target: string
): { path: string[]; cost: number } | null {
  const distances: { [key: string]: number } = {};
  const previous: { [key: string]: string | null } = {};
  const unvisited = new Set<string>(Object.keys(graph));
  
  // Initialize distances
  Object.keys(graph).forEach(node => {
    distances[node] = node === source ? 0 : Infinity;
    previous[node] = null;
  });
  
  while (unvisited.size > 0) {
    // Find node with minimum distance
    let current: string | null = null;
    let minDistance = Infinity;
    
    unvisited.forEach(node => {
      if (distances[node] < minDistance) {
        minDistance = distances[node];
        current = node;
      }
    });
    
    if (current === null || distances[current] === Infinity) break;
    if (current === target) break;
    
    unvisited.delete(current);
    
    // Update distances to neighbors
    Object.entries(graph[current] || {}).forEach(([neighbor, cost]) => {
      if (unvisited.has(neighbor)) {
        const alt = distances[current!] + cost;
        if (alt < distances[neighbor]) {
          distances[neighbor] = alt;
          previous[neighbor] = current;
        }
      }
    });
  }
  
  // Reconstruct path
  if (distances[target] === Infinity) return null;
  
  const path: string[] = [];
  let current: string | null = target;
  
  while (current !== null) {
    path.unshift(current);
    current = previous[current];
  }
  
  return { path, cost: distances[target] };
}

export function findKShortestPaths(
  topology: NetworkTopology,
  source: string,
  target: string,
  k: number = 2
): PathResult[] {
  const graph = buildGraph(topology);
  const results: PathResult[] = [];
  
  // Find primary path
  const primary = dijkstra(graph, source, target);
  if (!primary) return results;
  
  // Calculate forward and reverse costs along the path
  const pathCosts = calculatePathCosts(topology, primary.path);
  
  results.push({
    path: primary.path,
    cost: primary.cost,
    forwardCost: pathCosts.forwardCost,
    reverseCost: pathCosts.reverseCost,
    hops: primary.path.length - 1,
    hopDetails: pathCosts.hopDetails,
    minCapacity: pathCosts.minCapacity,
    bottleneck: findBottleneck(topology, primary.path)
  });
  
  // Find backup path by removing primary path links
  if (k > 1) {
    const modifiedGraph = JSON.parse(JSON.stringify(graph));
    
    // Remove primary path edges
    for (let i = 0; i < primary.path.length - 1; i++) {
      const from = primary.path[i];
      const to = primary.path[i + 1];
      delete modifiedGraph[from]?.[to];
      delete modifiedGraph[to]?.[from];
    }
    
    const backup = dijkstra(modifiedGraph, source, target);
    if (backup) {
      const backupCosts = calculatePathCosts(topology, backup.path);
      results.push({
        path: backup.path,
        cost: backup.cost,
        forwardCost: backupCosts.forwardCost,
        reverseCost: backupCosts.reverseCost,
        hops: backup.path.length - 1,
        hopDetails: backupCosts.hopDetails,
        minCapacity: backupCosts.minCapacity,
        bottleneck: findBottleneck(topology, backup.path)
      });
    }
  }
  
  return results;
}

// Calculate accumulated forward/reverse costs and minimum capacity along a path
function calculatePathCosts(
  topology: NetworkTopology,
  path: string[]
): { forwardCost: number; reverseCost: number; minCapacity: number | undefined; hopDetails: import('@/types/network').HopDetail[] } {
  let forwardCost = 0;
  let reverseCost = 0;
  let minCapacity: number | undefined = undefined;
  const hopDetails: import('@/types/network').HopDetail[] = [];
  
  for (let i = 0; i < path.length - 1; i++) {
    const from = path[i];
    const to = path[i + 1];
    
    // Find the link between these nodes
    const link = topology.links.find(
      l => (l.source === from && l.target === to) ||
           (l.target === from && l.source === to)
    );
    
    if (link) {
      let hopForwardCost: number;
      let hopReverseCost: number;
      
      // Determine direction and accumulate costs
      if (link.source === from && link.target === to) {
        // Forward direction on this link
        hopForwardCost = link.forward_cost ?? link.cost;
        hopReverseCost = link.reverse_cost ?? link.cost;
      } else {
        // Reverse direction on this link
        hopForwardCost = link.reverse_cost ?? link.cost;
        hopReverseCost = link.forward_cost ?? link.cost;
      }
      
      forwardCost += hopForwardCost;
      reverseCost += hopReverseCost;
      
      // Add hop detail
      hopDetails.push({
        from,
        to,
        linkId: link.id,
        forwardCost: hopForwardCost,
        reverseCost: hopReverseCost,
        capacity: link.capacity,
        interface: link.sourceInterface
      });
      
      // Track minimum capacity (not accumulated, just the minimum)
      if (link.capacity !== undefined) {
        if (minCapacity === undefined || link.capacity < minCapacity) {
          minCapacity = link.capacity;
        }
      }
    }
  }
  
  return { forwardCost, reverseCost, minCapacity, hopDetails };
}

function findBottleneck(
  topology: NetworkTopology,
  path: string[]
): PathResult['bottleneck'] {
  let bottleneck: PathResult['bottleneck'] = undefined;
  let minCapacity = Infinity;
  
  for (let i = 0; i < path.length - 1; i++) {
    const link = topology.links.find(
      l => (l.source === path[i] && l.target === path[i + 1]) ||
           (l.target === path[i] && l.source === path[i + 1])
    );
    
    if (link && link.capacity && link.utilization !== undefined) {
      const availableCapacity = link.capacity * (1 - link.utilization / 100);
      if (availableCapacity < minCapacity) {
        minCapacity = availableCapacity;
        bottleneck = {
          linkId: link.id,
          capacity: link.capacity,
          utilization: link.utilization
        };
      }
    }
  }
  
  return bottleneck;
}

export function calculateBlastRadius(
  topology: NetworkTopology,
  linkId: string,
  newCost: number
): {
  affectedPaths: Array<{
    source: string;
    target: string;
    oldCost: number;
    newCost: number;
    pathChanged: boolean;
  }>;
  affectedNodes: Set<string>;
} {
  const affectedPaths: Array<{
    source: string;
    target: string;
    oldCost: number;
    newCost: number;
    pathChanged: boolean;
  }> = [];
  const affectedNodes = new Set<string>();
  
  const link = topology.links.find(l => l.id === linkId);
  if (!link) return { affectedPaths, affectedNodes };
  
  // Build original graph
  const originalGraph = buildGraph(topology);
  
  // Build modified graph
  const modifiedTopology = {
    ...topology,
    links: topology.links.map(l => 
      l.id === linkId ? { ...l, cost: newCost } : l
    )
  };
  const modifiedGraph = buildGraph(modifiedTopology);
  
  // Check all node pairs
  const nodes = topology.nodes.map(n => n.id);
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const source = nodes[i];
      const target = nodes[j];
      
      const oldPath = dijkstra(originalGraph, source, target);
      const newPath = dijkstra(modifiedGraph, source, target);
      
      if (oldPath && newPath) {
        const pathChanged = JSON.stringify(oldPath.path) !== JSON.stringify(newPath.path);
        const costChanged = oldPath.cost !== newPath.cost;
        
        if (pathChanged || costChanged) {
          affectedPaths.push({
            source,
            target,
            oldCost: oldPath.cost,
            newCost: newPath.cost,
            pathChanged
          });
          
          newPath.path.forEach(nodeId => affectedNodes.add(nodeId));
        }
      }
    }
  }
  
  return { affectedPaths, affectedNodes };
}

export function performDeepAnalysis(topology: NetworkTopology) {
  const graph = buildGraph(topology);
  
  // Get unique countries
  const countries = [...new Set(topology.nodes.map(n => n.country).filter(Boolean))] as string[];
  
  // Calculate all country-to-country paths
  const countryPaths: Array<{
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
  }> = [];

  for (let i = 0; i < countries.length; i++) {
    for (let j = i + 1; j < countries.length; j++) {
      const sourceCountry = countries[i];
      const targetCountry = countries[j];
      
      const sourceNodes = topology.nodes.filter(n => n.country === sourceCountry);
      const targetNodes = topology.nodes.filter(n => n.country === targetCountry);
      
      const paths: Array<{
        sourceNode: string;
        targetNode: string;
        path: string[];
        cost: number;
        hops: number;
      }> = [];
      
      for (const sNode of sourceNodes) {
        for (const tNode of targetNodes) {
          const result = dijkstra(graph, sNode.id, tNode.id);
          if (result) {
            paths.push({
              sourceNode: sNode.id,
              targetNode: tNode.id,
              path: result.path,
              cost: result.cost,
              hops: result.path.length - 1
            });
          }
        }
      }
      
      const bestPath = paths.length > 0 
        ? paths.reduce((best, curr) => curr.cost < best.cost ? curr : best)
        : null;
      
      const avgCost = paths.length > 0 
        ? paths.reduce((sum, p) => sum + p.cost, 0) / paths.length 
        : 0;
      
      countryPaths.push({
        sourceCountry,
        targetCountry,
        paths,
        bestPath,
        avgCost,
        totalPaths: paths.length
      });
    }
  }

  // Calculate network statistics
  const allPaths: Array<{ cost: number; hops: number }> = [];
  const nodes = topology.nodes.map(n => n.id);
  
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const result = dijkstra(graph, nodes[i], nodes[j]);
      if (result) {
        allPaths.push({ cost: result.cost, hops: result.path.length - 1 });
      }
    }
  }

  // Find critical links (links that appear in most paths)
  const linkUsage: { [linkId: string]: number } = {};
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const result = dijkstra(graph, nodes[i], nodes[j]);
      if (result) {
        for (let k = 0; k < result.path.length - 1; k++) {
          const link = topology.links.find(
            l => (l.source === result.path[k] && l.target === result.path[k + 1]) ||
                 (l.target === result.path[k] && l.source === result.path[k + 1])
          );
          if (link) {
            linkUsage[link.id] = (linkUsage[link.id] || 0) + 1;
          }
        }
      }
    }
  }

  const criticalLinks = Object.entries(linkUsage)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([linkId]) => linkId);

  // Calculate redundancy score (avg number of alternative paths)
  let redundancyCount = 0;
  let pairCount = 0;
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const paths = findKShortestPaths(topology, nodes[i], nodes[j], 2);
      if (paths.length > 1) redundancyCount++;
      pairCount++;
    }
  }
  const redundancyScore = pairCount > 0 ? (redundancyCount / pairCount) * 100 : 0;

  // Country connectivity
  const countryConnectivity: {
    [country: string]: {
      nodes: number;
      connections: number;
      avgUtilization: number;
    };
  } = {};

  for (const country of countries) {
    const countryNodes = topology.nodes.filter(n => n.country === country);
    const nodeIds = new Set(countryNodes.map(n => n.id));
    
    const countryLinks = topology.links.filter(
      l => nodeIds.has(l.source) || nodeIds.has(l.target)
    );
    
    const avgUtil = countryLinks.length > 0
      ? countryLinks.reduce((sum, l) => sum + (l.utilization || 0), 0) / countryLinks.length
      : 0;

    countryConnectivity[country] = {
      nodes: countryNodes.length,
      connections: countryLinks.length,
      avgUtilization: avgUtil
    };
  }

  return {
    countryPaths,
    networkStats: {
      totalNodes: topology.nodes.length,
      totalLinks: topology.links.length,
      countries,
      avgPathCost: allPaths.length > 0 
        ? allPaths.reduce((sum, p) => sum + p.cost, 0) / allPaths.length 
        : 0,
      longestPath: allPaths.length > 0 
        ? Math.max(...allPaths.map(p => p.hops)) 
        : 0,
      shortestPath: allPaths.length > 0 
        ? Math.min(...allPaths.map(p => p.hops)) 
        : 0,
      criticalLinks,
      redundancyScore
    },
    countryConnectivity
  };
}

// Bandwidth-aware path calculator that considers both OSPF cost and available capacity
export interface BandwidthAwarePath {
  path: string[];
  ospfCost: number;
  forwardCost: number;
  reverseCost: number;
  hops: number;
  minCapacity: number;
  availableBandwidth: number;
  bottleneckLink: string | null;
  score: number; // Combined score considering cost and bandwidth
  hopDetails: Array<{
    from: string;
    to: string;
    linkId: string;
    forwardCost: number;
    reverseCost: number;
    capacity: number;
    utilization: number;
    availableBandwidth: number;
  }>;
}

export function findBandwidthAwarePaths(
  topology: NetworkTopology,
  source: string,
  target: string,
  requiredBandwidth: number = 0,
  costWeight: number = 0.5, // 0-1, higher = prioritize cost over bandwidth
  k: number = 5
): BandwidthAwarePath[] {
  const results: BandwidthAwarePath[] = [];
  
  // Build graph with bandwidth consideration
  const graph: { [key: string]: { [key: string]: { cost: number; capacity: number; utilization: number; linkId: string } } } = {};
  
  topology.nodes.forEach(node => {
    graph[node.id] = {};
  });
  
  topology.links.forEach(link => {
    const capacity = link.capacity || 1000;
    const utilization = link.utilization || 0;
    const availableBw = capacity * (1 - utilization / 100);
    
    // Skip links that don't have enough bandwidth
    if (requiredBandwidth > 0 && availableBw < requiredBandwidth) {
      return;
    }
    
    const forwardCost = link.forward_cost ?? link.cost;
    const reverseCost = link.reverse_cost ?? link.cost;
    
    graph[link.source][link.target] = {
      cost: forwardCost,
      capacity,
      utilization,
      linkId: link.id
    };
    graph[link.target][link.source] = {
      cost: reverseCost,
      capacity,
      utilization,
      linkId: link.id
    };
  });
  
  // Modified Dijkstra that tracks bandwidth
  function dijkstraWithBandwidth(
    graph: { [key: string]: { [key: string]: { cost: number; capacity: number; utilization: number; linkId: string } } },
    start: string,
    end: string,
    excludeLinks: Set<string> = new Set()
  ): BandwidthAwarePath | null {
    const distances: { [key: string]: number } = {};
    const previous: { [key: string]: string | null } = {};
    const minBandwidth: { [key: string]: number } = {};
    const visited = new Set<string>();
    const queue: Array<{ node: string; distance: number }> = [];
    
    Object.keys(graph).forEach(node => {
      distances[node] = Infinity;
      previous[node] = null;
      minBandwidth[node] = Infinity;
    });
    
    distances[start] = 0;
    queue.push({ node: start, distance: 0 });
    
    while (queue.length > 0) {
      queue.sort((a, b) => a.distance - b.distance);
      const { node: current } = queue.shift()!;
      
      if (visited.has(current)) continue;
      visited.add(current);
      
      if (current === end) break;
      
      for (const neighbor in graph[current]) {
        const edge = graph[current][neighbor];
        if (excludeLinks.has(edge.linkId)) continue;
        
        const availableBw = edge.capacity * (1 - edge.utilization / 100);
        const newDistance = distances[current] + edge.cost;
        
        if (newDistance < distances[neighbor]) {
          distances[neighbor] = newDistance;
          previous[neighbor] = current;
          minBandwidth[neighbor] = Math.min(
            minBandwidth[current] === Infinity ? availableBw : minBandwidth[current],
            availableBw
          );
          queue.push({ node: neighbor, distance: newDistance });
        }
      }
    }
    
    if (distances[end] === Infinity) return null;
    
    // Reconstruct path
    const path: string[] = [];
    let current: string | null = end;
    while (current) {
      path.unshift(current);
      current = previous[current];
    }
    
    // Calculate detailed hop information
    const hopDetails: BandwidthAwarePath['hopDetails'] = [];
    let bottleneckLink: string | null = null;
    let minAvailableBw = Infinity;
    let totalForwardCost = 0;
    let totalReverseCost = 0;
    
    for (let i = 0; i < path.length - 1; i++) {
      const from = path[i];
      const to = path[i + 1];
      const edge = graph[from][to];
      const link = topology.links.find(l => l.id === edge.linkId);
      
      const availableBw = edge.capacity * (1 - edge.utilization / 100);
      
      // Determine actual forward/reverse costs based on direction
      let hopForward = edge.cost;
      let hopReverse = edge.cost;
      if (link) {
        if (link.source === from && link.target === to) {
          hopForward = link.forward_cost ?? link.cost;
          hopReverse = link.reverse_cost ?? link.cost;
        } else {
          hopForward = link.reverse_cost ?? link.cost;
          hopReverse = link.forward_cost ?? link.cost;
        }
      }
      
      totalForwardCost += hopForward;
      totalReverseCost += hopReverse;
      
      hopDetails.push({
        from,
        to,
        linkId: edge.linkId,
        forwardCost: hopForward,
        reverseCost: hopReverse,
        capacity: edge.capacity,
        utilization: edge.utilization,
        availableBandwidth: availableBw
      });
      
      if (availableBw < minAvailableBw) {
        minAvailableBw = availableBw;
        bottleneckLink = edge.linkId;
      }
    }
    
    // Calculate combined score (lower is better)
    // Normalize cost and bandwidth to 0-1 range for fair comparison
    const maxCost = Math.max(...topology.links.map(l => l.forward_cost ?? l.cost)) * path.length;
    const maxBw = Math.max(...topology.links.map(l => l.capacity || 1000));
    
    const normalizedCost = distances[end] / maxCost;
    const normalizedBw = 1 - (minAvailableBw / maxBw); // Invert so lower is better
    
    const score = costWeight * normalizedCost + (1 - costWeight) * normalizedBw;
    
    return {
      path,
      ospfCost: distances[end],
      forwardCost: totalForwardCost,
      reverseCost: totalReverseCost,
      hops: path.length - 1,
      minCapacity: Math.min(...hopDetails.map(h => h.capacity)),
      availableBandwidth: minAvailableBw,
      bottleneckLink,
      score,
      hopDetails
    };
  }
  
  // Find k-shortest bandwidth-aware paths
  const excludedLinks = new Set<string>();
  
  for (let i = 0; i < k; i++) {
    const path = dijkstraWithBandwidth(graph, source, target, excludedLinks);
    if (!path) break;
    
    results.push(path);
    
    // Exclude links from the found path for next iteration
    path.hopDetails.forEach(hop => excludedLinks.add(hop.linkId));
  }
  
  // Sort by score (lower is better)
  results.sort((a, b) => a.score - b.score);
  
  return results;
}

