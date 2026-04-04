@echo off
echo ========================================
echo   SIG Pro - Backend API Incendios
echo ========================================
echo.
echo Iniciando servidor en http://localhost:8000
echo.
echo Documentacion: http://localhost:8000/docs
echo.
echo Para detener: Presiona Ctrl+C
echo ========================================
echo.

cd /d "%~dp0sig-pro\python_api"

REM Usar el python del entorno virtual
"..\sig_env\Scripts\python.exe" app.py

pause
