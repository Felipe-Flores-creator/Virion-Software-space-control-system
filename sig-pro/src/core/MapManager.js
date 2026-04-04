/**
 * MapManager.js - Gestiona el mapa y las capas base
 * Versión sin módulos ES6 para funcionar directamente desde HTML
 */

var MapManager = (function () {
    var L = window.L;

    function MapManager(containerId) {
        this.containerId = containerId;
        this.map = null;
        this.baseLayers = new Map();
        this.currentBaseLayer = null;
        this.initialized = false;
        this.currentLayerName = null;

        this.init();
    }

    MapManager.prototype.init = function () {
        try {
            // Configurar íconos de Leaflet
            delete L.Icon.Default.prototype._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
            });

            // Inicializar mapa
            this.map = L.map(this.containerId, {
                center: [-33.4489, -70.6693],
                zoom: 12,
                zoomControl: false,
                attributionControl: false
            });

            // Añadir control de zoom personalizado
            L.control.zoom({
                position: 'topright'
            }).addTo(this.map);

            // Añadir control de atribución
            L.control.attribution({
                position: 'bottomleft',
                prefix: 'SIG Pro &copy; 2024'
            }).addTo(this.map);

            // Eventos del mapa
            this.setupMapEvents();

            // Forzar recalculo de dimensiones
            setTimeout(() => {
                this.map.invalidateSize();
            }, 100);

            this.initialized = true;
            console.log('MapManager inicializado');

        } catch (error) {
            console.error('Error al inicializar MapManager:', error);
            throw error;
        }
    };

    MapManager.prototype.setupMapEvents = function () {
        var self = this;

        this.map.on('move', function () {
            self.updateStatusBar();
        });

        this.map.on('click', function (e) {
            self.handleMapClick(e);
        });

        this.map.on('load', function () {
            self.updateStatusBar();
        });
    };

    MapManager.prototype.handleMapClick = function (e) {
        var latlng = e.latlng;
        var coords = 'Lat: ' + latlng.lat.toFixed(6) + ', Lng: ' + latlng.lng.toFixed(6);

        if (window.sigPro && window.sigPro.statusBar) {
            window.sigPro.statusBar.updateCoordinates(coords);
        }
    };

    MapManager.prototype.updateStatusBar = function () {
        if (!this.map || !window.sigPro || !window.sigPro.statusBar) return;

        var center = this.map.getCenter();
        var coords = 'Centro: ' + center.lat.toFixed(6) + ', ' + center.lng.toFixed(6);
        var scaleText = 'Zoom: ' + this.map.getZoom();
        var layerCount = this.currentBaseLayer ? 1 : 0;
        var layerText = 'Capas: ' + layerCount;

        window.sigPro.statusBar.updateAll(coords, scaleText, layerText);
    };

    MapManager.prototype.addBaseLayer = function (name, options) {
        var self = this;
        return new Promise(function (resolve, reject) {
            try {
                var layer;

                // Auto-detect type if not specified but URL is provided
                if (!options.type && options.url && !options.offline) {
                    options.type = 'tile';
                }

                if (options.offline) {
                    layer = L.tileLayer('', {
                        attribution: options.attribution || 'Offline',
                        maxZoom: options.maxZoom || 19,
                        minZoom: options.minZoom || 0
                    });
                } else if (options.type === 'tile') {
                    layer = L.tileLayer(options.url, {
                        attribution: options.attribution,
                        maxZoom: options.maxZoom || 19,
                        minZoom: options.minZoom || 0,
                        crossOrigin: true
                    });

                    layer.on('tileerror', function (e) {
                        console.warn('Error tile ' + name + ':', e.url);
                    });
                } else if (options.type === 'wms') {
                    layer = L.tileLayer.wms(options.url, {
                        layers: options.layers,
                        format: options.format || 'image/png',
                        transparent: options.transparent !== false,
                        attribution: options.attribution
                    });
                } else {
                    reject(new Error('Tipo de capa no soportado: ' + options.type));
                    return;
                }

                self.baseLayers.set(name, layer);

                if (self.baseLayers.size === 1) {
                    self.setActiveBaseLayer(name).then(resolve).catch(reject);
                } else {
                    console.log('Capa base ' + name + ' añadida');
                    resolve(layer);
                }

            } catch (error) {
                console.error('Error al añadir capa base ' + name + ':', error);
                reject(error);
            }
        });
    };

    MapManager.prototype.setActiveBaseLayer = function (name) {
        var self = this;
        return new Promise(function (resolve, reject) {
            try {
                var layer = self.baseLayers.get(name);

                if (!layer) {
                    reject(new Error('Capa base ' + name + ' no encontrada'));
                    return;
                }

                if (self.currentBaseLayer) {
                    self.map.removeLayer(self.currentBaseLayer);
                }

                layer.addTo(self.map);
                self.currentBaseLayer = layer;
                self.currentLayerName = name;

                self.updateStatusBar();

                console.log('Capa base activa: ' + name);
                resolve(true);

            } catch (error) {
                console.error('Error al cambiar capa base:', error);
                reject(error);
            }
        });
    };

    MapManager.prototype.getBaseLayer = function (name) {
        return this.baseLayers.get(name);
    };

    MapManager.prototype.setLayer = function (name) {
        return this.setActiveBaseLayer(name);
    };

    MapManager.prototype.getAllBaseLayers = function () {
        return Array.from(this.baseLayers.entries()).map(function (entry) {
            return {
                name: entry[0],
                layer: entry[1],
                active: entry[1] === this.currentBaseLayer
            };
        }.bind(this));
    };

    MapManager.prototype.zoomToExtent = function () {
        if (this.currentBaseLayer) {
            this.map.fitBounds(this.map.getBounds());
        }
    };

    MapManager.prototype.getMap = function () {
        return this.map;
    };

    MapManager.prototype.destroy = function () {
        if (this.map) {
            this.map.remove();
            this.map = null;
        }
        this.baseLayers.clear();
        this.currentBaseLayer = null;
        this.initialized = false;
    };

    return MapManager;
})();
