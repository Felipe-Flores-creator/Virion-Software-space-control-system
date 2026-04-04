@echo off
setlocal
echo ========================================
echo   SIG Pro - Backend API Incendios
echo ========================================
echo.

:: Detectar ruta del script
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%python_api"

echo [1/3] Verificando instalacion de Python...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ERROR CRITICO: Python no esta instalado o no esta en el PATH.
    echo Por favor instala Python de https://www.python.org/
    pause
    exit /b
)

echo [2/3] Instalando/Verificando librerias necesarias...
:: Instalacion explicita para evitar fallos de requirements
python -m pip install fastapi uvicorn requests geopandas pandas shapely pydantic --quiet
if %errorlevel% neq 0 (
    echo.
    echo ADVERTENCIA: Hubo un problema instalando algunas librerias.
    echo Intentando continuar...
)

echo [3/3] Iniciando servidor en http://127.0.0.1:8000
echo.
echo Para detener: Presiona Ctrl+C o cierra esta ventana.
echo.

:: Lanzar servidor usando uvicorn modulo para mayor compatibilidad
python -m uvicorn app:app --host 127.0.0.1 --port 8000 --reload

if %errorlevel% neq 0 (
    echo.
    echo ERROR: El servidor se detuvo inesperadamente.
    pause
)

endlocal
