import L from 'leaflet';

/**
 * Clase que gestiona las herramientas de dibujo y edición
 */
export class DrawManager {
    constructor(mapManager, layerManager) {
        this.mapManager = mapManager;
        this.layerManager = layerManager;
        this.map = mapManager.getMap();

        this.drawControl = null;
        this.drawnItems = null;
        this.currentDrawingType = null;
        this.isDrawing = false;
        this.measurementLayer = null;
        this.measurementPoints = [];

        this.init();
    }

    init() {
        this.drawnItems = new L.FeatureGroup();
        this.map.addLayer(this.drawnItems);

        this.setupDrawControl();

        console.log('DrawManager inicializado');
    }

    setupDrawControl() {
        const drawOptions = {
            position: 'topright',
            draw: {
                polyline: {
                    shapeOptions: {
                        color: '#f357a1',
                        weight: 10
                    }
                },
                polygon: {
                    allowIntersection: false,
                    drawError: {
                        color: '#e1e100',
                        timeout: 1000
                    },
                    shapeOptions: {
                        color: '#bada55'
                    }
                },
                circle: false,
                rectangle: {
                    shapeOptions: {
                        color: '#0078FF'
                    }
                },
                marker: {
                    icon: L.icon({
                        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
                    })
                }
            },
            edit: {
                featureGroup: this.drawnItems,
                remove: true
            }
        };

        this.drawControl = new L.Control.Draw(drawOptions);
        this.map.addControl(this.drawControl);

        this.map.on(L.Draw.Event.CREATED, (e) => {
            const layer = e.layer;
            this.drawnItems.addLayer(layer);
            console.log('Elemento dibujado:', e.layerType);
        });

        this.map.on(L.Draw.Event.EDITED, (e) => {
            console.log('Elemento editado');
        });

        this.map.on(L.Draw.Event.DELETED, (e) => {
            console.log('Elemento eliminado');
        });
    }

    toggleDrawing(type) {
        if (this.isDrawing) {
            this.cancelDrawing();
            return;
        }

        this.isDrawing = true;
        this.currentDrawingType = type;

        switch(type) {
            case 'marker':
                this.startDrawing('marker');
                break;
            case 'line':
                this.startDrawing('polyline');
                break;
            case 'polygon':
                this.startDrawing('polygon');
                break;
        }
    }

    startDrawing(drawType) {
        let drawControl;

        switch(drawType) {
            case 'marker':
                drawControl = new L.Draw.Marker();
                break;
            case 'polyline':
                drawControl = new L.Draw.Polyline();
                break;
            case 'polygon':
                drawControl = new L.Draw.Polygon();
                break;
        }

        if (drawControl) {
            drawControl.enable();
            console.log('Dibujo iniciado:', drawType);
        }
    }

    cancelDrawing() {
        this.isDrawing = false;
        this.currentDrawingType = null;
        console.log('Dibujo cancelado');
    }

    startMeasurement(type = 'distance') {
        this.measurementType = type;
        this.measurementPoints = [];
        this.measurementLayer = L.featureGroup().addTo(this.map);

        this.map.on('click', this.handleMeasurementClick.bind(this));
        console.log('Medición iniciada:', type);
    }

    handleMeasurementClick(e) {
        this.measurementPoints.push(e.latlng);

        L.circleMarker(e.latlng, {
            radius: 6,
            color: '#ff0000',
            fillColor: '#ff0000'
        }).addTo(this.measurementLayer);

        if (this.measurementPoints.length > 1) {
            const lastIndex = this.measurementPoints.length - 1;
            L.polyline([
                this.measurementPoints[lastIndex - 1],
                this.measurementPoints[lastIndex]
            ], {
                color: '#ff0000',
                dashArray: '5, 10'
            }).addTo(this.measurementLayer);

            if (this.measurementType === 'distance') {
                const distance = this.calculateDistance(
                    this.measurementPoints[lastIndex - 1],
                    this.measurementPoints[lastIndex]
                );
                console.log(`Distancia: ${distance.toFixed(2)} m`);
            }
        }
    }

    calculateDistance(latlng1, latlng2) {
        return this.map.distance(latlng1, latlng2);
    }

    stopMeasurement() {
        this.map.off('click', this.handleMeasurementClick.bind(this));
        if (this.measurementLayer) {
            this.map.removeLayer(this.measurementLayer);
        }
        this.measurementPoints = [];
        console.log('Medición finalizada');
    }
}
