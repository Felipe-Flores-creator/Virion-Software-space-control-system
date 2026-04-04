@echo off
:: ============================================================
:: Lanzador SIG Pro - Resuelve CORS para protocolo file://
:: Abre Chrome con acceso a archivos locales habilitado
:: ============================================================

set "HTML_PATH=%~dp0index.html"
set "USER_DATA=%TEMP%\SIGPro_ChromeProfile"

:: Intentar Chrome primero
set "CHROME_PATH="
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    set "CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe"
)
if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    set "CHROME_PATH=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
)

if not defined CHROME_PATH (
    echo Chrome no encontrado. Intentando Edge...
    if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
        start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --allow-file-access-from-files --disable-web-security --user-data-dir="%USER_DATA%" "%HTML_PATH%"
        echo SIG Pro abierto en Microsoft Edge con CORS deshabilitado.
        goto :eof
    )
    echo ERROR: No se encontro Chrome ni Edge.
    pause
    goto :eof
)

:: Lanzar Chrome con CORS deshabilitado para file://
start "" "%CHROME_PATH%" ^
    --allow-file-access-from-files ^
    --disable-web-security ^
    --user-data-dir="%USER_DATA%" ^
    "%HTML_PATH%"

echo ============================================
echo  SIG Pro abierto con CORS deshabilitado
echo  Perfil temporal: %USER_DATA%
echo ============================================
