# OSPF-TEMPO-X

A comprehensive OSPF (Open Shortest Path First) network topology analyzer and cost planning tool with PostgreSQL backend, interactive D3.js visualization, and real-time path analysis.

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/zumanm1/OSPF-TEMPO-X.git
cd OSPF-TEMPO-X
```

### 2. Using Bash Scripts (Recommended)

```bash
# One-liner to install and start
./scripts/install.sh && ./scripts/start.sh

# Or step by step:
./scripts/install.sh     # Install Node.js, PostgreSQL if not present, plus npm dependencies
./scripts/start.sh       # Start servers (Frontend: 9100, API: 9101)
```

### 3. Manual Installation

```bash
# Install frontend dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your PostgreSQL credentials

# Setup database (requires PostgreSQL running)
psql -U your_user -c "CREATE DATABASE ospf_tempo_x;"
psql -U your_user -d ospf_tempo_x -f server/db/schema.sql
psql -U your_user -d ospf_tempo_x -f server/db/init.sql

# Start development servers
npm run server           # API on port 9101
npm run dev              # Frontend on port 9100
```

## 📜 Available Scripts

| Script | Description |
|--------|-------------|
| `./scripts/install.sh` | Install system requirements (Node.js, npm) and project dependencies |
| `./scripts/start.sh` | Start frontend (9100) and API (9101) servers |
| `./scripts/stop.sh` | Stop all running servers |
| `./scripts/restart.sh` | Restart all servers |
| `./scripts/status.sh` | Show system and server status including PostgreSQL |

### Individual npm Scripts

```bash
npm run dev              # Start frontend dev server (port 9100)
npm run server           # Start API server (port 9101)
npm run build            # Build frontend for production
```

## 🔧 Configuration

Copy `.env.example` to `.env` and configure:

```bash
# Application Ports
VITE_PORT=9100           # Frontend development server
API_PORT=9101            # Backend API server

# PostgreSQL Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ospf_tempo_x
DB_USER=your_username
DB_PASSWORD=your_password

# Security
JWT_SECRET=your-super-secret-jwt-key-change-in-production
```

## 🔐 Default Login Credentials

| Username | Password | Role |
|----------|----------|------|
| `netviz_admin` | `V3ry$trongAdm1n!2025` | Admin |

## 📦 Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  React Frontend │────▶│  Express API    │────▶│  PostgreSQL     │
│  (Port 9100)    │     │  (Port 9101)    │     │  (Port 5432)    │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │
        │    D3.js Network      │    JWT Auth
        │    Visualization      │    bcrypt Passwords
        │    Zustand State      │    CORS Enabled
        └───────────────────────┘
```

## 🌐 Access URLs

### Local Access
- **Frontend:** http://localhost:9100
- **API Server:** http://localhost:9101
- **API Health:** http://localhost:9101/api/health

### External Access (when using --host 0.0.0.0)
- **Frontend:** http://YOUR_SERVER_IP:9100
- **API Server:** http://YOUR_SERVER_IP:9101

## 📊 Features

### 🗂️ Topology Management
- Drag-and-drop JSON file upload
- Real-time validation
- Database persistence with PostgreSQL
- Snapshot history and rollback
- Sample topology included

### 🌐 Interactive Network Graph
- D3.js force-directed visualization
- Color-coded links (backbone, asymmetric, standard)
- Zoom, pan, and drag controls
- Interface labels and cost display
- Node tooltips with detailed info

### 🛣️ Path Analysis Engine
- Dijkstra's algorithm for shortest paths
- K-shortest paths calculation
- Per-hop cost breakdown (forward/reverse)
- Capacity bottleneck detection
- Visual path highlighting

### 💰 Simulation Tools
- What-If cost change planner
- Link failure simulator
- Blast radius analysis
- ECMP traffic flow visualization

### 📊 Advanced Analysis
- Capacity planning with growth simulation
- Asymmetric cost detection
- Country-to-country connectivity matrix
- Single point of failure (SPOF) detection

### 👥 User Management
- Role-based access (admin/user)
- Secure password hashing (bcrypt)
- JWT authentication
- Session management

## 🗄️ Database Schema

The application uses PostgreSQL with the following main tables:

| Table | Description |
|-------|-------------|
| `users` | User accounts and authentication |
| `topologies` | Network topology data |
| `topology_snapshots` | Change history |
| `cost_changes` | Cost modification tracking |
| `alert_rules` | Monitoring rules |
| `alert_events` | Alert history |
| `maintenance_windows` | Scheduled maintenance |
| `user_preferences` | User settings and preferences |
| `audit_log` | Activity tracking |
| `sessions` | JWT session management |

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | User login |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/password` | Change password |
| POST | `/api/auth/logout` | Logout |

### Users (Admin only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List all users |
| POST | `/api/users` | Create user |
| PUT | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Delete user |

### Topologies
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/topologies` | List topologies |
| GET | `/api/topologies/:id` | Get topology with data |
| POST | `/api/topologies` | Create topology |
| PUT | `/api/topologies/:id` | Update topology |
| DELETE | `/api/topologies/:id` | Delete topology |

### Snapshots
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/topologies/:id/snapshots` | Get snapshots |
| POST | `/api/topologies/:id/snapshots` | Create snapshot |
| POST | `/api/topologies/:id/snapshots/:sid/restore` | Restore snapshot |

## 📁 Project Structure

```
OSPF-TEMPO-X/
├── server/                 # Backend API
│   ├── db/                 # Database schema and connection
│   │   ├── index.ts        # Database connection pool
│   │   ├── schema.sql      # PostgreSQL schema
│   │   └── init.sql        # Initial data (admin user)
│   ├── middleware/         # Auth middleware
│   │   └── auth.ts         # JWT verification
│   ├── routes/             # API routes
│   │   ├── auth.ts         # Authentication routes
│   │   ├── users.ts        # User management routes
│   │   └── topologies.ts   # Topology routes
│   └── index.ts            # Server entry point
├── src/                    # Frontend React app
│   ├── components/         # React components
│   │   ├── home.tsx        # Main dashboard
│   │   ├── LoginPage.tsx   # Login interface
│   │   ├── NetworkGraph.tsx # D3.js visualization
│   │   ├── PathAnalysis.tsx # Path calculator
│   │   └── ...             # Other components
│   ├── lib/                # Utilities
│   │   └── api.ts          # API client
│   ├── store/              # Zustand stores
│   │   ├── authStore.ts    # Authentication state
│   │   └── networkStore.ts # Network state
│   ├── types/              # TypeScript types
│   └── utils/              # Graph algorithms
│       └── graphAlgorithms.ts # Dijkstra, etc.
├── scripts/                # Bash management scripts
│   ├── install.sh          # Install dependencies
│   ├── start.sh            # Start servers
│   ├── stop.sh             # Stop servers
│   ├── restart.sh          # Restart servers
│   └── status.sh           # Check status
├── public/                 # Static files
│   └── sample-topology.json # Sample network data
├── .env.example            # Environment template
├── package.json            # Project configuration
├── vite.config.ts          # Vite configuration
└── README.md               # This file
```

## 🔧 Technology Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React 18 | UI framework |
| TypeScript | Type safety |
| D3.js | Network visualization |
| Zustand | State management |
| Tailwind CSS | Styling |
| shadcn/ui | UI components |
| Vite | Build tool |

### Backend
| Technology | Purpose |
|------------|---------|
| Node.js | Runtime |
| Express.js | API framework |
| PostgreSQL | Database |
| bcryptjs | Password hashing |
| jsonwebtoken | JWT auth |
| tsx | TypeScript execution |

## 🚀 Deployment

### Remote Server Deployment

```bash
# On remote server
git clone https://github.com/zumanm1/OSPF-TEMPO-X.git
cd OSPF-TEMPO-X

# Setup environment
cp .env.example .env
nano .env  # Configure database credentials

# Install and start
./scripts/install.sh
./scripts/start.sh
```

### Docker (Coming Soon)

```bash
docker-compose up -d
```

## 🐛 Troubleshooting

### PostgreSQL Connection Issues
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Start PostgreSQL
sudo systemctl start postgresql

# Check connection
pg_isready -h localhost -p 5432
```

### Port Already in Use
```bash
# Check what's using the port
lsof -i :9100
lsof -i :9101

# Kill process or use stop script
./scripts/stop.sh
```

### API Health Check
```bash
curl http://localhost:9101/api/health
# Should return: {"status":"healthy","database":"connected"}
```

## 📝 License

MIT

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📧 Support

For issues and questions, please open an issue on GitHub.
