import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { NetworkTopology, NetworkNode, NetworkLink, PathResult, CostChange } from '@/types/network';

interface TopologySnapshot {
  id: string;
  timestamp: Date;
  description: string;
  topology: NetworkTopology;
}

interface NetworkStore {
  topology: NetworkTopology | null;
  selectedNodes: { source: string | null; target: string | null };
  pathResults: PathResult[];
  costChanges: CostChange[];
  highlightedPath: string[] | null;
  highlightedLinks: Set<string>;
  filterNodeType: string | null;
  filterLinkType: string | null;
  searchQuery: string;
  darkMode: boolean;
  topologyHistory: TopologySnapshot[];
  currentHistoryIndex: number;
  
  setTopology: (topology: NetworkTopology, description?: string) => void;
  setSelectedSource: (nodeId: string | null) => void;
  setSelectedTarget: (nodeId: string | null) => void;
  setPathResults: (results: PathResult[]) => void;
  addCostChange: (change: CostChange) => void;
  removeCostChange: (linkId: string) => void;
  applyCostChanges: () => void;
  resetCostChanges: () => void;
  setHighlightedPath: (path: string[] | null) => void;
  setHighlightedLinks: (links: Set<string>) => void;
  setFilterNodeType: (type: string | null) => void;
  setFilterLinkType: (type: string | null) => void;
  setSearchQuery: (query: string) => void;
  toggleDarkMode: () => void;
  updateLinkCost: (linkId: string, newCost: number) => void;
  saveSnapshot: (description: string) => void;
  restoreSnapshot: (snapshotId: string) => void;
  clearHistory: () => void;
  reset: () => void;
}

export const useNetworkStore = create<NetworkStore>()(
  persist(
    (set, get) => ({
  topology: null,
  selectedNodes: { source: null, target: null },
  pathResults: [],
  costChanges: [],
  highlightedPath: null,
  highlightedLinks: new Set(),
  filterNodeType: null,
  filterLinkType: null,
  searchQuery: '',
  darkMode: false,
  topologyHistory: [],
  currentHistoryIndex: -1,

  setTopology: (topology, description = 'Initial topology') => {
    const snapshot: TopologySnapshot = {
      id: Date.now().toString(),
      timestamp: new Date(),
      description,
      topology: JSON.parse(JSON.stringify(topology)) // Deep clone
    };
    
    set((state) => ({
      topology,
      topologyHistory: [...state.topologyHistory, snapshot],
      currentHistoryIndex: state.topologyHistory.length
    }));
  },
  
  setSelectedSource: (nodeId) => 
    set((state) => ({ 
      selectedNodes: { ...state.selectedNodes, source: nodeId } 
    })),
  
  setSelectedTarget: (nodeId) => 
    set((state) => ({ 
      selectedNodes: { ...state.selectedNodes, target: nodeId } 
    })),
  
  setPathResults: (results) => set({ pathResults: results }),
  
  addCostChange: (change) => 
    set((state) => {
      const existing = state.costChanges.findIndex(c => c.linkId === change.linkId);
      if (existing >= 0) {
        const updated = [...state.costChanges];
        updated[existing] = change;
        return { costChanges: updated };
      }
      return { costChanges: [...state.costChanges, change] };
    }),
  
  removeCostChange: (linkId) => 
    set((state) => ({
      costChanges: state.costChanges.filter(c => c.linkId !== linkId)
    })),
  
  applyCostChanges: () => 
    set((state) => {
      if (!state.topology) return state;
      
      const updatedLinks = state.topology.links.map(link => {
        const change = state.costChanges.find(c => c.linkId === link.id);
        if (change) {
          return { 
            ...link, 
            cost: change.newCost,
            forward_cost: change.newForwardCost ?? change.newCost,
            reverse_cost: change.direction === 'both' 
              ? (change.newReverseCost ?? change.newCost)
              : (link.reverse_cost ?? link.cost)
          };
        }
        return link;
      });
      
      return {
        topology: { ...state.topology, links: updatedLinks },
        costChanges: []
      };
    }),
  
  resetCostChanges: () => set({ costChanges: [] }),
  
  setHighlightedPath: (path) => set({ highlightedPath: path }),
  
  setHighlightedLinks: (links) => set({ highlightedLinks: links }),
  
  setFilterNodeType: (type) => set({ filterNodeType: type }),
  
  setFilterLinkType: (type) => set({ filterLinkType: type }),
  
  setSearchQuery: (query) => set({ searchQuery: query }),
  
  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
  
  updateLinkCost: (linkId, newCost) => 
    set((state) => {
      if (!state.topology) return state;
      
      const updatedLinks = state.topology.links.map(link => 
        link.id === linkId ? { ...link, cost: newCost } : link
      );
      
      const updatedTopology = { ...state.topology, links: updatedLinks };
      
      // Save snapshot
      const snapshot: TopologySnapshot = {
        id: Date.now().toString(),
        timestamp: new Date(),
        description: `Updated cost for link ${linkId}`,
        topology: JSON.parse(JSON.stringify(updatedTopology))
      };
      
      return {
        topology: updatedTopology,
        topologyHistory: [...state.topologyHistory, snapshot],
        currentHistoryIndex: state.topologyHistory.length
      };
    }),
  
  saveSnapshot: (description) =>
    set((state) => {
      if (!state.topology) return state;
      
      const snapshot: TopologySnapshot = {
        id: Date.now().toString(),
        timestamp: new Date(),
        description,
        topology: JSON.parse(JSON.stringify(state.topology))
      };
      
      return {
        topologyHistory: [...state.topologyHistory, snapshot],
        currentHistoryIndex: state.topologyHistory.length
      };
    }),
  
  restoreSnapshot: (snapshotId) =>
    set((state) => {
      const snapshot = state.topologyHistory.find(s => s.id === snapshotId);
      if (!snapshot) return state;
      
      const index = state.topologyHistory.findIndex(s => s.id === snapshotId);
      
      return {
        topology: JSON.parse(JSON.stringify(snapshot.topology)),
        currentHistoryIndex: index
      };
    }),
  
  clearHistory: () =>
    set((state) => ({
      topologyHistory: state.topology ? [{
        id: Date.now().toString(),
        timestamp: new Date(),
        description: 'Current topology',
        topology: JSON.parse(JSON.stringify(state.topology))
      }] : [],
      currentHistoryIndex: 0
    })),
  
  reset: () => set({
    topology: null,
    selectedNodes: { source: null, target: null },
    pathResults: [],
    costChanges: [],
    highlightedPath: null,
    highlightedLinks: new Set(),
    filterNodeType: null,
    filterLinkType: null,
    searchQuery: ''
  })
    }),
    {
      name: 'netviz-network-storage',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Only persist these specific fields
      partialize: (state) => ({
        topology: state.topology,
        darkMode: state.darkMode,
        topologyHistory: state.topologyHistory,
        currentHistoryIndex: state.currentHistoryIndex,
      }),
      // Custom serialization to handle Set and Date
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Ensure highlightedLinks is a Set after rehydration
          state.highlightedLinks = new Set();
          // Convert timestamp strings back to Date objects
          state.topologyHistory = state.topologyHistory.map(snapshot => ({
            ...snapshot,
            timestamp: new Date(snapshot.timestamp)
          }));
        }
      },
    }
  )
);
