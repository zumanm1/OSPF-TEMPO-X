# OSPF-TEMPO-X - Network Analysis & Cost Planning Tool

A comprehensive React + Node.js application for analyzing OSPF network topologies, performing path analysis, cost impact simulations, and capacity planning with interactive network visualization.

## 🚀 Quick Start

### Prerequisites

- **Node.js** v18 or later
- **PostgreSQL** v14 or later

### Installation

```bash
# Install dependencies and set up database
./scripts/install.sh

# Start both API server and frontend
./scripts/start.sh
```

### Access the Application

- **Frontend:** http://localhost:9100
- **API Server:** http://localhost:9101
- **API Health:** http://localhost:9101/api/health

### Default Login Credentials

- **Username:** `netviz_admin`
- **Password:** `V3ry$trongAdm1n!2025`

## 📦 Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  React Frontend │────▶│  Express API    │────▶│  PostgreSQL     │
│  (Port 9100)    │     │  (Port 9101)    │     │  (Port 5432)    │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## 🛠️ Scripts Reference

| Script | Description |
|--------|-------------|
| `./scripts/install.sh` | Install Node.js dependencies and set up PostgreSQL database |
| `./scripts/start.sh` | Start both API server and frontend |
| `./scripts/stop.sh` | Stop all running services |
| `./scripts/restart.sh` | Restart all services |
| `./scripts/status.sh` | Show status of all services |

## 🔧 Configuration

Copy `.env.example` to `.env` and configure:

```bash
# Frontend Configuration
VITE_PORT=9100
VITE_API_URL=http://localhost:9101/api

# API Server Configuration
API_PORT=9101
NODE_ENV=development

# PostgreSQL Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ospf_tempo_x
DB_USER=postgres
DB_PASSWORD=postgres

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
```

## 📊 Features

### 🗂️ Topology Management
- Drag-and-drop JSON file upload
- Real-time validation
- Database persistence
- Snapshot history and rollback

### 🌐 Interactive Network Graph
- D3.js force-directed visualization
- Color-coded links (backbone, asymmetric, standard)
- Zoom, pan, and drag controls
- Interface labels and cost display

### 🛣️ Path Analysis Engine
- Dijkstra's algorithm for shortest paths
- K-shortest paths calculation
- Per-hop cost breakdown (forward/reverse)
- Capacity bottleneck detection

### 💰 Simulation Tools
- What-If cost change planner
- Link failure simulator
- Blast radius analysis
- ECMP traffic flow visualization

### 📊 Advanced Analysis
- Capacity planning with growth simulation
- Asymmetric cost detection
- Country-to-country connectivity
- Single point of failure (SPOF) detection

### 👥 User Management
- Role-based access (admin/user)
- Secure password hashing (bcrypt)
- JWT authentication
- Session management

## 🗄️ Database Schema

The application uses PostgreSQL with the following main tables:

- `users` - User accounts and authentication
- `topologies` - Network topology data
- `topology_snapshots` - Change history
- `cost_changes` - Cost modification tracking
- `alert_rules` - Monitoring rules
- `alert_events` - Alert history
- `maintenance_windows` - Scheduled maintenance

## 🔒 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/password` - Change password
- `POST /api/auth/logout` - Logout

### Users (Admin only)
- `GET /api/users` - List all users
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Topologies
- `GET /api/topologies` - List topologies
- `GET /api/topologies/:id` - Get topology with data
- `POST /api/topologies` - Create topology
- `PUT /api/topologies/:id` - Update topology
- `DELETE /api/topologies/:id` - Delete topology
- `GET /api/topologies/:id/snapshots` - Get snapshots
- `POST /api/topologies/:id/snapshots` - Create snapshot
- `POST /api/topologies/:id/snapshots/:snapshotId/restore` - Restore snapshot

## 💻 Development

### Manual Start

```bash
# Terminal 1: Start API server
npm run server

# Terminal 2: Start frontend
npm run dev

# Or both together
npm run dev:all
```

### Build for Production

```bash
npm run build
```

## 📁 Project Structure

```
OSPF-TEMPO-X/
├── server/                 # Backend API
│   ├── db/                 # Database schema and connection
│   ├── middleware/         # Auth middleware
│   ├── routes/             # API routes
│   └── index.ts            # Server entry point
├── src/                    # Frontend React app
│   ├── components/         # React components
│   ├── lib/                # API client
│   ├── store/              # Zustand stores
│   ├── types/              # TypeScript types
│   └── utils/              # Graph algorithms
├── scripts/                # Bash management scripts
├── public/                 # Static files
└── .env                    # Environment configuration
```

## 🔧 Technology Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **D3.js** - Network visualization
- **Zustand** - State management
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **Vite** - Build tool

### Backend
- **Node.js** - Runtime
- **Express.js** - API framework
- **PostgreSQL** - Database
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT auth
- **tsx** - TypeScript execution

## 📝 License

MIT

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
