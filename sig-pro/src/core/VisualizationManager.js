/**
 * Clase que gestiona visualización
 */
export class VisualizationManager {
    constructor(mapManager, layerManager) {
        this.mapManager = mapManager;
        this.layerManager = layerManager;
    }

    toggleIdentifyMode() {
        console.log('Modo identificar activado');
    }

    highlightFeature(layerName, filter) {
        console.log('Resaltar:', layerName);
    }

    toggleLabels(layerName, field) {
        console.log('Etiquetas:', layerName, field);
    }

    setLayerStyle(layerName, style) {
        console.log('Estilo:', layerName, style);
    }

    setLayerOpacity(layerName, opacity) {
        console.log('Opacidad:', layerName, opacity);
    }
}
