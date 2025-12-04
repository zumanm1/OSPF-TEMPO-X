#!/bin/bash

# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║                         OSPF-TEMPO-X Controller                           ║
# ║              Network Analysis & Cost Planning Tool                        ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

APP_NAME="OSPF-TEMPO-X"
FRONTEND_PORT="${VITE_PORT:-9100}"
API_PORT="${API_PORT:-9101}"

# Banner
show_banner() {
    echo -e "${CYAN}"
    echo "╔═══════════════════════════════════════════════════════════════════════════╗"
    echo "║                         OSPF-TEMPO-X Controller                           ║"
    echo "║              Network Analysis & Cost Planning Tool                        ║"
    echo "╚═══════════════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Help
show_help() {
    show_banner
    echo -e "${GREEN}Usage:${NC} ./ospf-tempo-x.sh <command> [options]"
    echo ""
    echo -e "${YELLOW}Commands:${NC}"
    echo "  install     Install system requirements (Node.js, npm, PostgreSQL)"
    echo "  deps        Install project dependencies (frontend + backend)"
    echo "  db-setup    Setup PostgreSQL database and initialize schema"
    echo "  start       Start frontend (${FRONTEND_PORT}) and API (${API_PORT}) servers"
    echo "  stop        Stop all running servers"
    echo "  restart     Restart all servers"
    echo "  status      Show system and server status"
    echo "  logs        View server logs"
    echo "  clean       Clean build artifacts and node_modules"
    echo "  build       Build for production"
    echo "  test        Run tests"
    echo "  help        Show this help message"
    echo ""
    echo -e "${YELLOW}Options:${NC}"
    echo "  -p, --port PORT    Custom frontend port (default: ${FRONTEND_PORT})"
    echo "  -f, --force        Force operation without confirmation"
    echo "  -v, --verbose      Verbose output"
    echo ""
    echo -e "${YELLOW}Examples:${NC}"
    echo "  ./ospf-tempo-x.sh install && ./ospf-tempo-x.sh deps && ./ospf-tempo-x.sh start"
    echo "  ./ospf-tempo-x.sh start -p 3000"
    echo "  ./ospf-tempo-x.sh stop --force"
    echo "  VITE_PORT=8080 ./ospf-tempo-x.sh start"
    echo ""
    echo -e "${YELLOW}Individual Scripts:${NC}"
    echo "  ./scripts/install.sh    Install requirements only"
    echo "  ./scripts/deps.sh       Install dependencies only"
    echo "  ./scripts/db-setup.sh   Setup database only"
    echo "  ./scripts/start.sh      Start servers"
    echo "  ./scripts/stop.sh       Stop servers"
    echo "  ./scripts/status.sh     Check status"
    echo ""
}

# Check if command exists
command_exists() {
    command -v "$1" &> /dev/null
}

# Install system requirements
cmd_install() {
    show_banner
    echo -e "${BLUE}[INSTALL]${NC} Installing system requirements..."
    
    if [ -f "./scripts/install.sh" ]; then
        ./scripts/install.sh
    else
        echo -e "${RED}[ERROR]${NC} scripts/install.sh not found"
        exit 1
    fi
}

# Install dependencies
cmd_deps() {
    show_banner
    echo -e "${BLUE}[DEPS]${NC} Installing project dependencies..."
    
    if [ -f "./scripts/deps.sh" ]; then
        ./scripts/deps.sh "$@"
    else
        # Fallback if deps.sh doesn't exist
        echo -e "${BLUE}[STEP 1/2]${NC} Installing frontend dependencies..."
        npm install
        echo -e "${GREEN}[SUCCESS]${NC} Frontend dependencies installed"
        
        if [ -d "server" ]; then
            echo -e "${BLUE}[STEP 2/2]${NC} Backend uses same node_modules"
            echo -e "${GREEN}[SUCCESS]${NC} All dependencies installed"
        fi
    fi
}

# Setup database
cmd_db_setup() {
    show_banner
    echo -e "${BLUE}[DB-SETUP]${NC} Setting up PostgreSQL database..."
    
    if [ -f "./scripts/db-setup.sh" ]; then
        ./scripts/db-setup.sh "$@"
    else
        echo -e "${RED}[ERROR]${NC} scripts/db-setup.sh not found"
        exit 1
    fi
}

# Start servers
cmd_start() {
    show_banner
    echo -e "${BLUE}[START]${NC} Starting servers..."
    
    if [ -f "./scripts/start.sh" ]; then
        ./scripts/start.sh "$@"
    else
        echo -e "${RED}[ERROR]${NC} scripts/start.sh not found"
        exit 1
    fi
}

# Stop servers
cmd_stop() {
    show_banner
    echo -e "${BLUE}[STOP]${NC} Stopping servers..."
    
    if [ -f "./scripts/stop.sh" ]; then
        ./scripts/stop.sh "$@"
    else
        echo -e "${RED}[ERROR]${NC} scripts/stop.sh not found"
        exit 1
    fi
}

# Restart servers
cmd_restart() {
    show_banner
    echo -e "${BLUE}[RESTART]${NC} Restarting servers..."
    
    if [ -f "./scripts/restart.sh" ]; then
        ./scripts/restart.sh "$@"
    else
        cmd_stop "$@"
        sleep 2
        cmd_start "$@"
    fi
}

# Show status
cmd_status() {
    show_banner
    
    if [ -f "./scripts/status.sh" ]; then
        ./scripts/status.sh
    else
        echo -e "${RED}[ERROR]${NC} scripts/status.sh not found"
        exit 1
    fi
}

# View logs
cmd_logs() {
    show_banner
    echo -e "${BLUE}[LOGS]${NC} Viewing server logs..."
    
    LOG_DIR=".logs"
    if [ -d "$LOG_DIR" ]; then
        echo -e "${YELLOW}Press Ctrl+C to exit${NC}"
        echo ""
        tail -f "$LOG_DIR"/*.log 2>/dev/null || echo -e "${YELLOW}No log files found${NC}"
    else
        echo -e "${YELLOW}No logs directory found. Start the servers first.${NC}"
    fi
}

# Clean
cmd_clean() {
    show_banner
    echo -e "${BLUE}[CLEAN]${NC} Cleaning build artifacts..."
    
    FORCE=false
    for arg in "$@"; do
        case $arg in
            -f|--force) FORCE=true ;;
        esac
    done
    
    if [ "$FORCE" != true ]; then
        echo -e "${YELLOW}This will remove:${NC}"
        echo "  - node_modules/"
        echo "  - dist/"
        echo "  - .logs/"
        echo ""
        read -p "Are you sure? (y/N) " confirm
        if [[ ! $confirm =~ ^[Yy]$ ]]; then
            echo -e "${YELLOW}Cancelled${NC}"
            exit 0
        fi
    fi
    
    echo -e "${BLUE}[STEP 1/3]${NC} Removing node_modules..."
    rm -rf node_modules
    
    echo -e "${BLUE}[STEP 2/3]${NC} Removing dist..."
    rm -rf dist
    
    echo -e "${BLUE}[STEP 3/3]${NC} Removing logs..."
    rm -rf .logs
    
    echo -e "${GREEN}[SUCCESS]${NC} Clean complete"
}

# Build
cmd_build() {
    show_banner
    echo -e "${BLUE}[BUILD]${NC} Building for production..."
    
    echo -e "${BLUE}[STEP 1/2]${NC} Building frontend..."
    npm run build
    
    echo -e "${BLUE}[STEP 2/2]${NC} Build complete"
    echo -e "${GREEN}[SUCCESS]${NC} Production build ready in dist/"
}

# Test
cmd_test() {
    show_banner
    echo -e "${BLUE}[TEST]${NC} Running tests..."
    
    # Check if API is responding
    echo -e "${BLUE}[STEP 1/3]${NC} Testing API health..."
    if curl -s "http://localhost:${API_PORT}/api/health" > /dev/null 2>&1; then
        HEALTH=$(curl -s "http://localhost:${API_PORT}/api/health")
        echo -e "${GREEN}[PASS]${NC} API Health: $HEALTH"
    else
        echo -e "${RED}[FAIL]${NC} API is not responding"
    fi
    
    # Check if frontend is responding
    echo -e "${BLUE}[STEP 2/3]${NC} Testing frontend..."
    if curl -s "http://localhost:${FRONTEND_PORT}" > /dev/null 2>&1; then
        echo -e "${GREEN}[PASS]${NC} Frontend is responding"
    else
        echo -e "${RED}[FAIL]${NC} Frontend is not responding"
    fi
    
    # Check database
    echo -e "${BLUE}[STEP 3/3]${NC} Testing database connection..."
    if [ -f ".env" ]; then
        source .env 2>/dev/null || true
    fi
    DB_HOST="${DB_HOST:-localhost}"
    DB_PORT="${DB_PORT:-5432}"
    
    if command_exists pg_isready; then
        if pg_isready -h "$DB_HOST" -p "$DB_PORT" -q 2>/dev/null; then
            echo -e "${GREEN}[PASS]${NC} PostgreSQL is running"
        else
            echo -e "${RED}[FAIL]${NC} PostgreSQL is not running"
        fi
    else
        echo -e "${YELLOW}[SKIP]${NC} pg_isready not found"
    fi
    
    echo ""
    echo -e "${GREEN}[SUCCESS]${NC} Tests complete"
}

# Main
main() {
    COMMAND=${1:-help}
    shift 2>/dev/null || true
    
    case "$COMMAND" in
        install)    cmd_install "$@" ;;
        deps)       cmd_deps "$@" ;;
        db-setup)   cmd_db_setup "$@" ;;
        start)      cmd_start "$@" ;;
        stop)       cmd_stop "$@" ;;
        restart)    cmd_restart "$@" ;;
        status)     cmd_status "$@" ;;
        logs)       cmd_logs "$@" ;;
        clean)      cmd_clean "$@" ;;
        build)      cmd_build "$@" ;;
        test)       cmd_test "$@" ;;
        help|--help|-h)  show_help ;;
        *)
            echo -e "${RED}[ERROR]${NC} Unknown command: $COMMAND"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

main "$@"

