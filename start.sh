#!/bin/bash

echo "✦ Starting Vibe Social App..."
echo ""

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend && npm install --silent
cd ..

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend && npm install --silent
cd ..

echo ""
echo "🚀 Starting servers..."
echo ""

# Start backend
cd backend && npm start &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 2

# Start frontend
cd ../frontend && npm start &
FRONTEND_PID=$!

echo ""
echo "✅ Vibe is running!"
echo "   Backend:  http://localhost:5000"
echo "   Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both servers."

# Wait and handle Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
