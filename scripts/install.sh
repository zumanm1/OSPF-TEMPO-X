#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# Define colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          OSPF-TEMPO-X Installation Script                     ║${NC}"
echo -e "${BLUE}║          NetViz OSPF Network Analyzer                         ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

# Function to check if a command exists
command_exists () {
  type "$1" &> /dev/null ;
}

# Function to check if PostgreSQL is running
pg_is_running() {
  if command_exists pg_isready; then
    pg_isready -q 2>/dev/null
    return $?
  fi
  return 1
}

# 1. Check for Node.js and npm
echo -e "${BLUE}[STEP 1/5]${NC} Checking for Node.js and npm..."
if ! command_exists node; then
  echo -e "${RED}[ERROR]${NC} Node.js not found."
  echo -e "${YELLOW}Please install Node.js (v18 or later) from https://nodejs.org/${NC}"
  echo -e "${YELLOW}Or use nvm: curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash${NC}"
  exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo -e "${RED}[ERROR]${NC} Node.js version 18 or later required. Current: $(node -v)"
  exit 1
fi
echo -e "${GREEN}[SUCCESS]${NC} Node.js $(node -v) found"

if ! command_exists npm; then
  echo -e "${RED}[ERROR]${NC} npm not found. Please reinstall Node.js"
  exit 1
fi
echo -e "${GREEN}[SUCCESS]${NC} npm $(npm -v) found"

# 2. Check for PostgreSQL
echo -e ""
echo -e "${BLUE}[STEP 2/5]${NC} Checking for PostgreSQL..."
if ! command_exists psql; then
  echo -e "${RED}[ERROR]${NC} PostgreSQL client (psql) not found."
  echo -e ""
  echo -e "${YELLOW}Please install PostgreSQL:${NC}"
  echo -e "  macOS:   brew install postgresql@15"
  echo -e "  Ubuntu:  sudo apt install postgresql postgresql-contrib"
  echo -e "  Fedora:  sudo dnf install postgresql-server postgresql"
  echo -e ""
  exit 1
fi
echo -e "${GREEN}[SUCCESS]${NC} PostgreSQL client found: $(psql --version | head -1)"

# 3. Check if PostgreSQL is running
echo -e ""
echo -e "${BLUE}[STEP 3/5]${NC} Checking if PostgreSQL server is running..."
if ! pg_is_running; then
  echo -e "${YELLOW}[WARNING]${NC} PostgreSQL server does not appear to be running."
  echo -e ""
  echo -e "${YELLOW}To start PostgreSQL:${NC}"
  echo -e "  macOS (Homebrew):  brew services start postgresql@15"
  echo -e "  Linux (systemd):   sudo systemctl start postgresql"
  echo -e ""
  read -p "Do you want to continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
else
  echo -e "${GREEN}[SUCCESS]${NC} PostgreSQL server is running"
fi

# 4. Install Node.js dependencies
echo -e ""
echo -e "${BLUE}[STEP 4/5]${NC} Installing Node.js dependencies..."
if [ -d "node_modules" ] && [ -f "package-lock.json" ]; then
  echo -e "${YELLOW}[INFO]${NC} node_modules exists. Running npm ci for clean install..."
  npm ci --silent
else
  echo -e "${YELLOW}[INFO]${NC} Installing dependencies..."
  npm install --silent
fi
echo -e "${GREEN}[SUCCESS]${NC} Node.js dependencies installed"

# 5. Setup database
echo -e ""
echo -e "${BLUE}[STEP 5/5]${NC} Setting up database..."

# Load environment variables
if [ -f ".env" ]; then
  source .env
fi

DB_NAME="${DB_NAME:-ospf_tempo_x}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

echo -e "${YELLOW}[INFO]${NC} Database configuration:"
echo -e "         Host: ${DB_HOST}:${DB_PORT}"
echo -e "         Name: ${DB_NAME}"
echo -e "         User: ${DB_USER}"
echo ""

# Check if database exists
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
  echo -e "${GREEN}[SUCCESS]${NC} Database '$DB_NAME' already exists"
else
  echo -e "${YELLOW}[INFO]${NC} Creating database '$DB_NAME'..."
  if createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" 2>/dev/null; then
    echo -e "${GREEN}[SUCCESS]${NC} Database created"
  else
    echo -e "${RED}[ERROR]${NC} Failed to create database. You may need to:"
    echo -e "  1. Ensure PostgreSQL is running"
    echo -e "  2. Create the database manually: createdb $DB_NAME"
    echo -e "  3. Update .env file with correct credentials"
    exit 1
  fi
fi

# Run schema migration
echo -e "${YELLOW}[INFO]${NC} Running database schema migration..."
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f server/db/schema.sql > /dev/null 2>&1; then
  echo -e "${GREEN}[SUCCESS]${NC} Database schema initialized"
else
  echo -e "${YELLOW}[WARNING]${NC} Schema migration had issues (tables may already exist)"
fi

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          Installation Complete!                               ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo -e "  1. Review/update the .env file with your settings"
echo -e "  2. Start the application: ${GREEN}./scripts/start.sh${NC}"
echo ""
echo -e "${BLUE}Default admin credentials:${NC}"
echo -e "  Username: ${GREEN}netviz_admin${NC}"
echo -e "  Password: ${GREEN}V3ry\$trongAdm1n!2025${NC}"
echo ""
