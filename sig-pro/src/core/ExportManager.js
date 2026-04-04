/**
 * Clase que gestiona exportación
 */
export class ExportManager {
    constructor(mapManager, layerManager) {
        this.mapManager = mapManager;
        this.layerManager = layerManager;
    }

    toGeoJSON(layerName, filename) {
        console.log('Exportar GeoJSON:', layerName, filename);
    }

    toKML(layerName, filename) {
        console.log('Exportar KML:', layerName, filename);
    }

    toCSV(layerName, filename) {
        console.log('Exportar CSV:', layerName, filename);
    }

    toImage(filename) {
        console.log('Exportar imagen:', filename);
    }

    print() {
        console.log('Imprimir mapa');
    }
}
