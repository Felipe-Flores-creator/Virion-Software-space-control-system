import L from 'leaflet';

/**
 * Clase que gestiona la importación de archivos
 */
export class ImportManager {
    constructor(mapManager, layerManager) {
        this.mapManager = mapManager;
        this.layerManager = layerManager;
        this.map = mapManager.getMap();
    }

    handleFiles(files) {
        Array.from(files).forEach(file => {
            this.importFile(file);
        });
    }

    importFile(file) {
        const extension = file.name.split('.').pop().toLowerCase();
        const reader = new FileReader();

        switch(extension) {
            case 'geojson':
            case 'json':
                reader.onload = (e) => {
                    const data = JSON.parse(e.target.result);
                    this.layerManager.addVectorLayer(file.name, data);
                };
                reader.readAsText(file);
                break;

            case 'kml':
                reader.onload = (e) => {
                    console.log('KML cargado:', file.name);
                    // Aquí iría el parsing de KML
                };
                reader.readAsText(file);
                break;

            case 'gpx':
                reader.onload = (e) => {
                    console.log('GPX cargado:', file.name);
                    // Aquí iría el parsing de GPX
                };
                reader.readAsText(file);
                break;

            default:
                console.warn(`Formato no soportado: ${extension}`);
        }
    }
}
