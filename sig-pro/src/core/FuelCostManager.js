/**
 * FuelCostManager.js - Gestor de cálculo de costos de combustible y rutas
 * Calcula distancias, consumo de combustible y costos para rutas definidas por puntos
 */

function FuelCostManager(map) {
    this.map = map;
    this.routePoints = [];
    this.routeMarkers = [];
    this.routeLine = null;
    this.isDrawing = false;
    this.drawMode = 'points'; // 'points' o 'line'
    this.tempLine = null; // Línea temporal mientras se dibuja
    this.calculatedRoutes = [];
    this.currentRouteData = null;
    this.drawingFinished = false;

    // Iconos personalizados
    this.markerIcon = L.divIcon({
        className: 'fuel-marker',
        html: `<div style="
            width: 20px;
            height: 20px;
            background: rgba(0, 255, 136, 0.9);
            border: 2px solid #fff;
            border-radius: 50%;
            box-shadow: 0 0 15px rgba(0, 255, 136, 0.8);
            animation: pulse-marker 1.5s infinite;
        "></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });

    this.startMarkerIcon = L.divIcon({
        className: 'fuel-marker-start',
        html: `<div style="
            width: 24px;
            height: 24px;
            background: rgba(0, 255, 136, 1);
            border: 3px solid #fff;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            box-shadow: 0 0 20px rgba(0, 255, 136, 1);
        "></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });

    this.endMarkerIcon = L.divIcon({
        className: 'fuel-marker-end',
        html: `<div style="
            width: 22px;
            height: 22px;
            background: rgba(255, 69, 0, 1);
            border: 3px solid #fff;
            border-radius: 50%;
            box-shadow: 0 0 20px rgba(255, 69, 0, 1);
        "></div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
    });

    this.init();
}

// Paleta de colores para velocidades (de lento azul → rápido rojo)
FuelCostManager.SPEED_COLORS = [
    { max: 30,  color: '#00aaff', label: 'Muy lento (≤30 km/h)' },
    { max: 50,  color: '#00e5ff', label: 'Lento (31-50 km/h)' },
    { max: 70,  color: '#00ff88', label: 'Moderado (51-70 km/h)' },
    { max: 90,  color: '#ffdd00', label: 'Rápido (71-90 km/h)' },
    { max: 110, color: '#ff8800', label: 'Muy rápido (91-110 km/h)' },
    { max: 999, color: '#ff2244', label: 'Alta velocidad (>110 km/h)' }
];

FuelCostManager.prototype.getSegmentColor = function (speed) {
    var palette = FuelCostManager.SPEED_COLORS;
    for (var i = 0; i < palette.length; i++) {
        if (speed <= palette[i].max) return palette[i].color;
    }
    return '#ff2244';
};

/**
 * Lee los tramos configurados en el DOM.
 * Retorna array de objetos { speed, km } o [] si no hay tramos.
 */
FuelCostManager.prototype.getSpeedSegments = function () {
    var rows = document.querySelectorAll('#speed-segments-list .seg-row');
    var segments = [];
    rows.forEach(function (row) {
        var speedIn = row.querySelector('.seg-speed');
        var kmIn    = row.querySelector('.seg-km');
        var speed   = parseFloat(speedIn ? speedIn.value : 0);
        var km      = parseFloat(kmIn ? kmIn.value : 0);
        if (!isNaN(speed) && speed > 0) {
            segments.push({ speed: speed, km: (!isNaN(km) && km > 0) ? km : 0 });
        }
    });
    return segments;
};

FuelCostManager.prototype.init = function () {
    var self = this;

    // Añadir estilo CSS para animación de marcadores
    if (!document.getElementById('fuel-marker-style')) {
        var style = document.createElement('style');
        style.id = 'fuel-marker-style';
        style.textContent = `
            @keyframes pulse-marker {
                0% { box-shadow: 0 0 0 0 rgba(0, 255, 136, 0.7); }
                70% { box-shadow: 0 0 0 10px rgba(0, 255, 136, 0); }
                100% { box-shadow: 0 0 0 0 rgba(0, 255, 136, 0); }
            }
            .fuel-marker, .fuel-marker-start, .fuel-marker-end {
                background: transparent !important;
                border: none !important;
            }
            .seg-row {
                display: flex;
                align-items: center;
                gap: 4px;
                background: rgba(0,229,255,0.06);
                border: 1px solid rgba(0,229,255,0.2);
                border-radius: 5px;
                padding: 4px 6px;
            }
            .seg-color-dot {
                width: 10px; height: 10px;
                border-radius: 50%;
                flex-shrink: 0;
                transition: background 0.3s;
            }
            .seg-speed, .seg-km {
                background: rgba(0,0,0,0.5);
                border: 1px solid rgba(0,229,255,0.3);
                color: #fff;
                border-radius: 3px;
                padding: 2px 4px;
                font-size: 0.65rem;
                width: 52px;
                text-align: right;
            }
            .seg-label { font-size: 0.58rem; color: rgba(255,255,255,0.45); flex-shrink:0; }
            .seg-remove { background:none; border:none; color:#ff4444; cursor:pointer; font-size:0.75rem; padding:0 2px; flex-shrink:0; }
        `;
        document.head.appendChild(style);
    }

    // Inicializar el primer tramo vacío
    var list = document.getElementById('speed-segments-list');
    if (list && list.children.length === 0) {
        window.addSpeedSegment();
    }

    console.log('⛽ FuelCostManager inicializado');
};

/**
 * Inicia el modo de dibujo de ruta
 */
FuelCostManager.prototype.startDrawing = function () {
    var self = this;

    if (this.isDrawing) {
        this.stopDrawing();
        return;
    }

    this.isDrawing = true;
    this.drawingFinished = false;
    this.routePoints = [];
    this.clearMarkers();

    // Obtener modo de dibujo
    var drawModeSelect = document.getElementById('draw-mode');
    this.drawMode = drawModeSelect ? drawModeSelect.value : 'points';

    // Cambiar cursor
    this.map.getContainer().style.cursor = 'crosshair';

    // Añadir evento de click
    this.map.on('click', this.onMapClick, this);

    // Añadir evento de mousemove para línea dinámica
    if (this.drawMode === 'line') {
        this.map.on('mousemove', this.onMouseMove, this);
    }

    // Notificación
    if (this.drawMode === 'line') {
        this.showNotification('Haz click para añadir vértices. Click derecho o FINALIZAR para terminar.', 'info');
    } else {
        this.showNotification('Haz click para añadir puntos. Click derecho para finalizar.', 'info');
    }
};

/**
 * Detiene el modo de dibujo
 */
FuelCostManager.prototype.stopDrawing = function () {
    this.isDrawing = false;
    this.drawingFinished = false;
    this.map.getContainer().style.cursor = '';
    this.map.off('click', this.onMapClick, this);
    this.map.off('mousemove', this.onMouseMove, this);

    // Eliminar línea temporal
    if (this.tempLine) {
        this.map.removeLayer(this.tempLine);
        this.tempLine = null;
    }
};

/**
 * Finaliza el dibujo de la ruta (para modo línea)
 */
FuelCostManager.prototype.finishDrawing = function () {
    if (!this.isDrawing || this.routePoints.length < 2) {
        this.showNotification('Dibuja al menos 2 puntos antes de finalizar', 'error');
        return;
    }

    this.drawingFinished = true;
    this.stopDrawing();
    this.showNotification('Ruta finalizada. Ahora puedes calcular.', 'success');
};

/**
 * Maneja el movimiento del mouse para línea dinámica
 */
FuelCostManager.prototype.onMouseMove = function (e) {
    if (!this.isDrawing || this.drawMode !== 'line' || this.routePoints.length === 0) return;

    var latlngs = this.routePoints.map(function (p) {
        return [p.lat, p.lng];
    });

    // Añadir punto actual del mouse
    latlngs.push([e.latlng.lat, e.latlng.lng]);

    if (this.tempLine) {
        this.tempLine.setLatLngs(latlngs);
    } else {
        this.tempLine = L.polyline(latlngs, {
            color: '#00ff88',
            weight: 3,
            opacity: 0.6,
            dashArray: '10, 10',
            lineCap: 'round'
        }).addTo(this.map);
    }
};

/**
 * Maneja clicks en el mapa para añadir puntos con snap-to-road opcional
 * Intenta ajustar al camino más cercano; si falla, usa el punto original
 */
FuelCostManager.prototype.onMapClick = function (e) {
    var self = this;

    if (!this.isDrawing) return;

    var pointIndex = this.routePoints.length;
    var pointName = 'Punto ' + (pointIndex + 1);

    // Añadir punto con la posición del click
    var provisionalPoint = {
        lat: e.latlng.lat,
        lng: e.latlng.lng,
        name: pointName,
        snapped: false
    };

    this.routePoints.push(provisionalPoint);
    this.addMarker(provisionalPoint, pointIndex);

    // Eliminar línea temporal si existe (modo línea)
    if (this.tempLine) {
        this.map.removeLayer(this.tempLine);
        this.tempLine = null;
    }

    // Dibujar línea provisional
    this.updateRouteLine();

    // Snap-to-road silencioso: ajusta al camino más cercano via OSRM Nearest
    // Si falla por cualquier razón, se iteran diferentes servidores, si todos fallan usa el punto original sin interrumpir al usuario
    var OSRM_SNAP_ENDPOINTS = [
        'https://router.project-osrm.org/nearest/v1/driving/',
        'https://routing.openstreetmap.de/routed-car/nearest/v1/driving/'
    ];

    function trySnapServer(serverIndex) {
        if (serverIndex >= OSRM_SNAP_ENDPOINTS.length) return; // Se acabaron los intentos

        var nearestUrl = OSRM_SNAP_ENDPOINTS[serverIndex] + provisionalPoint.lng + ',' + provisionalPoint.lat + '?number=1';
        var snapController = new AbortController();
        var snapTimeout = setTimeout(function () { snapController.abort(); }, 5000);

        fetch(nearestUrl, { signal: snapController.signal })
            .then(function (res) {
                clearTimeout(snapTimeout);
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.json();
            })
            .then(function (data) {
                if (data.code === 'Ok' && data.waypoints && data.waypoints.length > 0) {
                    var snapped = data.waypoints[0].location; // [lng, lat]
                    var dist = data.waypoints[0].distance;    // metros al camino

                    // Actualizar posición en el array global
                    self.routePoints[pointIndex].lat = snapped[1];
                    self.routePoints[pointIndex].lng = snapped[0];
                    self.routePoints[pointIndex].snapped = true;

                    // Mover el marcador gráfico al camino más cercano
                    if (self.routeMarkers[pointIndex]) {
                        self.routeMarkers[pointIndex].setLatLng([snapped[1], snapped[0]]);
                    }

                    // Redibujar la línea preliminar verde con la nueva posición ajustada
                    self.updateRouteLine();

                    // Notificar si el ajuste fue visualmente considerable (>30m)
                    if (dist > 30) {
                        self.showNotification(
                            'Punto ajustado automáticamente a carretera más cercana (' + Math.round(dist) + 'm)',
                            'info'
                        );
                    }
                }
            })
            .catch(function (e) {
                clearTimeout(snapTimeout);
                trySnapServer(serverIndex + 1);
            });
    }

    trySnapServer(0);
};


/**
 * Añade un marcador en el mapa
 */
FuelCostManager.prototype.addMarker = function (point, index) {
    var icon = this.markerIcon;
    var popupContent = '<strong>' + point.name + '</strong><br>' +
        'Lat: ' + point.lat.toFixed(6) + '<br>' +
        'Lng: ' + point.lng.toFixed(6);

    // Primer punto (inicio)
    if (index === 0) {
        icon = this.startMarkerIcon;
        popupContent = '<strong>🚩 Inicio</strong><br>' + popupContent;
    }

    // Último punto (fin) - se actualiza dinámicamente
    if (this.routePoints.length > 1 && index === this.routePoints.length - 1) {
        icon = this.endMarkerIcon;
        popupContent = '<strong>🏁 Fin</strong><br>' + popupContent;
    }

    var marker = L.marker([point.lat, point.lng], { icon: icon })
        .bindPopup(popupContent)
        .addTo(this.map);

    this.routeMarkers.push(marker);
};

/**
 * Actualiza la línea de ruta conectando los puntos
 */
FuelCostManager.prototype.updateRouteLine = function (segmentColors) {
    if (this.routePoints.length < 2) {
        if (this.routeLine) {
            this.map.removeLayer(this.routeLine);
            this.routeLine = null;
        }
        return;
    }

    // Limpiar línea previa (puede ser un grupo)
    if (this.routeLine) {
        if (this.routeLine.eachLayer) {
            this.routeLine.eachLayer(function (l) { l.remove(); });
        }
        this.map.removeLayer(this.routeLine);
        this.routeLine = null;
    }

    // Si hay colores por segmento, dibujar cada segmento con su color
    if (segmentColors && segmentColors.length === this.routePoints.length - 1) {
        var group = L.layerGroup();
        for (var i = 0; i < this.routePoints.length - 1; i++) {
            var p1 = this.routePoints[i];
            var p2 = this.routePoints[i + 1];
            L.polyline([[p1.lat, p1.lng], [p2.lat, p2.lng]], {
                color: segmentColors[i],
                weight: 5,
                opacity: 0.9,
                dashArray: '10, 8',
                lineCap: 'round'
            }).addTo(group);
        }
        group.addTo(this.map);
        this.routeLine = group;
    } else {
        // Preview sin colores durante el dibujo
        var latlngs = this.routePoints.map(function (p) {
            return [p.lat, p.lng];
        });
        this.routeLine = L.polyline(latlngs, {
            color: '#00ff88',
            weight: 4,
            opacity: 0.8,
            dashArray: '10, 10',
            lineCap: 'round'
        }).addTo(this.map);
    }

    // Calcular bounds para ajustar zoom
    var allLatLngs = this.routePoints.map(function (p) { return [p.lat, p.lng]; });
    this.map.fitBounds(L.latLngBounds(allLatLngs), { padding: [50, 50] });
};

/**
 * Limpia todos los marcadores y líneas
 */
FuelCostManager.prototype.clearMarkers = function () {
    for (var i = 0; i < this.routeMarkers.length; i++) {
        this.map.removeLayer(this.routeMarkers[i]);
    }
    this.routeMarkers = [];

    if (this.routeLine) {
        this.map.removeLayer(this.routeLine);
        this.routeLine = null;
    }
};

/**
 * Calcula la ruta y los costos asociados
 */
FuelCostManager.prototype.calculateRoute = function () {
    var self = this;

    if (this.routePoints.length < 2) {
        this.showNotification('Debes añadir al menos 2 puntos para calcular la ruta', 'error');
        return Promise.reject('Mínimo 2 puntos requeridos');
    }

    var mode = document.getElementById('route-mode') ? document.getElementById('route-mode').value : 'direct';
    var fuelPrice      = parseFloat(document.getElementById('fuel-price').value) || 1.20;
    var fuelEfficiency = parseFloat(document.getElementById('fuel-efficiency').value) || 12;
    var avgSpeed       = parseFloat(document.getElementById('fuel-speed') ? document.getElementById('fuel-speed').value : 60) || 60;
    var trafficDelay   = parseFloat(document.getElementById('traffic-delay') ? document.getElementById('traffic-delay').value : 0) || 0;

    // Leer tramos dinámicos del panel
    var segmentSpeeds = this.getSpeedSegments();

    if (this.isDrawing) this.stopDrawing();

    if (this.routeLine) {
        if (this.routeLine.eachLayer) this.routeLine.eachLayer(function (l) { l.remove(); });
        this.map.removeLayer(this.routeLine);
        this.routeLine = null;
    }

    var loadingSpan = document.querySelector('#loading-overlay span');
    if (loadingSpan) {
        loadingSpan.textContent = mode === 'urban'
            ? 'CALCULANDO RUTA URBANA (OSRM)...'
            : mode === 'road' ? 'CALCULANDO RUTA POR CARRETERA (OSRM)...'
            : 'CALCULANDO DISTANCIA DIRECTA...';
    }

    this.showLoading(true);

    if (mode === 'road' || mode === 'urban') {
        this.showNotification(mode === 'urban'
            ? 'Calculando ruta respetando sentido de calles...'
            : 'Calculando ruta por carretera...', 'info');
        return this.calculateRoadRoute(fuelPrice, fuelEfficiency, avgSpeed, segmentSpeeds, trafficDelay, mode);
    } else {
        return this.calculateDirectRoute(fuelPrice, fuelEfficiency, avgSpeed, segmentSpeeds, trafficDelay);
    }
};


/**
 * Calcula ruta en línea directa (distancia euclidiana) y dibuja la línea en el mapa
 */
FuelCostManager.prototype.calculateDirectRoute = function (fuelPrice, fuelEfficiency, avgSpeed, speedSegs, trafficDelay) {
    var self = this;

    return new Promise(function (resolve, reject) {
        var totalDistance = 0;
        var totalTimeHours = 0;
        var segmentDetails = [];
        var segColors = [];

        // Distancia real de cada tramo geográfico
        var geoDists = [];
        for (var i = 0; i < self.routePoints.length - 1; i++) {
            geoDists.push(self.haversineDistance(
                self.routePoints[i].lat, self.routePoints[i].lng,
                self.routePoints[i + 1].lat, self.routePoints[i + 1].lng
            ));
            totalDistance += geoDists[i];
        }

        // Distribuir velocidades usando los tramos configurados
        // Si el tramo tiene km definido: se usa esa velocidad hasta agotar los km
        // Luego pasa al siguiente tramo. El último tramo se aplica al resto.
        var distRemaining = totalDistance;
        var speedSegsToApply = (speedSegs && speedSegs.length > 0) ? speedSegs : [{ speed: avgSpeed, km: 0 }];

        // Calcular distribución de velocidad por km total recorrido
        var speedPlan = []; // [{speed, km}] representando tramos continuos
        for (var s = 0; s < speedSegsToApply.length; s++) {
            var seg = speedSegsToApply[s];
            var spd = seg.speed > 0 ? seg.speed : avgSpeed;
            var km  = seg.km > 0 ? Math.min(seg.km, distRemaining) : distRemaining;
            // Se remueve el stretch forzado
            speedPlan.push({ speed: spd, km: km, color: self.getSegmentColor(spd) });
            distRemaining -= km;
            if (distRemaining <= 0.001) break;
        }

        if (distRemaining > 0.001) {
            speedPlan.push({ speed: avgSpeed, km: distRemaining, color: self.getSegmentColor(avgSpeed) });
            distRemaining = 0;
        }

        // Limpiar línea previa
        if (self.routeLine) {
            if (self.routeLine.eachLayer) self.routeLine.eachLayer(function (l) { l.remove(); });
            self.map.removeLayer(self.routeLine);
            self.routeLine = null;
        }
        var group = L.layerGroup();
        var currentPlanIdx = 0;
        var planDistConsumed = 0;
        for (var i = 0; i < geoDists.length; i++) {
            var d = geoDists[i];
            var p1 = self.routePoints[i];
            var p2 = self.routePoints[i + 1];
            
            var plan = speedPlan[currentPlanIdx];
            var segmentPoints = [[p1.lat, p1.lng]];

            while (currentPlanIdx < speedPlan.length - 1 && (planDistConsumed + d) > plan.km) {
                var remainder = plan.km - planDistConsumed;
                var ratio = (d > 0) ? (remainder / d) : 0;
                
                var midLat = p1.lat + (p2.lat - p1.lat) * ratio;
                var midLng = p1.lng + (p2.lng - p1.lng) * ratio;
                
                segmentPoints.push([midLat, midLng]);
                
                segColors.push(plan.color);
                L.polyline(segmentPoints, {
                    color: plan.color, weight: 5, opacity: 0.9, dashArray: '12,8', lineCap: 'round'
                }).addTo(group);
                
                var segTime = remainder / plan.speed;
                totalTimeHours += segTime;
                
                segmentDetails.push({
                    index: currentPlanIdx + 1, distance: remainder, speed: plan.speed,
                    time: segTime, fuel: remainder / fuelEfficiency,
                    cost: (remainder / fuelEfficiency) * fuelPrice, color: plan.color
                });
                
                currentPlanIdx++;
                plan = speedPlan[currentPlanIdx];
                
                p1 = {lat: midLat, lng: midLng};
                d = d - remainder;
                planDistConsumed = 0;
                segmentPoints = [[midLat, midLng]];
            }

            segmentPoints.push([p2.lat, p2.lng]);
            segColors.push(plan.color);
            L.polyline(segmentPoints, {
                color: plan.color, weight: 5, opacity: 0.9, dashArray: '12,8', lineCap: 'round'
            }).addTo(group);
            
            planDistConsumed += d;
            var finalSegTime = d / plan.speed;
            totalTimeHours += finalSegTime;
            
            segmentDetails.push({
                index: currentPlanIdx + 1, distance: d, speed: plan.speed,
                time: finalSegTime, fuel: d / fuelEfficiency,
                cost: (d / fuelEfficiency) * fuelPrice, color: plan.color
            });
        }

        var trafficDelayHours = trafficDelay / 60;
        totalTimeHours += trafficDelayHours;
        var fuelConsumedDriving = totalDistance / fuelEfficiency;
        var fuelConsumedIdling  = trafficDelayHours * 1.0;
        var fuelConsumed = fuelConsumedDriving + fuelConsumedIdling;
        var totalCost = fuelConsumed * fuelPrice;

        group.addTo(self.map);
        self.routeLine = group;
        self.map.fitBounds(L.latLngBounds(self.routePoints.map(function(p){ return [p.lat, p.lng]; })), { padding: [50, 50] });

        var routeData = {
            id: Date.now(),
            name: 'Ruta ' + (self.calculatedRoutes.length + 1),
            distance: totalDistance,
            fuelConsumed: fuelConsumed,
            totalCost: totalCost,
            estimatedTime: totalTimeHours,
            fuelPrice: fuelPrice,
            fuelEfficiency: fuelEfficiency,
            points: JSON.parse(JSON.stringify(self.routePoints)),
            mode: 'direct',
            segmentDetails: segmentDetails
        };

        self.calculatedRoutes.push(routeData);
        self.currentRouteData = routeData;
        self.updateRouteResults(routeData);
        self.updateSpeedLegend(speedSegsToApply, avgSpeed);
        self.showLoading(false);
        self.showNotification('Distancia directa: ' + totalDistance.toFixed(2) + ' km', 'success');
        resolve(routeData);
    });
};

/**
 * Calcula ruta usando OSRM con servidor primario y alternativo como fallback
 */
FuelCostManager.prototype.calculateRoadRoute = function (fuelPrice, fuelEfficiency, avgSpeed, segmentSpeeds, trafficDelay, mode) {
    var self = this;

    // Endpoints OSRM y Fallbacks de ruteo
    // Se agregan servidores de respaldo para maximizar la probabilidad de éxito
    var OSRM_ENDPOINTS = [
        {
            name: 'OSRM Project (Primario)',
            url: 'https://router.project-osrm.org/route/v1/driving/'
        },
        {
            name: 'OSM Routing DE (Alemania)',
            url: 'https://routing.openstreetmap.de/routed-car/route/v1/driving/'
        },
        {
            name: 'FOSSGIS Routing (Alternativo)',
            url: 'https://router.fao.org/osrm/route/v1/driving/'
        }
    ];

    var coordinates = self.routePoints.map(function (p) {
        return p.lng + ',' + p.lat;
    }).join(';');

    var TIMEOUT_MS = 15000; // 15 segundos: un equilibrio entre esperar al servidor y no congelar la UI
    var QUERY_PARAMS = '?overview=full&geometries=geojson&steps=true&annotations=false';

    function tryServer(serverIndex) {
        return new Promise(function (resolve, reject) {
            if (serverIndex >= OSRM_ENDPOINTS.length) {
                reject(new Error('OSRM_ALL_FAILED'));
                return;
            }

            var endpoint = OSRM_ENDPOINTS[serverIndex];
            var osrmUrl = endpoint.url + coordinates + QUERY_PARAMS;

            var controller = new AbortController();
            var timeoutId = setTimeout(function () { controller.abort(); }, TIMEOUT_MS);

            self.showNotification(
                (serverIndex > 0 ? 'Probando servidor alternativo...' : 'Calculando ruta por calles...'),
                'info'
            );

            console.log('[OSRM] Intentando servidor:', endpoint.name, osrmUrl);

            fetch(osrmUrl, { signal: controller.signal })
                .then(function (response) {
                    clearTimeout(timeoutId);
                    return response.text().then(function (text) {
                        var data = null;
                        try { data = JSON.parse(text); } catch (e) {}

                        if (!response.ok) {
                            var errMsg = (data && data.message) ? data.message : 'HTTP ' + response.status;
                            throw new Error(errMsg);
                        }
                        if (!data || !data.routes || data.routes.length === 0) {
                            throw new Error('Sin ruta entre los puntos');
                        }
                        return data;
                    });
                })
                .then(function (data) {
                    console.log('[OSRM] ✅ Ruta obtenida desde', endpoint.name, '- puntos geometría:', data.routes[0].geometry.coordinates.length);
                    self.updateOSRMStatus(true, endpoint.name);
                    resolve(data);
                })
                .catch(function (err) {
                    clearTimeout(timeoutId);
                    var errType = err.name === 'AbortError' ? 'TIMEOUT (' + (TIMEOUT_MS / 1000) + 's)' : err.message;
                    console.error('[OSRM] ❌', endpoint.name, 'falló:', errType);
                    
                    // Notificar error de servidor directamente al usuario (solo si es el último fallback)
                    if (serverIndex >= OSRM_ENDPOINTS.length - 1) {
                         self.showNotification('Error calculando ruta: ' + errType + '. Se ha dibujado recta como fallback.', 'error');
                    }
                    
                    self.updateOSRMStatus(false, endpoint.name + ': ' + errType);
                    // Intentar siguiente servidor
                    tryServer(serverIndex + 1).then(resolve).catch(reject);
                });
        });
    }

    return new Promise(function (resolve, reject) {
        tryServer(0)
            .then(function (data) {
                try {
                    var route = data.routes[0];
                    var distanceKm = route.distance / 1000;

                    // Limpiar línea previa
                    if (self.routeLine) {
                        if (self.routeLine.eachLayer) self.routeLine.eachLayer(function (l) { l.remove(); });
                        self.map.removeLayer(self.routeLine);
                        self.routeLine = null;
                    }

                    var routeCoords = route.geometry.coordinates.map(function (coord) {
                        return [coord[1], coord[0]];
                    });

                    // --- Calcular velocidades por tramo usando segmentSpeeds con km ---
                    var speedSegsToApply = (segmentSpeeds && segmentSpeeds.length > 0)
                        ? segmentSpeeds
                        : [{ speed: avgSpeed, km: 0 }];

                    var totalTimeHours = 0;
                    var segmentDetails = [];

                    // Armar el plan de distancia total
                    var distRemaining = distanceKm;
                    var speedPlan = [];
                    for (var s = 0; s < speedSegsToApply.length; s++) {
                        var ss = speedSegsToApply[s];
                        var spd2 = ss.speed > 0 ? ss.speed : avgSpeed;
                        var km2 = ss.km > 0 ? Math.min(ss.km, distRemaining) : distRemaining;
                        // Se remueve la línea que estiraba forzosamente el último tramo
                        speedPlan.push({ speed: spd2, km: km2, color: self.getSegmentColor(spd2) });
                        distRemaining -= km2;
                        if (distRemaining <= 0.001) break; // margen de precisión
                    }
                    
                    // Si el usuario configuró tramos que NO cubren el 100% de la ruta, rellenar el resto con la velocidad general
                    if (distRemaining > 0.001) {
                        speedPlan.push({ speed: avgSpeed, km: distRemaining, color: self.getSegmentColor(avgSpeed) });
                        distRemaining = 0;
                    }

                    // Dibujar OSRM geometry coloreado con total precision por KM en ruta
                    var group = L.layerGroup();
                    var currentPlanIdx = 0;
                    var planDistConsumed = 0;
                    var currentPolylineCoords = [routeCoords[0]];
                    
                    var segmentDist = 0, segmentTime = 0, segmentFuel = 0, segmentCost = 0;

                for (var i = 0; i < routeCoords.length - 1; i++) {
                    var p1 = routeCoords[i];
                    var p2 = routeCoords[i + 1];
                    var d = self.haversineDistance(p1[0], p1[1], p2[0], p2[1]);
                    
                    var plan = speedPlan[currentPlanIdx];
                    
                    // Bucle para casos donde el segmento "d" cruza el límite de los kilómetros del plan actual
                    while (currentPlanIdx < speedPlan.length - 1 && (planDistConsumed + d) > plan.km) {
                        var remainder = plan.km - planDistConsumed; // distancia requerida para agotar el plan actual
                        var ratio = (d > 0) ? (remainder / d) : 0;
                        
                        // Encontrar punto intermedio exacto donde cambia el color
                        var midLat = p1[0] + (p2[0] - p1[0]) * ratio;
                        var midLng = p1[1] + (p2[1] - p1[1]) * ratio;
                        var midPoint = [midLat, midLng];
                        
                        currentPolylineCoords.push(midPoint);
                        
                        // Dibujar la línea completada del plan actual
                        L.polyline(currentPolylineCoords, {
                            color: plan.color, weight: 5, opacity: 0.9, lineCap: 'round'
                        }).addTo(group);
                        
                        // Sumar exactos al plan viejo y guardarlo
                        segmentDist += remainder;
                        segmentTime += remainder / plan.speed;
                        segmentFuel += remainder / fuelEfficiency;
                        segmentCost += (remainder / fuelEfficiency) * fuelPrice;
                        
                        segmentDetails.push({
                            index: currentPlanIdx + 1, distance: segmentDist, speed: plan.speed,
                            time: segmentTime, fuel: segmentFuel, cost: segmentCost, color: plan.color
                        });
                        
                        // Mover al siguiente plan
                        currentPlanIdx++;
                        plan = speedPlan[currentPlanIdx];
                        
                        // Reajustar variables para lo que queda de este segmento en el nuevo plan
                        p1 = midPoint;
                        d = d - remainder;
                        planDistConsumed = 0;
                        currentPolylineCoords = [midPoint];
                        
                        segmentDist = 0;
                        segmentTime = 0;
                        segmentFuel = 0;
                        segmentCost = 0;
                    }
                    
                    // La porción o total del segmento actual cabe holgadamente en el límite del plan actual 
                    currentPolylineCoords.push(p2);
                    planDistConsumed += d;
                    segmentDist += d;
                    segmentTime += d / plan.speed;
                    segmentFuel += d / fuelEfficiency;
                    segmentCost += (d / fuelEfficiency) * fuelPrice;
                }
                
                // Ultimo tramo no cerrado
                if (currentPolylineCoords.length > 1) {
                    var plan = speedPlan[currentPlanIdx];
                    L.polyline(currentPolylineCoords, {
                        color: plan.color, weight: 5, opacity: 0.9, lineCap: 'round'
                    }).addTo(group);
                    
                    segmentDetails.push({
                        index: currentPlanIdx + 1, distance: segmentDist, speed: plan.speed,
                        time: segmentTime, fuel: segmentFuel, cost: segmentCost, color: plan.color
                    });
                }

                // Sumar todos los tiempos recalculados exactamente
                for (var j = 0; j < segmentDetails.length; j++) {
                    totalTimeHours += segmentDetails[j].time;
                }

                group.addTo(self.map);
                self.routeLine = group;
                self.map.fitBounds(L.latLngBounds(routeCoords), { padding: [50, 50] });

                var trafficDelayHours = trafficDelay / 60;
                totalTimeHours += trafficDelayHours;
                var fuelConsumedDriving = distanceKm / fuelEfficiency;
                var fuelConsumedIdling  = trafficDelayHours * 1.0;
                var fuelConsumed = fuelConsumedDriving + fuelConsumedIdling;
                var totalCost = fuelConsumed * fuelPrice;
                var modeLabel = mode === 'urban' ? 'Calles urbanas (sentidos)' : 'Carretera';

                var routeData = {
                    id: Date.now(),
                    name: 'Ruta ' + (self.calculatedRoutes.length + 1),
                    distance: distanceKm,
                    fuelConsumed: fuelConsumed,
                    totalCost: totalCost,
                    estimatedTime: totalTimeHours,
                    fuelPrice: fuelPrice,
                    fuelEfficiency: fuelEfficiency,
                    points: JSON.parse(JSON.stringify(self.routePoints)),
                    mode: mode,
                    osrmGeometry: routeCoords,
                    segmentDetails: segmentDetails
                };

                self.calculatedRoutes.push(routeData);
                self.currentRouteData = routeData;
                self.updateRouteResults(routeData);
                self.updateSpeedLegend(speedSegsToApply, avgSpeed);
                self.showLoading(false);
                self.showNotification(modeLabel + ': ' + distanceKm.toFixed(2) + ' km', 'success');
                resolve(routeData);
            } catch (jsError) {
                console.error('[GEOMETRY ERROR]', jsError);
                self.showNotification('Error lógico de renderizado de la ruta: ' + jsError.message, 'error');
                resolve(self.calculateDirectRoute(fuelPrice, fuelEfficiency, avgSpeed, segmentSpeeds, trafficDelay));
            }
        })
            .catch(function (error) {
                console.error('[OSRM] Todos los servidores fallaron. Último error:', error.message);
                self.showLoading(false);
                if (error.message.indexOf('route between points') !== -1 || error.message.indexOf('Could not find a matching segment') !== -1) {
                    self.updateOSRMStatus(false, 'Ruta imposible (puntos sin calles)');
                    self.showNotification('Error de ubicación: No hay calles cercanas. Mostrando distancia directa.', 'error');
                } else {
                    self.updateOSRMStatus(false, 'Sin conexión a servidores de ruta');
                    self.showNotification('Sin acceso a OSRM. Calculando distancia directa.', 'error');
                }
                resolve(self.calculateDirectRoute(fuelPrice, fuelEfficiency, avgSpeed, segmentSpeeds, trafficDelay));
            });
    });
};


/**
 * Calcula distancia entre dos puntos usando fórmula Haversine
 */
FuelCostManager.prototype.haversineDistance = function (lat1, lon1, lat2, lon2) {
    var R = 6371; // Radio de la Tierra en km
    var dLat = this.toRad(lat2 - lat1);
    var dLon = this.toRad(lon2 - lon1);

    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

FuelCostManager.prototype.toRad = function (degrees) {
    return degrees * Math.PI / 180;
};

/**
 * Actualiza el panel de resultados
 */
FuelCostManager.prototype.updateRouteResults = function (routeData) {
    var resultsDiv = document.getElementById('route-results');
    if (!resultsDiv) return;

    // Tabla de detalle por tramo (si existe)
    var segDetail = '';
    if (routeData.segmentDetails && routeData.segmentDetails.length > 1) {
        var rows = routeData.segmentDetails.map(function (s) {
            var mins = (s.time * 60).toFixed(0);
            return `<tr>
                <td style="padding:2px 4px;">
                    <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${s.color};margin-right:3px;"></span>
                    Tramo ${s.index}
                </td>
                <td style="padding:2px 4px; text-align:right;">${s.distance.toFixed(2)} km</td>
                <td style="padding:2px 4px; text-align:right; color:${s.color};">${s.speed} km/h</td>
                <td style="padding:2px 4px; text-align:right;">${mins} min</td>
                <td style="padding:2px 4px; text-align:right; color:#ffaa00;">$${s.cost.toFixed(2)}</td>
            </tr>`;
        }).join('');
        segDetail = `
            <div style="margin-top:10px;">
                <div style="font-size:0.55rem; color:rgba(255,255,255,0.5); text-transform:uppercase; margin-bottom:4px;">Detalle por Tramo</div>
                <table style="width:100%; font-size:0.6rem; border-collapse:collapse;">
                    <thead><tr style="color:rgba(255,255,255,0.4);">
                        <th style="padding:2px 4px; text-align:left;">Seg.</th>
                        <th style="padding:2px 4px; text-align:right;">Dist.</th>
                        <th style="padding:2px 4px; text-align:right;">Vel.</th>
                        <th style="padding:2px 4px; text-align:right;">Tiempo</th>
                        <th style="padding:2px 4px; text-align:right;">Costo</th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>`;
    }

    var html = `
        <div style="font-size: 0.65rem; color: #fff;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px;">
                <div style="background: rgba(0,255,136,0.1); padding: 8px; border-radius: 6px; border: 1px solid rgba(0,255,136,0.3);">
                    <div style="color: #00ff88; font-size: 0.55rem; text-transform: uppercase;">Distancia</div>
                    <div style="font-size: 1.1rem; font-weight: 700; color: #fff;">${routeData.distance.toFixed(2)} km</div>
                </div>
                <div style="background: rgba(255,170,0,0.1); padding: 8px; border-radius: 6px; border: 1px solid rgba(255,170,0,0.3);">
                    <div style="color: #ffaa00; font-size: 0.55rem; text-transform: uppercase;">Costo Total</div>
                    <div style="font-size: 1.1rem; font-weight: 700; color: #fff;">$${routeData.totalCost.toFixed(2)}</div>
                </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                <div style="padding: 6px;">
                    <div style="color: rgba(255,255,255,0.6); font-size: 0.55rem;">Combustible</div>
                    <div style="color: #00ff88; font-weight: 600;">${routeData.fuelConsumed.toFixed(2)} L</div>
                </div>
                <div style="padding: 6px;">
                    <div style="color: rgba(255,255,255,0.6); font-size: 0.55rem;">Tiempo Est.</div>
                    <div style="color: #ffaa00; font-weight: 600;">${routeData.estimatedTime.toFixed(2)} h</div>
                </div>
            </div>
            ${segDetail}
            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(0,255,136,0.2);">
                <div style="display: flex; justify-content: space-between; font-size: 0.55rem;">
                    <span style="color: rgba(255,255,255,0.5);">Precio: $${routeData.fuelPrice.toFixed(2)}/L</span>
                    <span style="color: rgba(255,255,255,0.5);">Rendimiento: ${routeData.fuelEfficiency} km/L</span>
                </div>
            </div>
        </div>
    `;
    resultsDiv.innerHTML = html;
};

/**
 * Actualiza la leyenda de colores por velocidad en el panel
 */
FuelCostManager.prototype.updateSpeedLegend = function (speedSegs, avgSpeed) {
    var legend = document.getElementById('speed-color-legend');
    var items  = document.getElementById('speed-legend-items');
    if (!legend || !items) return;

    if (!speedSegs || speedSegs.length === 0) {
        legend.style.display = 'none';
        return;
    }

    var self = this;
    var html = speedSegs.map(function (s, i) {
        var spd = s.speed > 0 ? s.speed : avgSpeed;
        var color = self.getSegmentColor(spd);
        var kmTxt = s.km > 0 ? s.km + ' km' : 'resto';
        return `<div style="display:flex; align-items:center; gap:5px; font-size:0.6rem;">
            <span style="display:inline-block;width:16px;height:4px;border-radius:2px;background:${color};"></span>
            <span style="color:${color}; font-weight:600;">${spd} km/h</span>
            <span style="color:rgba(255,255,255,0.4);">→ ${kmTxt}</span>
        </div>`;
    }).join('');

    items.innerHTML = html;
    legend.style.display = 'block';
};

/**
 * Aplica preset de vehículo
 */
FuelCostManager.prototype.applyVehiclePreset = function () {
    var vehicleType = document.getElementById('vehicle-type').value;
    var efficiencyInput = document.getElementById('fuel-efficiency');

    var presets = {
        'custom': 12,
        'carro': 12,
        'suv': 10,
        'camioneta': 8,
        'moto': 35,
        'camion': 6
    };

    if (presets[vehicleType]) {
        efficiencyInput.value = presets[vehicleType];
    }
};

/**
 * Muestra notificación toast
 */
FuelCostManager.prototype.showNotification = function (message, type) {
    // Crear notificación si no existe
    var notification = document.getElementById('fuel-notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'fuel-notification';
        notification.style.cssText = `
            position: fixed;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%);
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 0.75rem;
            font-weight: 600;
            z-index: 10000;
            display: none;
            animation: slideUp 0.3s ease;
        `;
        document.body.appendChild(notification);
    }

    var colors = {
        'success': 'rgba(0, 255, 136, 0.9)',
        'error': 'rgba(255, 69, 0, 0.9)',
        'info': 'rgba(0, 229, 255, 0.9)'
    };

    notification.style.background = colors[type] || colors.info;
    notification.style.color = '#000';
    notification.style.boxShadow = '0 0 20px ' + colors[type];
    notification.textContent = message;
    notification.style.display = 'block';

    setTimeout(function () {
        notification.style.display = 'none';
    }, 3000);
};

/**
 * Muestra/oculta overlay de carga
 */
FuelCostManager.prototype.showLoading = function (show) {
    var loading = document.getElementById('loading-overlay');
    if (loading) {
        loading.style.display = show ? 'flex' : 'none';
        // Restaurar texto original al ocultar
        if (!show) {
            var span = loading.querySelector('span');
            if (span) span.textContent = 'COMPUTANDO DATOS GEOESPACIALES...';
        }
    }
};

/**
 * Actualiza el indicador visual de estado OSRM en el panel
 */
FuelCostManager.prototype.updateOSRMStatus = function (online, detail) {
    var dot  = document.getElementById('osrm-status-dot');
    var text = document.getElementById('osrm-status-text');
    if (!dot || !text) return;

    if (online) {
        dot.style.background  = '#00ff88';
        dot.style.boxShadow   = '0 0 6px #00ff88';
        text.textContent      = '✓ Servidor OK: ' + (detail || 'OSRM');
        text.style.color      = '#00ff88';
    } else {
        dot.style.background  = '#ff4500';
        dot.style.boxShadow   = '0 0 6px #ff4500';
        text.textContent      = '✗ ' + (detail || 'Sin servicio');
        text.style.color      = '#ff7755';
    }
};

/**
 * Verifica conectividad con OSRM al abrir el panel.
 * Hace un ping rápido con coordenadas fijas de prueba.
 */
FuelCostManager.prototype.checkOSRMStatus = function () {
    var self = this;
    var dot  = document.getElementById('osrm-status-dot');
    var text = document.getElementById('osrm-status-text');
    if (!dot || !text) return;

    // Estado: verificando
    dot.style.background = '#ffaa00';
    dot.style.boxShadow  = '0 0 6px #ffaa00';
    text.textContent     = '⟳ Verificando servidor...';
    text.style.color     = '#ffaa00';

    // Ping con 2 puntos en Santiago de Chile como prueba
    var testUrl = 'https://router.project-osrm.org/route/v1/driving/-70.6483,-33.4569;-70.6333,-33.4433?overview=false&steps=false';
    var ctrl    = new AbortController();
    var tid     = setTimeout(function () { ctrl.abort(); }, 8000);

    fetch(testUrl, { signal: ctrl.signal })
        .then(function (r) {
            clearTimeout(tid);
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
        })
        .then(function (data) {
            if (data.code === 'Ok') {
                self.updateOSRMStatus(true, 'router.project-osrm.org');
            } else {
                self.updateOSRMStatus(false, 'Respuesta inválida: ' + data.code);
            }
        })
        .catch(function (err) {
            clearTimeout(tid);
            var reason = err.name === 'AbortError' ? 'Timeout (8s)' : err.message;
            self.updateOSRMStatus(false, reason);
            console.warn('[OSRM] Ping fallido:', reason);
        });
};


/**
 * Obtiene todas las rutas calculadas para gráficos
 */
FuelCostManager.prototype.getCalculatedRoutes = function () {
    return this.calculatedRoutes;
};

/**
 * Exporta ruta actual para comparación
 */
FuelCostManager.prototype.exportRouteForComparison = function () {
    if (!this.currentRouteData) {
        this.showNotification('No hay ruta calculada para exportar', 'error');
        return null;
    }
    return this.currentRouteData;
};

// Hacer global
window.FuelCostManager = FuelCostManager;

// ================================================================
// UI: Gestión del constructor dinámico de tramos de velocidad
// ================================================================
var _segCounter = 0;

window.addSpeedSegment = function () {
    var list = document.getElementById('speed-segments-list');
    if (!list) return;

    _segCounter++;
    var id = 'seg-' + _segCounter;

    // Color inicial basado en velocidad por defecto 60
    var defaultSpeed = 60;
    var defaultColor = (window.fuelManager && window.fuelManager.getSegmentColor)
        ? window.fuelManager.getSegmentColor(defaultSpeed)
        : '#00ff88';

    var row = document.createElement('div');
    row.className = 'seg-row';
    row.id = id;
    row.innerHTML = `
        <span class="seg-color-dot" style="background:${defaultColor};"></span>
        <input type="number" class="seg-speed" value="${defaultSpeed}" min="1" max="300" step="1"
            title="Velocidad (km/h)"
            oninput="window._updateSegColor(this)">
        <span class="seg-label">km/h</span>
        <input type="number" class="seg-km" value="" min="0.1" step="0.1" placeholder="km"
            title="Kilómetros de este tramo (vacío = resto)">
        <span class="seg-label">km</span>
        <button class="seg-remove" onclick="window.removeSpeedSegment('${id}')" title="Eliminar tramo">
            <i class="bi bi-x"></i>
        </button>
    `;
    list.appendChild(row);
};

window.removeSpeedSegment = function (id) {
    var row = document.getElementById(id);
    if (row) row.remove();
};

// Actualiza el color del punto cuando cambia la velocidad en el input
window._updateSegColor = function (input) {
    var row = input.closest('.seg-row');
    if (!row) return;
    var dot = row.querySelector('.seg-color-dot');
    if (!dot) return;
    var speed = parseFloat(input.value) || 60;
    var color = (window.fuelManager && window.fuelManager.getSegmentColor)
        ? window.fuelManager.getSegmentColor(speed)
        : '#00ff88';
    dot.style.background = color;
    dot.style.boxShadow  = '0 0 5px ' + color;
};
