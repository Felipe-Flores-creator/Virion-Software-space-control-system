@echo off
echo ==========================================
echo     Instalador de SIG Pro - Electron
echo ==========================================
echo.

:: Verificar si Node.js está instalado
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js no está instalado o no está en el PATH.
    echo Por favor, descargue e instale Node.js desde:
    echo https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: Verificar si Python está instalado
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python no está instalado o no está en el PATH.
    echo Por favor, descargue e instale Python desde:
    echo https://www.python.org/downloads/
    echo.
    pause
    exit /b 1
)

echo ✓ Node.js encontrado
echo ✓ Python encontrado
echo.

:: Navegar a la carpeta electron-app
cd /d "%~dp0electron-app"

echo Instalando dependencias de Electron...
npm install
if %errorlevel% neq 0 (
    echo ERROR: No se pudieron instalar las dependencias de Electron.
    echo Por favor, verifica tu conexión a internet y vuelve a intentar.
    echo.
    pause
    exit /b 1
)

echo ✓ Dependencias de Electron instaladas
echo.

:: Verificar si existe el entorno virtual Python
if not exist "..\sig_env" (
    echo Creando entorno virtual Python...
    python -m venv ..\sig_env
    if %errorlevel% neq 0 (
        echo ERROR: No se pudo crear el entorno virtual Python.
        echo.
        pause
        exit /b 1
    )
    echo ✓ Entorno virtual creado
)

:: Activar entorno virtual y instalar dependencias Python
echo Instalando dependencias Python...
call ..\sig_env\Scripts\activate.bat
pip install -r ..\requirements.txt
if %errorlevel% neq 0 (
    echo ERROR: No se pudieron instalar las dependencias Python.
    echo.
    pause
    exit /b 1
)
echo ✓ Dependencias Python instaladas
echo.

:: Crear carpeta de iconos si no existe
if not exist "assets" (
    mkdir assets
    echo ✓ Carpeta de assets creada
)

echo.
echo ==========================================
echo     Instalación completada exitosamente!
echo ==========================================
echo.
echo Para iniciar SIG Pro, ejecuta:
echo   npm start
echo.
echo Para construir el instalador, ejecuta:
echo   npm run build:win
echo.
echo Presiona cualquier tecla para abrir la carpeta de instalación...
pause >nul
explorer "%~dp0electron-app"