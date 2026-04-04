import L from 'leaflet';

/**
 * Clase que gestiona todas las capas del mapa
 */
export class LayerManager {
    constructor(mapManager) {
        this.mapManager = mapManager;
        this.map = mapManager.getMap();

        this.layers = new Map();
        this.layerGroups = new Map();
        this.layerOrder = [];

        this.init();
    }

    init() {
        console.log('LayerManager inicializado');
    }

    async addBaseLayer(name, options) {
        return await this.mapManager.addBaseLayer(name, options);
    }

    setActiveBaseLayer(name) {
        return this.mapManager.setActiveBaseLayer(name);
    }

    getActiveBaseLayer() {
        return this.mapManager.currentBaseLayer ? 
            Array.from(this.mapManager.baseLayers.keys()).find(
                name => this.mapManager.baseLayers.get(name) === this.mapManager.currentBaseLayer
            ) : null;
    }

    addVectorLayer(name, data, options = {}) {
        try {
            let layer;

            if (typeof data === 'string') {
                layer = L.geoJSON(null, this.getVectorStyle(options));
                this.loadGeoJSON(layer, data);
            } else if (data.type === 'FeatureCollection' || data.type === 'Feature') {
                layer = L.geoJSON(data, this.getVectorStyle(options));
            } else {
                layer = L.geoJSON(data, this.getVectorStyle(options));
            }

            this.layers.set(name, {
                layer,
                type: 'vector',
                visible: true,
                data
            });

            layer.addTo(this.map);
            this.layerOrder.push(name);

            console.log(`Capa vectorial ${name} añadida`);
            return layer;

        } catch (error) {
            console.error(`Error añadiendo capa vectorial ${name}:`, error);
            throw error;
        }
    }

    getVectorStyle(options = {}) {
        return {
            style: {
                color: options.color || '#3388ff',
                weight: options.weight || 3,
                opacity: options.opacity || 0.7,
                fill: options.fill !== false,
                fillColor: options.fillColor || '#3388ff',
                fillOpacity: options.fillOpacity || 0.2
            },
            pointToLayer: (feature, latlng) => {
                return L.circleMarker(latlng, {
                    radius: options.radius || 8,
                    color: options.color || '#3388ff',
                    fillColor: options.fillColor || '#3388ff',
                    fillOpacity: options.fillOpacity || 0.5
                });
            },
            onEachFeature: (feature, layer) => {
                if (feature.properties) {
                    let popupContent = '<table class="table table-sm">';
                    for (const [key, value] of Object.entries(feature.properties)) {
                        popupContent += `<tr><th>${key}</th><td>${value}</td></tr>`;
                    }
                    popupContent += '</table>';
                    layer.bindPopup(popupContent);
                }
            }
        };
    }

    loadGeoJSON(layer, url) {
        fetch(url)
            .then(response => response.json())
            .then(data => {
                layer.addData(data);
                this.layers.set(url, {
                    layer,
                    type: 'vector',
                    visible: true,
                    data
                });
            })
            .catch(error => {
                console.error('Error cargando GeoJSON:', error);
            });
    }

    getLayer(name) {
        const layerInfo = this.layers.get(name);
        return layerInfo ? layerInfo.layer : null;
    }

    getLayerInfo(name) {
        return this.layers.get(name);
    }

    getAllLayers() {
        return Array.from(this.layers.entries()).map(([name, info]) => ({
            name,
            type: info.type,
            visible: info.visible,
            layer: info.layer
        }));
    }

    setLayerVisibility(name, visible) {
        const layerInfo = this.layers.get(name);
        if (layerInfo) {
            if (visible) {
                layerInfo.layer.addTo(this.map);
            } else {
                this.map.removeLayer(layerInfo.layer);
            }
            layerInfo.visible = visible;
        }
    }

    removeLayer(name) {
        const layerInfo = this.layers.get(name);
        if (layerInfo) {
            this.map.removeLayer(layerInfo.layer);
            this.layers.delete(name);
            this.layerOrder = this.layerOrder.filter(n => n !== name);
            console.log(`Capa ${name} eliminada`);
        }
    }

    setLayerOrder(name, index) {
        this.layerOrder = this.layerOrder.filter(n => n !== name);
        this.layerOrder.splice(index, 0, name);
    }

    clearAllLayers() {
        this.layers.forEach((info, name) => {
            this.map.removeLayer(info.layer);
        });
        this.layers.clear();
        this.layerOrder = [];
        console.log('Todas las capas eliminadas');
    }

    exportToGeoJSON() {
        const features = [];
        this.layers.forEach((info, name) => {
            if (info.layer.toGeoJSON) {
                const geojson = info.layer.toGeoJSON();
                if (geojson.type === 'FeatureCollection') {
                    features.push(...geojson.features);
                } else if (geojson.type === 'Feature') {
                    features.push(geojson);
                }
            }
        });
        return {
            type: 'FeatureCollection',
            features
        };
    }
}
