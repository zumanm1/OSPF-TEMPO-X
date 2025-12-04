# OSPF-TEMPO-X

A comprehensive OSPF (Open Shortest Path First) network topology analyzer and planning tool with PostgreSQL backend.

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/zumanm1/OSPF-TEMPO-X.git
cd OSPF-TEMPO-X
```

### 2. Using Bash Scripts (Recommended)

```bash
# One-liner to install and start
./ospf-tempo-x.sh install && ./ospf-tempo-x.sh deps && ./ospf-tempo-x.sh db-setup && ./ospf-tempo-x.sh start

# Or step by step:
./ospf-tempo-x.sh install    # Install Node.js, PostgreSQL if not present
./ospf-tempo-x.sh deps       # Install npm dependencies
./ospf-tempo-x.sh db-setup   # Setup PostgreSQL database
./ospf-tempo-x.sh start      # Start servers (frontend: 9100, API: 9101)
```

### 3. Manual Installation

```bash
# Install dependencies
npm install

# Setup database (requires PostgreSQL)
psql -c "CREATE DATABASE ospf_tempo_x;"
psql -d ospf_tempo_x -f server/db/schema.sql
psql -d ospf_tempo_x -f server/db/init.sql

# Start development servers
npm run dev          # Frontend on port 9100
npm run server       # API on port 9101 (in separate terminal)
```

### 4. Access the Application

- **Frontend:** http://localhost:9100
- **API Server:** http://localhost:9101
- **API Health:** http://localhost:9101/api/health

### 5. Default Login Credentials

- **Username:** `netviz_admin`
- **Password:** `V3ry$trongAdm1n!2025`

## 📜 Available Scripts

| Script | Description |
|--------|-------------|
| `./ospf-tempo-x.sh install` | Install system requirements (Node.js, npm, PostgreSQL) |
| `./ospf-tempo-x.sh deps` | Install project dependencies |
| `./ospf-tempo-x.sh db-setup` | Setup PostgreSQL database and run migrations |
| `./ospf-tempo-x.sh start` | Start frontend (9100) and API (9101) servers |
| `./ospf-tempo-x.sh stop` | Stop all running servers |
| `./ospf-tempo-x.sh restart` | Restart all servers |
| `./ospf-tempo-x.sh status` | Show system and server status |
| `./ospf-tempo-x.sh logs` | View server logs |
| `./ospf-tempo-x.sh clean` | Clean build artifacts and node_modules |
| `./ospf-tempo-x.sh build` | Build for production |
| `./ospf-tempo-x.sh test` | Run health checks |
| `./ospf-tempo-x.sh help` | Show help message |

### Individual Scripts

```bash
./scripts/install.sh    # Install requirements only
./scripts/deps.sh       # Install dependencies only
./scripts/db-setup.sh   # Setup database only
./scripts/start.sh      # Start servers
./scripts/stop.sh       # Stop servers
./scripts/status.sh     # Check status
./scripts/restart.sh    # Restart servers
```

### Script Options

```bash
# Start with verbose output
./ospf-tempo-x.sh start --verbose

# Force reinstall dependencies
./ospf-tempo-x.sh deps --force

# Stop with force (no confirmation)
./ospf-tempo-x.sh stop --force

# Clean without confirmation
./ospf-tempo-x.sh clean --force

# Using environment variable for custom port
VITE_PORT=8080 API_PORT=8081 ./ospf-tempo-x.sh start
```

## 📦 Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  React Frontend │────▶│  Express API    │────▶│  PostgreSQL     │
│  (Port 9100)    │     │  (Port 9101)    │     │  (Port 5432)    │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## 🔧 Configuration

Copy `.env.example` to `.env` and configure:

```bash
# Application Ports
VITE_PORT=9100
API_PORT=9101

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ospf_tempo_x
DB_USER=your_username
DB_PASSWORD=your_password

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

## 📁 Project Structure

```
OSPF-TEMPO-X/
├── ospf-tempo-x.sh         # Main controller script
├── scripts/                # Bash management scripts
│   ├── install.sh          # Install system requirements
│   ├── deps.sh             # Install dependencies
│   ├── db-setup.sh         # Setup database
│   ├── start.sh            # Start servers
│   ├── stop.sh             # Stop servers
│   ├── status.sh           # Check status
│   └── restart.sh          # Restart servers
├── server/                 # Backend API
│   ├── db/                 # Database schema and connection
│   │   ├── schema.sql      # Database schema
│   │   ├── init.sql        # Initial seed data
│   │   └── index.ts        # Database connection
│   ├── middleware/         # Auth middleware
│   ├── routes/             # API routes
│   └── index.ts            # Server entry point
├── src/                    # Frontend React app
│   ├── components/         # React components
│   ├── lib/                # API client
│   ├── store/              # Zustand stores
│   ├── types/              # TypeScript types
│   └── utils/              # Graph algorithms
├── public/                 # Static files
├── .env.example            # Environment template
└── package.json            # Project dependencies
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

## 🚀 Deployment

### Production Build

```bash
# Build frontend
npm run build

# The dist/ folder contains the production build
```

### Docker (Coming Soon)

```bash
docker-compose up -d
```

## 🧪 Testing

```bash
# Run health checks
./ospf-tempo-x.sh test

# Manual API test
curl http://localhost:9101/api/health
```

## 📝 License

MIT

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

For issues and questions:
- Open an issue on GitHub
- Check existing issues for solutions

---

Made with ❤️ for network engineers
