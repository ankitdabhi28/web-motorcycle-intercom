#!/bin/bash

# Motorcycle Intercom - Development Script
# Runs both frontend and backend servers in parallel

echo "🏍️  Starting Motorcycle Intercom Development Servers..."
echo ""

# Function to cleanup processes on exit
cleanup() {
    echo ""
    echo "🛑 Stopping all servers..."
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
        echo "✓ Frontend stopped"
    fi
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
        echo "✓ Backend stopped"
    fi
    exit 0
}

# Set trap for cleanup on script exit
trap cleanup SIGINT SIGTERM

# Check if backend directory exists
if [ ! -d "backend" ]; then
    echo "❌ Error: backend directory not found"
    exit 1
fi

# Check if node_modules exists in backend
if [ ! -d "backend/node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    cd backend
    yarn install
    cd ..
fi

# Check if node_modules exists in frontend
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    yarn install
fi

echo ""
echo "🚀 Starting Backend Server (Port 3001)..."
cd backend
yarn dev &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 2

echo "🚀 Starting Frontend Server (Port 3000)..."
yarn dev &
FRONTEND_PID=$!

echo ""
echo "✅ Both servers are running!"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
