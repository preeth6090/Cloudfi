#!/bin/bash
set -e

echo "=== CloudFi Industrial IoT Platform ==="
echo ""

# Database settings come from Vercel (Neon). Pull them once with: vercel env pull
if [ ! -f .env.local ]; then
  echo "⚠ No .env.local found. Run 'vercel link' and 'vercel env pull' first, or set DATABASE_URL in backend/.env"
fi

# Backend
echo ""
echo "Starting backend on :5001..."
cd backend
if [ ! -f .env ]; then cp .env.example .env; echo "Created backend/.env — set JWT_SECRET"; fi
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
echo "✓ Backend  → http://localhost:5001"
echo "✓ Frontend → http://localhost:5173"
echo ""

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
