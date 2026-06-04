@echo off
echo ==========================================
echo    Starting Supermarket System (PM2)
echo ==========================================
echo.
echo Starting Node.js Cluster and Caddy via PM2...
cd /d "%~dp0"
call pm2 start ecosystem.config.cjs

echo.
echo ==========================================
echo All services are running in the background!
echo Public URL: https://amxsvip.site
echo.
echo Note:
echo 1. You can safely close this window now.
echo 2. To check status, run: pm2 status
echo 3. To stop services, run: pm2 stop all
echo ==========================================
echo Press any key to open real-time monitoring dashboard (pm2 monit)...
pause >nul
call pm2 monit
