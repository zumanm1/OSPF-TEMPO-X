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
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Route, DollarSign, Activity, BarChart3, Globe, Grid3x3, Scale, Beaker, Zap, GitBranch, History, Network, Moon, Sun, Eye, EyeOff, Edit2, Bell, Package, LayoutDashboard, Wrench, Users, ChevronDown, Settings, Gauge, Shield } from 'lucide-react';

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

        <div className="flex-1 flex items-center justify-center gap-1">
          {/* Path Analysis - Primary Actions */}
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
            variant={activeTab === 'dashboard' ? 'default' : 'ghost'} 
            size="sm" 
            className="h-8 gap-1.5 smooth-transition hover:bg-primary/10"
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="text-xs">Dashboard</span>
          </Button>

          {/* Simulation Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant={['whatif', 'failure', 'blast', 'cost'].includes(activeTab) ? 'default' : 'ghost'} 
                size="sm" 
                className="h-8 gap-1.5 smooth-transition hover:bg-primary/10"
              >
                <Beaker className="w-4 h-4" />
                <span className="text-xs">Simulate</span>
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-48">
              <DropdownMenuLabel className="text-xs">Simulations</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setActiveTab('whatif')} className="gap-2">
                <Beaker className="w-4 h-4" />
                <span>What-If Planner</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveTab('failure')} className="gap-2">
                <Zap className="w-4 h-4" />
                <span>Failure Simulator</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveTab('blast')} className="gap-2">
                <Activity className="w-4 h-4" />
                <span>Blast Radius</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveTab('cost')} className="gap-2">
                <DollarSign className="w-4 h-4" />
                <span>Cost Planner</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Analysis Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant={['traffic', 'asym', 'capacity', 'deep'].includes(activeTab) ? 'default' : 'ghost'} 
                size="sm" 
                className="h-8 gap-1.5 smooth-transition hover:bg-primary/10"
              >
                <Gauge className="w-4 h-4" />
                <span className="text-xs">Analysis</span>
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-48">
              <DropdownMenuLabel className="text-xs">Advanced Analysis</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setActiveTab('traffic')} className="gap-2">
                <GitBranch className="w-4 h-4" />
                <span>Traffic Flow</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveTab('asym')} className="gap-2">
                <Scale className="w-4 h-4" />
                <span>Asymmetry</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveTab('capacity')} className="gap-2">
                <BarChart3 className="w-4 h-4" />
                <span>Capacity</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveTab('deep')} className="gap-2">
                <Globe className="w-4 h-4" />
                <span>Deep Analysis</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Operations Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant={['alerts', 'inventory', 'maintenance', 'history'].includes(activeTab) ? 'default' : 'ghost'} 
                size="sm" 
                className="h-8 gap-1.5 smooth-transition hover:bg-primary/10"
              >
                <Shield className="w-4 h-4" />
                <span className="text-xs">Operations</span>
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-48">
              <DropdownMenuLabel className="text-xs">Network Operations</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setActiveTab('alerts')} className="gap-2">
                <Bell className="w-4 h-4" />
                <span>Alerts</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveTab('inventory')} className="gap-2">
                <Package className="w-4 h-4" />
                <span>Inventory</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveTab('maintenance')} className="gap-2">
                <Wrench className="w-4 h-4" />
                <span>Maintenance</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveTab('history')} className="gap-2">
                <History className="w-4 h-4" />
                <span>History</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Config Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant={['editor', 'users'].includes(activeTab) ? 'default' : 'ghost'} 
                size="sm" 
                className="h-8 gap-1.5 smooth-transition hover:bg-primary/10"
              >
                <Settings className="w-4 h-4" />
                <span className="text-xs">Config</span>
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-48">
              <DropdownMenuLabel className="text-xs">Configuration</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setActiveTab('editor')} className="gap-2">
                <Edit2 className="w-4 h-4" />
                <span>Topology Editor</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveTab('users')} className="gap-2">
                <Users className="w-4 h-4" />
                <span>User Management</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
