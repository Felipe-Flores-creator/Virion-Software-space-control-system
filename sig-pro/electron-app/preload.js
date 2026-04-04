const { contextBridge, ipcRenderer } = require('electron');

// Exponer funciones seguras al renderer process
contextBridge.exposeInMainWorld('electronAPI', {
    // Comunicación con el proceso principal
    send: (channel, data) => {
        // Lista blanca de canales permitidos
        const validChannels = [
            'python-server-status',
            'restart-python-server',
            'menu-action'
        ];

        if (validChannels.includes(channel)) {
            ipcRenderer.send(channel, data);
        }
    },

    invoke: async (channel, data) => {
        // Lista blanca de canales permitidos
        const validChannels = [
            'python-server-status',
            'restart-python-server'
        ];

        if (validChannels.includes(channel)) {
            return await ipcRenderer.invoke(channel, data);
        }
    },

    // Escuchar eventos del proceso principal
    on: (channel, callback) => {
        const validChannels = ['menu-action'];

        if (validChannels.includes(channel)) {
            ipcRenderer.on(channel, (event, ...args) => callback(...args));
        }
    },

    // Funciones de sistema de archivos seguras
    openFileDialog: () => {
        return ipcRenderer.invoke('dialog:openFile');
    },

    saveDialog: (options) => {
        return ipcRenderer.invoke('dialog:saveFile', options);
    },

    // Funciones de ventana
    minimizeWindow: () => {
        ipcRenderer.send('window:minimize');
    },

    maximizeWindow: () => {
        ipcRenderer.send('window:maximize');
    },

    closeWindow: () => {
        ipcRenderer.send('window:close');
    }
});

// Exponer información de la aplicación
contextBridge.exposeInMainWorld('appInfo', {
    name: 'SIG Pro',
    version: '1.0.0',
    platform: process.platform,
    arch: process.arch
});

// Exponer funciones de utilidad
contextBridge.exposeInMainWorld('utils', {
    formatDate: (date) => {
        return new Date(date).toLocaleDateString();
    },

    formatFileSize: (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
});