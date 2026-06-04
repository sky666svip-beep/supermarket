@echo off
echo ==========================================
echo    Stopping Supermarket System (PM2)
echo ==========================================
echo.
echo Stopping all background services (Node.js, Caddy, Tunnel)...
call pm2 stop all
echo.
echo If you want to completely remove them, you can run: pm2 delete all
echo.
echo ==========================================
echo All services have been stopped successfully!
echo ==========================================
pause
