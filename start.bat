@echo off
chcp 65001 >nul
echo ==========================================
echo        启动洛阳大张助手 (Supermarket)
echo ==========================================
echo.
echo 正在启动后端服务 (Hono API)...
start "Supermarket Backend" cmd /k "cd backend && npm run dev"

echo 正在启动前端服务 (Vue + Vite)...
start "Supermarket Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo 前后端服务均已在新窗口中启动运行！
echo - 前端地址通常为: http://localhost:5173
echo - 后端地址通常为: http://localhost:3000
echo.
echo (你可以随时关闭当前这个黑窗口，不会影响已启动的服务)
pause
