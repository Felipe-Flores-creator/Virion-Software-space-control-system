/**
 * Clase que gestiona análisis espacial
 */
export class AnalysisManager {
    constructor(mapManager, layerManager) {
        this.mapManager = mapManager;
        this.layerManager = layerManager;
    }

    buffer(layerName, distance, outputName) {
        console.log('Buffer:', layerName, distance, outputName);
    }

    intersect(layer1, layer2, outputName) {
        console.log('Intersección:', layer1, layer2, outputName);
    }

    union(layer1, layer2, outputName) {
        console.log('Unión:', layer1, layer2, outputName);
    }

    clip(layerName, clipLayer, outputName) {
        console.log('Clip:', layerName, clipLayer, outputName);
    }

    dissolve(layerName, field, outputName) {
        console.log('Disolver:', layerName, field, outputName);
    }

    reproject(layerName, targetCrs, outputName) {
        console.log('Reproyectar:', layerName, targetCrs, outputName);
    }
}
