# OSPF-TEMPO-X

A comprehensive OSPF (Open Shortest Path First) network topology analyzer and planning tool with PostgreSQL backend and enterprise-grade authentication.

**GitHub Repository:** https://github.com/zumanm1/OSPF-TEMPO-X.git

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/zumanm1/OSPF-TEMPO-X.git
cd OSPF-TEMPO-X
```

### 2. First-Time Setup (Recommended)

```bash
# Option A: Full isolated setup with nvm (recommended)
./ospf-tempo-x.sh setup     # Installs nvm + Node.js v20 (one-time)
./ospf-tempo-x.sh deps      # Install npm dependencies
./ospf-tempo-x.sh db-setup  # Setup PostgreSQL database
./ospf-tempo-x.sh start     # Start servers

# Option B: Quick start (if Node.js already installed)
./ospf-tempo-x.sh install && ./ospf-tempo-x.sh deps && ./ospf-tempo-x.sh start
```

### 3. Returning Users

```bash
# Just start - auto-switches to correct Node version if nvm installed
./ospf-tempo-x.sh start
```

### 4. Manual Installation

```bash
# Install frontend dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your database credentials

# Start development servers
npm run dev           # Frontend only (port 9100)
# OR for full stack:
npm run start         # Frontend + API server
```

**Access the app:** http://localhost:9100

**Default credentials:**
- Username: `netviz_admin`
- Password: `V3ry$trongAdm1n!2025`

---

## 🔐 Standalone Setup with App0 (Auth-Vault)

If you want to run **only App4 (Tempo-X)** with centralized authentication from App0, follow these steps:

### Prerequisites

- Ubuntu 20.04+ or compatible Linux
- Node.js v24.x, npm 11.x
- PostgreSQL 14+
- Java 17+ (for Keycloak)

### Step 1: Clone App0 (Auth-Vault)

```bash
cd ~
mkdir -p the-6-apps && cd the-6-apps

# Clone App0 (Auth-Vault)
git clone https://github.com/zumanm1/auth-vault.git app0-auth-vault
```

### Step 2: Start App0 Services (Keycloak + Vault)

```bash
cd ~/the-6-apps/app0-auth-vault
./auth-vault.sh install   # First time only
./auth-vault.sh start
```

**Verify App0 is running:**
```bash
curl http://localhost:9120/health/ready  # Keycloak
curl http://localhost:9121/v1/sys/health # Vault
```

### Step 3: Clone and Start App4 (Tempo-X)

```bash
cd ~/the-6-apps

# Clone App4
git clone https://github.com/zumanm1/ospf-tempo-x.git app4-tempo-x
cd app4-tempo-x

# Install and start
./ospf-tempo-x.sh install
./ospf-tempo-x.sh deps
./ospf-tempo-x.sh db-setup
./ospf-tempo-x.sh start
```

### Step 4: Verify Both Apps Running

| Service | Port | URL | Health Check |
|---------|------|-----|--------------|
| Keycloak (App0) | 9120 | http://localhost:9120/admin | `curl localhost:9120/health/ready` |
| Vault (App0) | 9121 | http://localhost:9121/ui | `curl localhost:9121/v1/sys/health` |
| Frontend (App4) | 9100 | http://localhost:9100 | Browser |
| Backend (App4) | 9101 | http://localhost:9101/api/health | `curl localhost:9101/api/health` |

### Quick Start (Copy-Paste)

```bash
# Full standalone setup for App0 + App4
cd ~ && mkdir -p the-6-apps && cd the-6-apps
git clone https://github.com/zumanm1/auth-vault.git app0-auth-vault
git clone https://github.com/zumanm1/ospf-tempo-x.git app4-tempo-x

# Start App0
cd app0-auth-vault && ./auth-vault.sh install && ./auth-vault.sh start
cd ..

# Start App4
cd app4-tempo-x
./ospf-tempo-x.sh install && ./ospf-tempo-x.sh deps && ./ospf-tempo-x.sh db-setup && ./ospf-tempo-x.sh start
```

---

## 📜 Available Scripts

### Setup Commands

| Script | Description |
|--------|-------------|
| `./ospf-tempo-x.sh setup` | **First-time setup**: Install nvm + Node.js v20 (isolated environment) |
| `./ospf-tempo-x.sh install` | Check/install system requirements (Node.js, npm, PostgreSQL) |
| `./ospf-tempo-x.sh deps` | Check/install project dependencies (skips if already installed) |
| `./ospf-tempo-x.sh db-setup` | Setup PostgreSQL database and initialize schema |
| `./scripts/setup-nvm.sh` | Standalone nvm + Node.js environment setup script |

### Server Commands

| Script | Description |
|--------|-------------|
| `./ospf-tempo-x.sh start` | Start Frontend (9100) and API (9101) servers |
| `./ospf-tempo-x.sh stop` | Stop all running servers |
| `./ospf-tempo-x.sh restart` | Restart all servers |
| `./ospf-tempo-x.sh status` | Show system and server status |
| `./ospf-tempo-x.sh logs` | View server logs (tail -f) |

### Build Commands

| Script | Description |
|--------|-------------|
| `./ospf-tempo-x.sh clean` | Clean build artifacts and node_modules |
| `./ospf-tempo-x.sh build` | Build for production |
| `./ospf-tempo-x.sh test` | Run health checks |

### Individual Scripts

```bash
./scripts/setup-nvm.sh    # Setup nvm + Node.js (interactive)
./scripts/install.sh      # Install system requirements only
./scripts/deps.sh         # Install dependencies only
./scripts/db-setup.sh     # Setup database only
./scripts/start.sh        # Start all servers (foreground)
./scripts/stop.sh         # Stop all servers
./scripts/status.sh       # Check status
./scripts/restart.sh      # Restart servers
```

### Script Options

```bash
# Force reinstall dependencies
./ospf-tempo-x.sh deps --force

# Stop without confirmation
./ospf-tempo-x.sh stop --force

# Clean without confirmation
./ospf-tempo-x.sh clean --force

# Using environment variables
VITE_PORT=8080 API_PORT=8081 ./ospf-tempo-x.sh start
```

## 🔒 Isolated Node.js Environment

This project uses **isolated Node.js/npm versions** to avoid conflicts with other projects on your machine.

### Quick Setup (Recommended)

```bash
# One command to install nvm + Node.js v20
./ospf-tempo-x.sh setup

# Or use the standalone script
./scripts/setup-nvm.sh
```

This will:
1. Install nvm (Node Version Manager) if not present
2. Install Node.js v20 LTS
3. Configure your shell for auto-switching
4. Display next steps

### Version Pinning Files

| File | Purpose | Tool Support |
|------|---------|--------------|
| `.nvmrc` | Pins Node v20 | nvm, fnm |
| `.node-version` | Pins Node v20 | fnm, volta, nodenv |
| `package.json` engines | Enforces Node 18+, npm 9+ | npm |

### Using nvm (Recommended)

```bash
# Option 1: Use our setup script (easiest)
./ospf-tempo-x.sh setup

# Option 2: Manual nvm installation
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Restart terminal, then:
cd OSPF-TEMPO-X
nvm use          # Automatically uses Node v20 from .nvmrc

# Or manually:
nvm install 20
nvm use 20
```

### Using Volta (Alternative)

```bash
# Install Volta
curl https://get.volta.sh | bash

# Pin versions for this project
cd OSPF-TEMPO-X
volta pin node@20
volta pin npm@10
```

### Using fnm (Fast Alternative)

```bash
# Install fnm
curl -fsSL https://fnm.vercel.app/install | bash

# Use project version
cd OSPF-TEMPO-X
fnm use          # Reads .node-version
```

### Automatic Version Switching

All `./ospf-tempo-x.sh` commands automatically:
1. Detect if nvm is installed
2. Switch to the project's required Node version (v20)
3. Warn if using an incompatible version

```bash
./ospf-tempo-x.sh setup     # Install nvm + Node.js (first-time)
./ospf-tempo-x.sh install   # Shows isolation status and switches Node version
./ospf-tempo-x.sh start     # Auto-loads correct Node version before starting
./ospf-tempo-x.sh deps      # Auto-loads correct Node version before installing
```

### Shell Auto-Switching (Optional)

Add this to your `~/.zshrc` or `~/.bashrc` for automatic version switching when entering the project directory:

```bash
# Auto-switch Node version when entering directory with .nvmrc
autoload -U add-zsh-hook 2>/dev/null
load-nvmrc() {
  if [ -f .nvmrc ]; then
    nvm use 2>/dev/null
  fi
}
add-zsh-hook chpwd load-nvmrc 2>/dev/null
```

## 🛠️ System Requirements

- **Node.js** v18.0.0 - v24.x (v20 LTS recommended)
- **npm** v9.0.0+ (comes with Node.js)
- **PostgreSQL** v14+ (required for database)
- Modern browser (Chrome, Firefox, Safari, Edge)

### Install Node.js

**Ubuntu/Debian:**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

**CentOS/RHEL:**
```bash
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs
```

**macOS:**
```bash
brew install node@20
```

### Install PostgreSQL

**Ubuntu/Debian:**
```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
```

**macOS:**
```bash
brew install postgresql@15
brew services start postgresql@15
```

## 🔐 Authentication System

OSPF-TEMPO-X includes enterprise-grade authentication:

- **JWT-based sessions** with secure token storage
- **Password hashing** with bcrypt (10 rounds)
- **Role-based access control** (admin/user)
- **Session management** with token refresh
- **Admin panel** for user management

## 📊 Features

### 🗂️ Topology Management
| Feature | Description |
|---------|-------------|
| **File Upload** | Drag-and-drop JSON topology upload |
| **Validation** | Real-time topology validation |
| **Database Storage** | PostgreSQL persistence |
| **Snapshots** | Version history with rollback |

### 🌐 Interactive Network Graph
| Feature | Description |
|---------|-------------|
| **D3.js Visualization** | Force-directed graph |
| **Color-coded Links** | Backbone (green), Asymmetric (orange), Standard (gray) |
| **Interactive Controls** | Zoom, pan, drag |
| **Cost Display** | OSPF cost labels on links |

### 🛣️ Path Analysis
| Feature | Description |
|---------|-------------|
| **Dijkstra Algorithm** | Shortest path calculation |
| **K-Shortest Paths** | Multiple path options |
| **Cost Breakdown** | Per-hop forward/reverse costs |
| **Bottleneck Detection** | Capacity analysis |

### 💰 Simulation Tools
| Feature | Description |
|---------|-------------|
| **What-If Planner** | Simulate cost changes |
| **Failure Simulator** | Link/node failure impact |
| **Blast Radius** | Affected paths analysis |
| **Traffic Flow** | ECMP visualization |

### 📈 Advanced Analysis
| Feature | Description |
|---------|-------------|
| **Capacity Planning** | Growth simulation |
| **Asymmetric Detection** | Cost asymmetry alerts |
| **SPOF Detection** | Single point of failure |
| **Country Matrix** | Geographic connectivity |

## 🌍 Running on Remote Server

```bash
# Start servers (binds to 0.0.0.0)
./ospf-tempo-x.sh start

# Access from any machine on the network:
# http://<server-ip>:9100
```

## 🔒 Network & IP Configuration

Configure in `.env`:

```bash
# Server Binding - Controls which interface the server listens on
# Options: 127.0.0.1 (localhost only), 0.0.0.0 (all interfaces), or specific IP
# Using 0.0.0.0 to allow external access - IP whitelist controls who can connect
SERVER_HOST=0.0.0.0

# IP Whitelist - Comma-separated list of allowed client IPs
# Use 0.0.0.0 to allow all IPs (not recommended for production)
# Examples: 127.0.0.1,192.168.1.0/24,10.0.0.5
# For now allowing all - change to specific IPs for production
ALLOWED_IPS=0.0.0.0
```

| Setting | Description |
|---------|-------------|
| `SERVER_HOST=0.0.0.0` | Listen on all network interfaces |
| `SERVER_HOST=127.0.0.1` | Listen only on localhost |
| `ALLOWED_IPS=0.0.0.0` | Allow connections from any IP |
| `ALLOWED_IPS=192.168.1.0/24` | Allow only local subnet |
| `ALLOWED_IPS=127.0.0.1,10.0.0.5` | Allow specific IPs |

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

# Server Binding
SERVER_HOST=0.0.0.0
ALLOWED_IPS=0.0.0.0

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ospf_tempo_x
DB_USER=your_username
DB_PASSWORD=your_password

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
```

## 🔒 API Endpoints

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
| GET | `/api/topologies/:id` | Get topology |
| POST | `/api/topologies` | Create topology |
| PUT | `/api/topologies/:id` | Update topology |
| DELETE | `/api/topologies/:id` | Delete topology |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |

## 📁 Project Structure

```
OSPF-TEMPO-X/
├── ospf-tempo-x.sh         # Master control script
├── .nvmrc                  # Node v20 version pinning (nvm)
├── .node-version           # Node v20 version pinning (fnm, volta)
├── scripts/                # Bash management scripts
│   ├── setup-nvm.sh        # Setup nvm + Node.js (isolated)
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

## 🏗️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript |
| Visualization | D3.js v7 |
| Build Tool | Vite 6 |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui |
| State Management | Zustand |
| Backend | Express.js |
| Database | PostgreSQL |
| Auth | JWT + bcrypt |
| Icons | Lucide React |

## 📋 Input File Format

Minimum required JSON structure:

```json
{
  "nodes": [
    {
      "id": "R1",
      "hostname": "router1.example.com",
      "country": "USA",
      "loopback_ip": "10.0.0.1"
    }
  ],
  "links": [
    {
      "source": "R1",
      "target": "R2",
      "cost": 10,
      "sourceInterface": "Gi0/0/1",
      "targetInterface": "Gi0/0/2"
    }
  ]
}
```

## 🚀 Running in Production

```bash
# Build for production
./ospf-tempo-x.sh build

# Or manually:
npm run build

# Preview production build
npm run preview

# Serve with any static server
npx serve dist
```

## 🔧 Troubleshooting

### Port already in use
```bash
./ospf-tempo-x.sh stop --force
# Or manually:
lsof -ti:9100 | xargs kill -9
lsof -ti:9101 | xargs kill -9
```

### npm install fails
```bash
./ospf-tempo-x.sh clean --force
./ospf-tempo-x.sh deps --force
```

### Check server status
```bash
./ospf-tempo-x.sh status
```

### View logs
```bash
./ospf-tempo-x.sh logs
```

### PostgreSQL connection issues
```bash
# Check if PostgreSQL is running
pg_isready

# Start PostgreSQL
# macOS:
brew services start postgresql@15
# Linux:
sudo systemctl start postgresql
```

### App shows blank screen
- Check browser console for errors
- Ensure you've uploaded a valid JSON topology file
- Verify `.env` exists and is configured
- Check API health: `curl http://localhost:9101/api/health`

### "API server is offline" error
```bash
# Check if API is running
curl http://localhost:9101/api/health

# If not, restart servers
./ospf-tempo-x.sh restart
```

### Node.js version issues
```bash
# Check current version
node -v

# Switch to project version using nvm
nvm use

# Or install correct version
nvm install 20
nvm use 20
```

## 🧪 Testing

```bash
# Run health checks
./ospf-tempo-x.sh test

# Manual API test
curl http://localhost:9101/api/health

# Test login
curl -X POST http://localhost:9101/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "netviz_admin", "password": "V3ry$trongAdm1n!2025"}'
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
