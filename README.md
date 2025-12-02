# OSPF Network Analysis & Cost Planning Tool

A comprehensive React application for analyzing OSPF network topologies, performing path analysis, cost impact simulations, and capacity planning with interactive network visualization.

## Features

### 🗂️ File Upload & Parser
- Drag-and-drop interface for JSON topology files
- Real-time validation of network data
- Support for nodes, links, OSPF costs, and capacity data

### 🌐 Interactive Network Graph
- D3.js-powered force-directed graph visualization
- Color-coded links by type (backbone, asymmetric, standard)
- Interactive zoom, pan, and drag controls
- Tooltips with detailed node and link information
- Search and highlight functionality

### 🛣️ Path Analysis Engine
- Dijkstra's algorithm for shortest path calculation
- Primary and backup path computation
- Total cost, hop count, and capacity bottleneck detection
- Visual path highlighting on the graph

### 💰 Cost Change Simulator
- Interactive cost modification panel
- Before/after comparison
- Pending changes management
- Apply or reset cost modifications

### 💥 Blast Radius Viewer
- Impact analysis for cost changes
- Affected paths and nodes visualization
- Color-coded severity levels (low, medium, high, critical)
- Traffic shift analysis

### 📊 Capacity Analysis Dashboard
- Link utilization heatmap
- Congestion point identification
- Traffic growth simulation
- Headroom calculation

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

## Usage

### 1. Upload Topology

Click or drag-and-drop a JSON file with your OSPF network topology. The file should follow this structure:

```json
{
  "nodes": [
    {
      "id": "R1",
      "name": "Router-NYC",
      "country": "USA",
      "type": "core"
    }
  ],
  "links": [
    {
      "id": "L1",
      "source": "R1",
      "target": "R2",
      "cost": 10,
      "capacity": 10000,
      "utilization": 45,
      "type": "backbone"
    }
  ]
}
```

A sample topology file is available at `public/sample-topology.json`.

### 2. Explore the Network

- **Zoom/Pan**: Use mouse wheel to zoom, drag to pan
- **Search**: Type node names in the search box to highlight them
- **Hover**: Hover over nodes and links to see detailed information

### 3. Analyze Paths

1. Go to the "Path" tab in the right panel
2. Select source and destination nodes
3. Click "Calculate Paths" to see primary and backup routes
4. Paths will be highlighted on the graph

### 4. Plan Cost Changes

1. Go to the "Cost" tab
2. Select a link and enter a new cost
3. Add multiple changes to see pending modifications
4. Click "Apply" to update the topology

### 5. Analyze Impact

1. Go to the "Impact" tab
2. Select a link and enter a simulated cost
3. Click "Analyze Impact" to see the blast radius
4. View affected paths and severity level

### 6. Check Capacity

1. Go to the "Capacity" tab
2. View current utilization statistics
3. Enter a growth percentage to simulate traffic increase
4. See which links will be at risk

## Technology Stack

- **React** - UI framework
- **TypeScript** - Type safety
- **D3.js** - Network visualization
- **Zustand** - State management
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **Vite** - Build tool

## Dark Mode

Toggle dark mode using the moon/sun icon in the sidebar header.

## License

MIT

