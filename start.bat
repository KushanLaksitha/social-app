@echo off
echo ✦ Starting Vibe Social App...
echo.

echo 📦 Installing backend dependencies...
cd backend
call npm install --silent
cd ..

echo 📦 Installing frontend dependencies...
cd frontend
call npm install --silent
cd ..

echo.
echo 🚀 Starting servers...
echo.

start "Vibe Backend" cmd /k "cd backend && npm start"
timeout /t 3 /nobreak >nul
start "Vibe Frontend" cmd /k "cd frontend && npm start"

echo.
echo ✅ Vibe is running!
echo    Backend:  http://localhost:5000
echo    Frontend: http://localhost:3000
echo.
echo Two windows have been opened for backend and frontend.
pause
