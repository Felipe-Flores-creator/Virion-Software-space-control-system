/**
 * Clase que gestiona configuración
 */
export class SettingsManager {
    constructor(mapManager) {
        this.mapManager = mapManager;
        this.settings = this.loadDefaults();
    }

    loadDefaults() {
        return {
            theme: 'light',
            language: 'es',
            units: 'metric'
        };
    }

    openSettingsPanel() {
        console.log('Abrir configuración');
    }

    reset() {
        this.settings = this.loadDefaults();
        console.log('Configuración restablecida');
    }

    get(key, subKey = null) {
        if (subKey && this.settings[key]) {
            return this.settings[key][subKey];
        }
        return this.settings[key];
    }

    set(key, subKey, value) {
        if (typeof subKey === 'object') {
            this.settings[key] = subKey;
        } else if (!this.settings[key]) {
            this.settings[key] = {};
            this.settings[key][subKey] = value;
        } else {
            this.settings[key][subKey] = value;
        }
    }
}
