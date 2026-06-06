@echo off
echo ==========================================
echo    Updating Supermarket Project
echo ==========================================
echo.

echo [1/2] Building Frontend (Vue)...
cd frontend
call npm run build
cd ..
echo.

echo [2/2] Building Backend (Node.js)...
cd backend
call npm run build
cd ..
echo.


echo ==========================================
echo Update Complete! Please refresh your browser.
echo ==========================================
pause
