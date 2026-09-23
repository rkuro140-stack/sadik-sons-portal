#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "=========================================================="
echo "  ⚡ SADIK SONS INDUSTRIAL & MEP — DESKTOP SYSTEM"
echo "=========================================================="

if ! command -v node &> /dev/null
then
    echo "[ERROR] Node.js is not installed!"
    echo "Please install Node.js from https://nodejs.org/"
    open https://nodejs.org/
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install --no-audit --no-fund
fi

echo "Starting local server..."
node server.cjs &
SERVER_PID=$!

sleep 2
open "http://localhost:3000"

wait $SERVER_PID
