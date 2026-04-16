@echo off
REM Motorcycle Intercom - Development Script for Windows
REM Runs both frontend and backend servers in parallel

echo.
echo 🏍️  Starting Motorcycle Intercom Development Servers...
echo.

REM Check if backend directory exists
if not exist "backend" (
    echo ❌ Error: backend directory not found
    exit /b 1
)

REM Check if node_modules exists in backend
if not exist "backend\node_modules" (
    echo 📦 Installing backend dependencies...
    cd backend
    call yarn install
    cd ..
)

REM Check if node_modules exists in frontend
if not exist "node_modules" (
    echo 📦 Installing frontend dependencies...
    call yarn install
)

echo.
echo 🚀 Starting Backend Server (Port 3001)...
cd backend
start "Motorcycle Intercom Backend" cmd /k yarn dev
cd ..

REM Wait a moment for backend to start
timeout /t 2 /nobreak >nul

echo 🚀 Starting Frontend Server (Port 3000)...
start "Motorcycle Intercom Frontend" cmd /k yarn dev

echo.
echo ✅ Both servers are running!
echo    Frontend: http://localhost:3000
echo    Backend:  http://localhost:3001
echo.
echo Close the terminal windows to stop the servers
echo.
