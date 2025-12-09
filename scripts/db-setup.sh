#!/bin/bash

# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║                    OSPF-TEMPO-X Database Setup                            ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

# Load environment variables
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Database configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-ospf_tempo_x}"
DB_USER="${DB_USER:-$(whoami)}"
DB_PASSWORD="${DB_PASSWORD:-}"

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          OSPF-TEMPO-X Database Setup                          ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check PostgreSQL
echo -e "${BLUE}[STEP 1/5]${NC} Checking PostgreSQL..."
if ! command -v psql &> /dev/null; then
    echo -e "${RED}[ERROR]${NC} PostgreSQL client (psql) not found."
    echo -e "${YELLOW}Install PostgreSQL:${NC}"
    echo "  macOS:  brew install postgresql@15"
    echo "  Ubuntu: sudo apt install postgresql postgresql-contrib"
    exit 1
fi

if command -v pg_isready &> /dev/null; then
    if pg_isready -h "$DB_HOST" -p "$DB_PORT" -q 2>/dev/null; then
        echo -e "${GREEN}[OK]${NC} PostgreSQL is running on ${DB_HOST}:${DB_PORT}"
    else
        echo -e "${RED}[ERROR]${NC} PostgreSQL is not running on ${DB_HOST}:${DB_PORT}"
        echo -e "${YELLOW}Start PostgreSQL:${NC}"
        echo "  macOS:  brew services start postgresql@15"
        echo "  Ubuntu: sudo systemctl start postgresql"
        exit 1
    fi
else
    echo -e "${YELLOW}[WARNING]${NC} pg_isready not found, skipping connection check"
fi

# Create database
echo -e ""
echo -e "${BLUE}[STEP 2/5]${NC} Creating database '${DB_NAME}'..."

if [ -n "$DB_PASSWORD" ]; then
    export PGPASSWORD="$DB_PASSWORD"
fi

# Check if database exists
DB_EXISTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -lqt 2>/dev/null | cut -d \| -f 1 | grep -w "$DB_NAME" || true)

if [ -n "$DB_EXISTS" ]; then
    echo -e "${YELLOW}[INFO]${NC} Database '${DB_NAME}' already exists"
else
    # Try to create database
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c "CREATE DATABASE ${DB_NAME};" 2>/dev/null; then
        echo -e "${GREEN}[SUCCESS]${NC} Database '${DB_NAME}' created"
    else
        # Try with sudo postgres user
        echo -e "${YELLOW}[INFO]${NC} Trying with postgres superuser..."
        if sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};" 2>/dev/null; then
            echo -e "${GREEN}[SUCCESS]${NC} Database '${DB_NAME}' created"
        else
            echo -e "${RED}[ERROR]${NC} Could not create database"
            echo -e "${YELLOW}Try manually:${NC}"
            echo "  sudo -u postgres createdb ${DB_NAME}"
            exit 1
        fi
    fi
fi

# Run schema
echo -e ""
echo -e "${BLUE}[STEP 3/5]${NC} Initializing database schema..."

SCHEMA_FILE="server/db/schema.sql"
if [ -f "$SCHEMA_FILE" ]; then
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$SCHEMA_FILE" > /dev/null 2>&1; then
        echo -e "${GREEN}[SUCCESS]${NC} Schema initialized"
    else
        echo -e "${YELLOW}[WARNING]${NC} Schema may already exist (this is OK)"
    fi
else
    echo -e "${YELLOW}[WARNING]${NC} Schema file not found: ${SCHEMA_FILE}"
fi

# Run init (seed data)
echo -e ""
echo -e "${BLUE}[STEP 4/5]${NC} Seeding initial data..."

INIT_FILE="server/db/init.sql"
if [ -f "$INIT_FILE" ]; then
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$INIT_FILE" > /dev/null 2>&1; then
        echo -e "${GREEN}[SUCCESS]${NC} Initial data seeded"
    else
        echo -e "${YELLOW}[WARNING]${NC} Data may already exist (this is OK)"
    fi
else
    echo -e "${YELLOW}[WARNING]${NC} Init file not found: ${INIT_FILE}"
fi

# Verify
echo -e ""
echo -e "${BLUE}[STEP 5/5]${NC} Verifying database setup..."

TABLE_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null || echo "0")
USER_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM users;" 2>/dev/null || echo "0")

echo -e "${GREEN}[OK]${NC} Tables: ${TABLE_COUNT}"
echo -e "${GREEN}[OK]${NC} Users: ${USER_COUNT}"

# Create .env if it doesn't exist
echo -e ""
if [ ! -f ".env" ]; then
    echo -e "${BLUE}[INFO]${NC} Creating .env file..."
    cat > .env << EOF
# OSPF-TEMPO-X Environment Configuration

# Application Ports
VITE_PORT=9100
API_PORT=9101

# Database Configuration
DB_HOST=${DB_HOST}
DB_PORT=${DB_PORT}
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}

# JWT Secret (CHANGE IN PRODUCTION!)
JWT_SECRET=ospf-tempo-x-jwt-secret-change-in-production-$(date +%s)
EOF
    echo -e "${GREEN}[SUCCESS]${NC} .env file created"
else
    echo -e "${YELLOW}[INFO]${NC} .env file already exists"
fi

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          Database Setup Complete!                             ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Database:${NC}    ${DB_NAME} @ ${DB_HOST}:${DB_PORT}"
echo -e "${BLUE}Tables:${NC}      ${TABLE_COUNT}"
echo -e "${BLUE}Users:${NC}       ${USER_COUNT}"
echo ""
echo -e "${BLUE}Default Login:${NC}"
echo -e "  Username: ${GREEN}netviz_admin${NC}"
echo -e "  Password: ${GREEN}V3ry\$trongAdm1n!2025${NC}"
echo ""
echo -e "${BLUE}Next step:${NC}   ./ospf-tempo-x.sh start"
echo ""





