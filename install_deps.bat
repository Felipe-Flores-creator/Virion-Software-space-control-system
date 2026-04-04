@echo off
echo ========================================
echo   Instalando dependencias Python
echo ========================================
echo.

cd /d "%~dp0sig-pro\python_api"

REM Usar el pip del entorno virtual directamente
"..\\sig_env\Scripts\pip.exe" install requests fastapi uvicorn python-multipart

echo.
echo ========================================
echo   Dependencias instaladas
echo ========================================
pause
