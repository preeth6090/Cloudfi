#!/bin/bash
set -e

echo "=== CloudFi Industrial IoT Platform ==="
echo ""

# Start MongoDB + Redis via Docker if available
if command -v docker &>/dev/null; then
  echo "Starting MongoDB + Redis..."
  docker compose up -d
  sleep 2
else
  echo "⚠ Docker not found. Make sure MongoDB is running on port 27017"
fi

# Backend
echo ""
echo "Starting backend on :5000..."
cd backend
if [ ! -f .env ]; then cp .env.example .env; echo "Created backend/.env — add Google OAuth credentials"; fi
npm install --silent
node src/server.js &
BACKEND_PID=$!
cd ..

sleep 2

# Frontend
echo "Starting frontend on :5173..."
cd frontend
npm install --silent
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✓ Backend  → http://localhost:5000"
echo "✓ Frontend → http://localhost:5173"
echo ""
echo "Before Google login works, add to backend/.env:"
echo "  GOOGLE_CLIENT_ID=<your-id>"
echo "  GOOGLE_CLIENT_SECRET=<your-secret>"
echo ""
echo "Press Ctrl+C to stop all services"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; docker compose stop 2>/dev/null" EXIT
wait
