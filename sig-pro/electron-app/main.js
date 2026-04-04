const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const fetch = require('node-fetch');

// Variable para almacenar el proceso Python
let pythonProcess = null;
let mainWindow = null;

// Ruta al servidor Python
const pythonServerPath = path.join(__dirname, '..', 'python_api', 'app.py');

// Función para iniciar el servidor Python
function startPythonServer() {
    return new Promise((resolve, reject) => {
        console.log('Iniciando servidor Python...');

        // Verificar si el archivo Python existe
        if (!fs.existsSync(pythonServerPath)) {
            console.error('No se encontró el archivo Python:', pythonServerPath);
            reject(new Error('Archivo Python no encontrado'));
            return;
        }

        // Iniciar el proceso Python
        pythonProcess = spawn('python', [pythonServerPath], {
            cwd: path.join(__dirname, '..'),
            stdio: ['pipe', 'pipe', 'pipe']
        });

        // Manejar salida del proceso Python
        pythonProcess.stdout.on('data', (data) => {
            console.log('Python output:', data.toString());
        });

        pythonProcess.stderr.on('data', (data) => {
            console.error('Python error:', data.toString());
        });

        pythonProcess.on('close', (code) => {
            console.log('Proceso Python terminado con código:', code);
            pythonProcess = null;
        });

        // Esperar a que el servidor Python esté listo
        let attempts = 0;
        const maxAttempts = 30; // 30 segundos máximo

        const checkServer = setInterval(() => {
            attempts++;
            fetch('http://127.0.0.1:8000/api/health/')
                .then(response => {
                    if (response.ok) {
                        clearInterval(checkServer);
                        console.log('Servidor Python listo');
                        resolve();
                    }
                })
                .catch(err => {
                    if (attempts >= maxAttempts) {
                        clearInterval(checkServer);
                        console.error('No se pudo conectar al servidor Python');
                        reject(new Error('Servidor Python no disponible'));
                    }
                });
        }, 1000);
    });
}

// Función para detener el servidor Python
function stopPythonServer() {
    return new Promise((resolve) => {
        if (pythonProcess) {
            console.log('Deteniendo servidor Python...');
            pythonProcess.kill('SIGTERM');

            // Esperar un poco antes de forzar la terminación
            setTimeout(() => {
                if (pythonProcess) {
                    pythonProcess.kill('SIGKILL');
                }
                pythonProcess = null;
                resolve();
            }, 1000);
        } else {
            resolve();
        }
    });
}

// Función para crear la ventana principal
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        icon: path.join(__dirname, 'assets', 'icon.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    // Cargar la interfaz web
    const indexPath = path.join(__dirname, '..', 'index.html');
    mainWindow.loadFile(indexPath);

    // Abrir DevTools en modo desarrollo
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }

    // Manejar el cierre de la ventana
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Manejar el cierre de la aplicación
    mainWindow.on('close', async (event) => {
        if (mainWindow) {
            event.preventDefault();
            await stopPythonServer();
            mainWindow.destroy();
        }
    });
}

// Crear menú de la aplicación
function createMenu() {
    const template = [
        {
            label: 'Archivo',
            submenu: [
                {
                    label: 'Nuevo Proyecto',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'new-project');
                    }
                },
                {
                    label: 'Abrir Proyecto',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'open-project');
                    }
                },
                {
                    label: 'Guardar Proyecto',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'save-project');
                    }
                },
                { type: 'separator' },
                {
                    label: 'Salir',
                    accelerator: 'CmdOrCtrl+Q',
                    click: async () => {
                        await stopPythonServer();
                        app.quit();
                    }
                }
            ]
        },
        {
            label: 'Editar',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                { role: 'delete' },
                { role: 'selectall' }
            ]
        },
        {
            label: 'Herramientas',
            submenu: [
                {
                    label: 'Dibujar Polígono',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'draw-polygon');
                    }
                },
                {
                    label: 'Añadir Marcador',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'add-marker');
                    }
                },
                {
                    label: 'Medir Distancia',
                    click: () => {
                        mainWindow.webContents.send('menu-action', 'measure-distance');
                    }
                }
            ]
        },
        {
            label: 'Ver',
            submenu: [
                { role: 'reload' },
                { role: 'forcereload' },
                { role: 'toggledevtools' },
                { type: 'separator' },
                { role: 'resetzoom' },
                { role: 'zoomin' },
                { role: 'zoomout' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },
        {
            label: 'Ventana',
            submenu: [
                { role: 'minimize' },
                { role: 'zoom' },
                { type: 'separator' },
                { role: 'front' }
            ]
        },
        {
            label: 'Ayuda',
            submenu: [
                {
                    label: 'Documentación',
                    click: () => {
                        require('electron').shell.openExternal('https://github.com/Felipe-Flores-creator/SIG-Pro');
                    }
                },
                {
                    label: 'Acerca de Virion',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'Virion',
                            message: 'Sistema de Información Geográfica Profesional',
                            detail: 'Versión 1.0.0\nDesarrollado por Felipe Flores\n\nHerramientas avanzadas de análisis geoespacial, visualización 3D y gestión de proyectos GIS.',
                            buttons: ['Aceptar']
                        });
                    }
                }
            ]
        }
    ];

    // En macOS, el primer elemento del menú debe ser el nombre de la app
    if (process.platform === 'darwin') {
        template.unshift({
            label: app.getName(),
            submenu: [
                { role: 'about' },
                { type: 'separator' },
                { role: 'services' },
                { type: 'separator' },
                { role: 'hide' },
                { role: 'hideothers' },
                { role: 'unhide' },
                { type: 'separator' },
                { role: 'quit' }
            ]
        });
    }

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// Manejadores de IPC
ipcMain.handle('python-server-status', async () => {
    try {
        const response = await fetch('http://127.0.0.1:8000/api/health/');
        return response.ok;
    } catch {
        return false;
    }
});

ipcMain.handle('restart-python-server', async () => {
    await stopPythonServer();
    await startPythonServer();
    return true;
});

// Evento cuando Electron está listo
app.whenReady().then(async () => {
    try {
        // Iniciar el servidor Python
        await startPythonServer();

        // Crear la ventana principal
        createWindow();

        // Crear el menú
        createMenu();

        // En macOS, activar la ventana cuando se hace clic en el ícono del dock
        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) createWindow();
        });

    } catch (error) {
        console.error('Error al iniciar la aplicación:', error);
        dialog.showErrorBox('Error de Inicio', 'No se pudo iniciar el servidor Python. Por favor, verifique que Python esté instalado y las dependencias estén correctamente configuradas.');
        app.quit();
    }
});

// Evento cuando todas las ventanas están cerradas
app.on('window-all-closed', async () => {
    if (process.platform !== 'darwin') {
        await stopPythonServer();
        app.quit();
    }
});

// Manejar errores no capturados
process.on('uncaughtException', async (error) => {
    console.error('Error no capturado:', error);
    if (pythonProcess) {
        await stopPythonServer();
    }
    app.quit();
});