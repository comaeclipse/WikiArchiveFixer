#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}FixArchive — Local App Launcher${NC}"
echo ""

# 1. Python environment
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}Creating Python virtual environment...${NC}"
    python3 -m venv venv
    source venv/bin/activate
    echo -e "${YELLOW}Installing Python dependencies...${NC}"
    pip install -q -r requirements.txt
else
    source venv/bin/activate
    echo -e "Checking Python dependencies..."
    if ! pip install -q --dry-run -r requirements.txt 2>/dev/null | grep -q "Would install"; then
        echo -e "  All up to date."
    else
        echo -e "${YELLOW}Updating Python dependencies...${NC}"
        pip install -q -r requirements.txt
    fi
fi

# 2. Frontend
if [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    (cd frontend && npm install)
else
    echo -e "Checking frontend dependencies..."
    echo -e "  All up to date."
fi

if [ ! -d "frontend/dist" ] || [ "$(find frontend/src -newer frontend/dist -print -quit 2>/dev/null)" ]; then
    echo -e "${YELLOW}Building frontend...${NC}"
    (cd frontend && npm run build)
else
    echo -e "Frontend build is current."
fi

# 3. Start server
echo ""
echo -e "${GREEN}Starting server at http://localhost:8000${NC}"
echo -e "Press Ctrl+C to stop."
echo ""
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
