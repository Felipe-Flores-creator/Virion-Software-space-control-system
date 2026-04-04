@echo off
setlocal
echo ===================================================
echo   VIRION SIG PRO - LANZADOR INTEGRADO
echo ===================================================
echo.

:: Detectar ruta
set "ROOT_DIR=%~dp0"
cd /d "%ROOT_DIR%"

:: Lanzar Backend en ventana separada
echo [1/2] Lanzando Backend Python (Puerto 8000)...
start "Backend SIG Pro" cmd /c "start_backend.bat"

:: Lanzar Frontend con Vite
echo [2/2] Lanzando Frontend con Vite...
echo (Instalando dependencias si faltan...)
call npm install --quiet

echo.
echo ===================================================
echo   SISTEMA ACTIVO
echo.
echo   1. Espera a que la ventana del Backend cargue.
echo   2. Usa la URL que aparezca abajo (ej: http://localhost:5173)
echo.
echo   Presiona Ctrl+C para detener todo.
echo ===================================================
echo.

npm run dev

pause
