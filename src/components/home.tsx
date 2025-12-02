import { useEffect, useState } from 'react';
import { useNetworkStore } from '@/store/networkStore';
import { useAuthStore } from '@/store/authStore';
import Sidebar from './Sidebar';
import NetworkGraph from './NetworkGraph';
import PathAnalysis from './PathAnalysis';
import PathMatrix from './PathMatrix';
import CostPlanner from './CostPlanner';
import BlastRadius from './BlastRadius';
import CapacityAnalysis from './CapacityAnalysis';
import DeepAnalysis from './DeepAnalysis';
import AsymmetryAnalyzer from './AsymmetryAnalyzer';
import WhatIfPlanner from './WhatIfPlanner';
import FailureSimulator from './FailureSimulator';
import TrafficFlowAnalyzer from './TrafficFlowAnalyzer';
import HistoryTracker from './HistoryTracker';
import TopologyVisualization from './TopologyVisualization';
import TopologyEditor from './TopologyEditor';
import AlertsSystem from './AlertsSystem';
import NetworkInventory from './NetworkInventory';
import NetworkDashboard from './NetworkDashboard';
import MaintenancePlanner from './MaintenancePlanner';
import UserManagement from './UserManagement';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Route, DollarSign, Activity, BarChart3, Globe, Grid3x3, Scale, Beaker, Zap, GitBranch, History, Network, Moon, Sun, Eye, EyeOff, Edit2, Bell, Package, LayoutDashboard, Wrench, Users } from 'lucide-react';

function Home() {
  const darkMode = useNetworkStore(state => state.darkMode);
  const toggleDarkMode = useNetworkStore(state => state.toggleDarkMode);
  const topology = useNetworkStore(state => state.topology);
  const currentUser = useAuthStore(state => state.currentUser);
  const logout = useAuthStore(state => state.logout);
  const [showVisualization, setShowVisualization] = useState(false);
  const [activeTab, setActiveTab] = useState('path');
  const [showTopology, setShowTopology] = useState(true);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  if (showVisualization) {
    return <TopologyVisualization onBack={() => setShowVisualization(false)} />;
  }

  return (
    <div className="w-screen h-screen flex flex-col bg-background text-foreground">
      {/* Top Navigation Bar */}
      <nav className="h-14 border-b border-border/50 bg-gradient-to-r from-card via-card to-card/95 px-4 flex items-center gap-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-primary/80">
            <Network className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-base font-bold gradient-text">OSPF Network Analyzer</h1>
            <p className="text-[10px] text-muted-foreground">Cost & Path Impact Analysis Tool</p>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center gap-1 overflow-x-auto pb-1">
          <Button 
            variant={activeTab === 'path' ? 'default' : 'ghost'} 
            size="sm" 
            className="h-8 gap-1.5 smooth-transition hover:bg-primary/10"
            onClick={() => setActiveTab('path')}
          >
            <Route className="w-4 h-4" />
            <span className="text-xs">Path</span>
          </Button>
          <Button 
            variant={activeTab === 'matrix' ? 'default' : 'ghost'} 
            size="sm" 
            className="h-8 gap-1.5 smooth-transition hover:bg-primary/10"
            onClick={() => setActiveTab('matrix')}
          >
            <Grid3x3 className="w-4 h-4" />
            <span className="text-xs">Matrix</span>
          </Button>
          <Button 
            variant={activeTab === 'cost' ? 'default' : 'ghost'} 
            size="sm" 
            className="h-8 gap-1.5 smooth-transition hover:bg-primary/10"
            onClick={() => setActiveTab('cost')}
          >
            <DollarSign className="w-4 h-4" />
            <span className="text-xs">Cost</span>
          </Button>
          <Button 
            variant={activeTab === 'whatif' ? 'default' : 'ghost'} 
            size="sm" 
            className="h-8 gap-1.5 smooth-transition hover:bg-primary/10"
            onClick={() => setActiveTab('whatif')}
          >
            <Beaker className="w-4 h-4" />
            <span className="text-xs">What-If</span>
          </Button>
          <Button 
            variant={activeTab === 'failure' ? 'default' : 'ghost'} 
            size="sm" 
            className="h-8 gap-1.5 smooth-transition hover:bg-primary/10"
            onClick={() => setActiveTab('failure')}
          >
            <Zap className="w-4 h-4" />
            <span className="text-xs">Failure</span>
          </Button>
          <Button 
            variant={activeTab === 'traffic' ? 'default' : 'ghost'} 
            size="sm" 
            className="h-8 gap-1.5 smooth-transition hover:bg-primary/10"
            onClick={() => setActiveTab('traffic')}
          >
            <GitBranch className="w-4 h-4" />
            <span className="text-xs">Traffic</span>
          </Button>
          <Button 
            variant={activeTab === 'history' ? 'default' : 'ghost'} 
            size="sm" 
            className="h-8 gap-1.5 smooth-transition hover:bg-primary/10"
            onClick={() => setActiveTab('history')}
          >
            <History className="w-4 h-4" />
            <span className="text-xs">History</span>
          </Button>
          <Button 
            variant={activeTab === 'blast' ? 'default' : 'ghost'} 
            size="sm" 
            className="h-8 gap-1.5 smooth-transition hover:bg-primary/10"
            onClick={() => setActiveTab('blast')}
          >
            <Activity className="w-4 h-4" />
            <span className="text-xs">Impact</span>
          </Button>
          <Button 
            variant={activeTab === 'asym' ? 'default' : 'ghost'} 
            size="sm" 
            className="h-8 gap-1.5 smooth-transition hover:bg-primary/10"
            onClick={() => setActiveTab('asym')}
          >
            <Scale className="w-4 h-4" />
            <span className="text-xs">Asymm</span>
          </Button>
          <Button 
            variant={activeTab === 'capacity' ? 'default' : 'ghost'} 
            size="sm" 
            className="h-8 gap-1.5 smooth-transition hover:bg-primary/10"
            onClick={() => setActiveTab('capacity')}
          >
            <BarChart3 className="w-4 h-4" />
            <span className="text-xs">Capacity</span>
          </Button>
          <Button 
            variant={activeTab === 'deep' ? 'default' : 'ghost'} 
            size="sm" 
            className="h-8 gap-1.5 smooth-transition hover:bg-primary/10"
            onClick={() => setActiveTab('deep')}
          >
            <Globe className="w-4 h-4" />
            <span className="text-xs">Deep</span>
          </Button>
          <Button 
            variant={activeTab === 'editor' ? 'default' : 'ghost'} 
            size="sm" 
            className="h-8 gap-1.5 smooth-transition hover:bg-primary/10"
            onClick={() => setActiveTab('editor')}
          >
            <Edit2 className="w-4 h-4" />
            <span className="text-xs">Editor</span>
          </Button>
          <Button 
            variant={activeTab === 'dashboard' ? 'default' : 'ghost'} 
            size="sm" 
            className="h-8 gap-1.5 smooth-transition hover:bg-primary/10"
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="text-xs">Dashboard</span>
          </Button>
          <Button 
            variant={activeTab === 'alerts' ? 'default' : 'ghost'} 
            size="sm" 
            className="h-8 gap-1.5 smooth-transition hover:bg-primary/10"
            onClick={() => setActiveTab('alerts')}
          >
            <Bell className="w-4 h-4" />
            <span className="text-xs">Alerts</span>
          </Button>
          <Button 
            variant={activeTab === 'inventory' ? 'default' : 'ghost'} 
            size="sm" 
            className="h-8 gap-1.5 smooth-transition hover:bg-primary/10"
            onClick={() => setActiveTab('inventory')}
          >
            <Package className="w-4 h-4" />
            <span className="text-xs">Inventory</span>
          </Button>
          <Button 
            variant={activeTab === 'maintenance' ? 'default' : 'ghost'} 
            size="sm" 
            className="h-8 gap-1.5 smooth-transition hover:bg-primary/10"
            onClick={() => setActiveTab('maintenance')}
          >
            <Wrench className="w-4 h-4" />
            <span className="text-xs">Maintenance</span>
          </Button>
          <Button 
            variant={activeTab === 'users' ? 'default' : 'ghost'} 
            size="sm" 
            className="h-8 gap-1.5 smooth-transition hover:bg-primary/10"
            onClick={() => setActiveTab('users')}
          >
            <Users className="w-4 h-4" />
            <span className="text-xs">Users</span>
          </Button>
        </div>

        <div className="flex items-center gap-3">
          {topology && (
            <div className="flex items-center gap-3 text-xs">
              <div className="metric-badge">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                <span className="font-medium">{topology.nodes.length}</span>
                <span className="text-muted-foreground">Nodes</span>
              </div>
              <div className="metric-badge">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                <span className="font-medium">{topology.links.length}</span>
                <span className="text-muted-foreground">Links</span>
              </div>
            </div>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTopology(!showTopology)}
            className="h-8 gap-1.5"
          >
            {showTopology ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span className="text-xs">{showTopology ? 'Hide Map' : 'Show Map'}</span>
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            onClick={toggleDarkMode}
            className="rounded-full h-8 w-8"
          >
            {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </Button>
          
          {/* User Info */}
          {currentUser && (
            <div className="flex items-center gap-2 pl-3 border-l border-border/50">
              <div className="text-right">
                <p className="text-xs font-medium">{currentUser.username}</p>
                <p className="text-[10px] text-muted-foreground capitalize">{currentUser.role}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10"
                onClick={() => { logout(); window.location.reload(); }}
              >
                Logout
              </Button>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar onOpenVisualization={() => setShowVisualization(true)} />

        {/* Center Canvas */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {showTopology ? <NetworkGraph /> : (
            <div className="flex-1 flex items-center justify-center bg-muted/20">
              <div className="text-center space-y-2">
                <Network className="w-16 h-16 mx-auto text-muted-foreground/50" />
                <p className="text-muted-foreground">Topology map is hidden</p>
                <Button variant="outline" size="sm" onClick={() => setShowTopology(true)}>
                  <Eye className="w-4 h-4 mr-2" />
                  Show Map
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel */}
        {topology ? (
          <div className="w-96 h-full border-l border-border/50 bg-gradient-to-b from-card to-card/95 overflow-y-auto shadow-lg">
            {activeTab === 'path' && <PathAnalysis />}
            {activeTab === 'matrix' && <PathMatrix />}
            {activeTab === 'cost' && <CostPlanner />}
            {activeTab === 'whatif' && <WhatIfPlanner />}
            {activeTab === 'failure' && <FailureSimulator />}
            {activeTab === 'traffic' && <TrafficFlowAnalyzer />}
            {activeTab === 'history' && <HistoryTracker />}
            {activeTab === 'blast' && <BlastRadius />}
            {activeTab === 'asym' && <AsymmetryAnalyzer />}
            {activeTab === 'capacity' && <CapacityAnalysis />}
            {activeTab === 'deep' && <DeepAnalysis />}
            {activeTab === 'editor' && <TopologyEditor />}
            {activeTab === 'alerts' && <AlertsSystem />}
            {activeTab === 'inventory' && <NetworkInventory />}
            {activeTab === 'dashboard' && <NetworkDashboard />}
            {activeTab === 'maintenance' && <MaintenancePlanner />}
            {activeTab === 'users' && <UserManagement onLogout={() => window.location.reload()} />}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default Home;
