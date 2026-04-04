/**
 * main.js - Punto de entrada principal de SIG Pro
 */

var SIGPro = (function () {
    function SIGPro() {
        this.mapManager = null;
        this.statusBar = null;
        this.init();
    }

    SIGPro.prototype.init = function () {
        var self = this;
        console.log('🚀 Iniciando platform SIG Pro...');

        this.mapManager = new MapManager('map');

        // Configuración Status Bar base (Actualizada para UI Glassmorphism)
        this.statusBar = {
            updateCoordinates: function (coords) {
                var coordEl = document.getElementById('coordinates');
                if (coordEl) coordEl.innerHTML = '<i class="bi bi-crosshair me-2"></i>' + coords;
            },
            updateScale: function (scale) {
                var scaleEl = document.getElementById('scale');
                if (scaleEl) scaleEl.innerHTML = '<i class="bi bi-arrows-expand me-2"></i>' + scale;
            },
            updateLayerInfo: function (layers) { }, // Ignoramos porque ahora usamos layer-list
            updateAll: function (coords, scale, layers) {
                this.updateCoordinates(coords);
                this.updateScale(scale);
            }
        };

        window.sigPro = this;

        this.loadDefaultLayers().then(function () {
            console.log('✅ SIG Pro inicializado');
        }).catch(function (error) {
            console.error('❌ Error:', error);
        });
    };

    SIGPro.prototype.loadDefaultLayers = function () {
        var self = this;
        return new Promise(function (resolve) {
            var layers = [
                { name: 'Dark Matter', config: { type: 'tile', url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', maxZoom: 19 } },
                { name: 'Satellite', config: { type: 'tile', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', maxZoom: 19 } },
                { name: 'OSM', config: { type: 'tile', url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', maxZoom: 19 } },
                { name: 'Voyager', config: { type: 'tile', url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', maxZoom: 19 } },
                { name: 'Topographic', config: { type: 'tile', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', maxZoom: 19 } },
                { name: 'Positron', config: { type: 'tile', url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', maxZoom: 19 } }
            ];

            var loadNext = function (index) {
                if (index >= layers.length) {
                    self.mapManager.setLayer('Dark Matter');
                    resolve();
                    return;
                }
                var layer = layers[index];
                self.mapManager.addBaseLayer(layer.name, layer.config)
                    .then(function () { loadNext(index + 1); })
                    .catch(function () { loadNext(index + 1); });
            };
            loadNext(0);
        });
    };

    return SIGPro;
})();

document.addEventListener('DOMContentLoaded', function () {
    new SIGPro();
    window.initTheme();
});

// ============================================
// FUNCIONES GLOBALES - NAVEGACIÓN
// ============================================
window.zoomIn = function () { if (window.sigPro) window.sigPro.mapManager.map.zoomIn(); };
window.zoomOut = function () { if (window.sigPro) window.sigPro.mapManager.map.zoomOut(); };
window.zoomToExtent = function () { if (window.sigPro) window.sigPro.mapManager.zoomToExtent(); };
window.clearMap = function () {
    if (window.sigPro) window.sigPro.mapManager.setLayer('Dark Matter');
    window.currentFeatures = [];
    window.currentLayers.forEach(l => window.sigPro.mapManager.map.removeLayer(l.layer));
    window.currentLayers = [];
    if (window.currentRasterLayer && window.sigPro.mapManager.map.hasLayer(window.currentRasterLayer)) {
        window.sigPro.mapManager.map.removeLayer(window.currentRasterLayer);
    }
    window.currentRasterLayer = null;
    window.currentRasterFile = null;
    window.currentRasterName = null;
    document.getElementById('layer-list').innerHTML = '<div class="empty-state">Inyecta datos para comenzar</div>';
    console.log('Mapa limpiado');
};

window.searchZone = function () {
    var input = document.getElementById('zone-search-input');
    if (!input || !input.value.trim()) return;
    var query = input.value.trim();

    var btn = document.getElementById('zone-search-btn');
    if (btn) {
        btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true" style="width: 1rem; height: 1rem; border-width: 0.15em;"></span>';
    }

    var url = 'https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(query);

    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (btn) btn.innerHTML = '<i class="bi bi-search"></i>';
            if (data && data.length > 0) {
                var result = data[0];
                if (window.sigPro && window.sigPro.mapManager) {
                    var map = window.sigPro.mapManager.map;
                    if (result.boundingbox) {
                        var bbox = result.boundingbox;
                        map.fitBounds([
                            [parseFloat(bbox[0]), parseFloat(bbox[2])],
                            [parseFloat(bbox[1]), parseFloat(bbox[3])]
                        ], { duration: 1.5 });
                    } else {
                        map.flyTo([parseFloat(result.lat), parseFloat(result.lon)], 12, { duration: 1.5 });
                    }
                    console.log('📍 Zona encontrada:', result.display_name);
                }
            } else {
                alert('Zona no encontrada: ' + query);
            }
        })
        .catch(err => {
            if (btn) btn.innerHTML = '<i class="bi bi-search"></i>';
            console.error('Error al buscar la zona:', err);
            alert('Error geocodificando la zona.');
        });
};

// ============================================
// FUNCIONES GLOBALES - MAPAS BASE
// ============================================
window.addBaseLayer = function (layerName) {
    if (window.sigPro && window.sigPro.mapManager) {
        window.sigPro.mapManager.setLayer(layerName);
    }
};

// ============================================
// API DE INCENDIOS VIIRS
// ============================================
window.fireAPILayer = null;
window.fireAPIActive = false;

window.toggleFireAPI = function () {
    if (!window.sigPro || !window.sigPro.mapManager) {
        alert('El mapa no está inicializado aún.');
        return;
    }

    var map = window.sigPro.mapManager.map;
    var btn = document.getElementById('fire-api-toggle');

    if (window.fireAPIActive) {
        // Desactivar API
        if (window.fireAPILayer) {
            map.removeLayer(window.fireAPILayer);
            window.fireAPILayer = null;
        }
        window.fireAPIActive = false;
        if (btn) {
            btn.classList.remove('active');
            btn.title = 'API Incendios (Desactivada)';
        }
        console.log('🔥 API de Incendios DESACTIVADA');
    } else {
        // Activar API - Directamente desde la API de NASA FIRMS (CSV) sin servidor local
        var fireAPIUrl = 'https://firms.modaps.eosdis.nasa.gov/api/area/csv/5cda0cba8aabe3f4d4f5bde5947cf7e6/VIIRS_NOAA20_SP/world/3';

        console.log('🔥 Solicitando incendios directamente a NASA (Sin Backend)...');

        var loadingLayer = document.getElementById('loading-overlay');
        var loadingText = loadingLayer ? loadingLayer.querySelector('span') : null;
        if (loadingLayer && loadingText) {
            loadingText.textContent = 'SOLICITANDO DATOS A LA NASA...';
            loadingLayer.style.display = 'flex';
        }

        fetch(fireAPIUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error('CORS Error / NASA FIRMS rechazó la conexión.');
                }
                return response.text();
            })
            .then(csvText => {
                Papa.parse(csvText, {
                    header: true,
                    dynamicTyping: true,
                    skipEmptyLines: true,
                    complete: function (results) {
                        var geojson = { type: "FeatureCollection", features: [] };
                        results.data.forEach(function (row) {
                            var lat = row.latitude || row.lat;
                            var lon = row.longitude || row.lon;
                            if (lat !== undefined && lon !== undefined) {
                                geojson.features.push({
                                    type: "Feature",
                                    geometry: { type: "Point", coordinates: [lon, lat] },
                                    properties: row
                                });
                            }
                        });

                        if (loadingLayer) {
                            loadingLayer.style.display = 'none';
                            if (loadingText) loadingText.textContent = 'COMPUTANDO DATOS GEOESPACIALES...';
                        }

                        if (!geojson.features || geojson.features.length === 0) {
                            alert('La API de la NASA respondió pero no hay datos de incendios mundiales válidos en este momento.');
                            return;
                        }

                        console.log('🔥 Incendios encontrados:', geojson.features.length);

                        window.fireAPILayer = L.geoJSON(geojson, {
                            pointToLayer: function (feature, latlng) {
                                return L.circleMarker(latlng, {
                                    radius: 6,
                                    fillColor: '#ff4500',
                                    color: '#fff',
                                    weight: 1,
                                    opacity: 0.9,
                                    fillOpacity: 0.8
                                });
                            },
                            onEachFeature: function (feature, layer) {
                                var popupContent = '<div style="font-family: Outfit; font-size: 0.85rem;"><b>🔥 Incendio Detectado (NASA)</b><hr/>';
                                for (var key in feature.properties) {
                                    if (['latitude', 'longitude', 'scan', 'track'].indexOf(key.toLowerCase()) === -1) {
                                        popupContent += '<span style="color:#ff6600;">' + key + '</span>: ' + feature.properties[key] + '<br/>';
                                    }
                                }
                                popupContent += '</div>';
                                layer.bindPopup(popupContent);
                            }
                        }).addTo(map);

                        window.fireAPIActive = true;
                        if (btn) {
                            btn.classList.add('active');
                            btn.title = 'API Incendios NASA (Activada)';
                        }

                        if (geojson.features.length > 0) {
                            map.fitBounds(window.fireAPILayer.getBounds(), { padding: [50, 50] });
                        }
                    }
                });
            })
            .catch(err => {
                if (loadingLayer) {
                    loadingLayer.style.display = 'none';
                    if (loadingText) loadingText.textContent = 'COMPUTANDO DATOS GEOESPACIALES...';
                }
                console.error('❌ Error API Directa:', err);
                alert('No se pudo conectar a la API de la NASA directamente sin backend.\nMotivo probable: Bloqueo de CORS del navegador.\n\nDetalle técnico:\n' + err.message);
            });
    }
};

window.toggle3DView = function () { alert('Vista 3D en construcción'); };
window.cyberGlobeInitialized = false;
window.toggleCyberGlobe = function () {
    var modalDiv = document.getElementById('cyberGlobeModal');
    if (!modalDiv) return;

    modalDiv.addEventListener('shown.bs.modal', function () {
        if (!window.cyberGlobeInitialized) {
            window.initCyberGlobe();
            window.cyberGlobeInitialized = true;
        }
    }, { once: true });

    new bootstrap.Modal(modalDiv).show();
};

window.initCyberGlobe = function () {
    var container = document.getElementById('globeViz');
    var N = 50;
    var arcsData = [...Array(N).keys()].map(() => ({
        startLat: (Math.random() - 0.5) * 180, startLng: (Math.random() - 0.5) * 360,
        endLat: (Math.random() - 0.5) * 180, endLng: (Math.random() - 0.5) * 360,
        color: ['#0ff', '#f0f', '#0f0', '#fff'][Math.floor(Math.random() * 4)]
    }));

    window.globeInstance = Globe()(container)
        .width(container.clientWidth).height(container.clientHeight)
        .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-dark.jpg')
        .backgroundImageUrl('https://unpkg.com/three-globe/example/img/night-sky.png')
        .arcsData(arcsData).arcColor('color')
        .arcDashLength(() => Math.random())
        .arcDashGap(() => Math.random())
        .arcDashAnimateTime(() => Math.random() * 4000 + 500);

    window.globeInstance.controls().autoRotate = true;
    window.globeInstance.controls().autoRotateSpeed = 1.0;

    setTimeout(() => {
        var loading = document.getElementById('globeLoading');
        if (loading) loading.style.display = 'none';
        window.globeInstance.width(container.clientWidth).height(container.clientHeight);
    }, 500);

    window.addEventListener('resize', () => {
        window.globeInstance.width(container.clientWidth).height(container.clientHeight);
    });

    (function animate() {
        window.globeInstance.controls().update();
        requestAnimationFrame(animate);
    })();
};

// ============================================
// VITAL: SERVER HEALTH CONNECTION
// ============================================
function checkServerConnection() {
    fetch('http://127.0.0.1:8000/api/health/', { mode: 'no-cors' })
        .then(() => {
            var el = document.getElementById('connection-status');
            var txt = document.getElementById('connection-text');
            if (el && txt) {
                el.className = 'dot connected';
                txt.textContent = 'Conexión Estable';
            }
        }).catch(() => {
            var el = document.getElementById('connection-status');
            var txt = document.getElementById('connection-text');
            if (el) { el.className = 'dot disconnected'; txt.textContent = 'Server Local API Off'; }
        });
}
setInterval(checkServerConnection, 15000);
document.addEventListener('DOMContentLoaded', checkServerConnection);

// ============================================
// THEME Y ESTÉTICA
// ============================================
window.toggleTheme = function () {
    var html = document.documentElement;
    var newTheme = html.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme-preference', newTheme);
};

window.initTheme = function () {
    document.documentElement.setAttribute('data-theme', 'dark'); // Force dark premium for GIS
};

// ============================================
// FUNCIONALIDADES MODERNAS: CAPAS Y DATOS MÓDULO
// ============================================
window.currentLayers = [];
window.currentFeatures = [];

window.addLayer = function () {
    document.getElementById('file-upload-input').click();
};

window.handleFileUpload = function (event) {
    var file = event.target.files[0];
    if (!file) return;

    var ext = file.name.split('.').pop().toLowerCase();
    var reader = new FileReader();

    var loadingLayer = document.getElementById('loading-overlay');
    if (loadingLayer) loadingLayer.style.display = 'flex';

    var finishLoading = function () {
        if (loadingLayer) loadingLayer.style.display = 'none';
        event.target.value = '';
    };

    if (ext === 'zip' || ext === 'shp') {
        reader.onload = function (e) {
            var arrayBuffer = e.target.result;

            console.log('=== Cargando Shapefile ===');
            console.log('Archivo:', file.name);
            console.log('Tamaño:', arrayBuffer.byteLength, 'bytes');
            console.log('Tipo:', ext);

            // Verificar que shpjs esté disponible
            if (typeof shp === 'undefined') {
                console.error('shpjs no está cargado');
                alert('Error: La librería shpjs no se cargó correctamente. Recarga la página.');
                finishLoading();
                return;
            }

            console.log('shpjs disponible:', typeof shp);

            // shpjs analiza el buffer y convierte a GeoJSON
            // Soporta: WGS84, UTM, State Plane, y cualquier sistema en el .prj
            shp(arrayBuffer).then(function (geojson) {
                console.log('✅ Shapefile parseado exitosamente');
                console.log('GeoJSON result:', geojson);

                if (!geojson) {
                    alert("El shapefile no retornó datos. Verifica que el archivo .zip contenga .shp, .dbf y .shx");
                    finishLoading();
                    return;
                }

                // Manejar array de FeatureCollections (múltiples capas)
                if (Array.isArray(geojson)) {
                    console.log('📁 Múltiples capas encontradas:', geojson.length);
                    geojson.forEach(function (gj, idx) {
                        if (!gj.fileName) {
                            gj.fileName = file.name + (geojson.length > 1 ? '_' + idx : '');
                        }
                    });
                } else if (geojson.type === 'FeatureCollection') {
                    console.log('📄 FeatureCollection con', geojson.features ? geojson.features.length : 0, 'características');
                } else if (geojson.type === 'Feature') {
                    console.log('📍 Feature individual');
                    geojson = { type: 'FeatureCollection', features: [geojson] };
                }

                window.addGeoJsonLayer(geojson, file.name);
                finishLoading();
            }).catch(function (err) {
                console.error('❌ Error cargando shapefile:', err);
                console.error('Stack:', err.stack);

                var errorMsg = 'Error cargando el shapefile.\n\n';

                // Verificar errores comunes
                if (err.message) {
                    if (err.message.includes('not a zip') || err.message.includes('zip')) {
                        errorMsg += 'El archivo no es un ZIP válido o está corrupto.\n';
                    } else if (err.message.includes('missing') || err.message.includes('required')) {
                        errorMsg += 'Faltan archivos requeridos.\nEl ZIP debe contener: .shp, .dbf y .shx\n';
                    } else if (err.message.includes('invalid')) {
                        errorMsg += 'El shapefile tiene un formato inválido.\n';
                    } else {
                        errorMsg += 'Error: ' + err.message + '\n';
                    }
                }

                errorMsg += '\n💡 Asegúrate de que el .zip contenga los archivos .shp, .dbf y .shx en la raíz (no en carpetas).';

                alert(errorMsg);
                finishLoading();
            });
        };
        reader.onerror = function () {
            console.error('❌ Error leyendo el archivo');
            alert('Error leyendo el archivo. Verifica que no esté corrupto.');
            finishLoading();
        };
        reader.readAsArrayBuffer(file);
    } else if (ext === 'json' || ext === 'geojson') {
        reader.onload = function (e) {
            try {
                var geojson = JSON.parse(e.target.result);
                window.addGeoJsonLayer(geojson, file.name);
            } catch (err) {
                console.error(err);
                alert("GeoJSON corrupto.");
            }
            finishLoading();
        };
        reader.readAsText(file);
    } else if (ext === 'csv') {
        Papa.parse(file, {
            header: true,
            dynamicTyping: true,
            complete: function (results) {
                var geojson = { type: "FeatureCollection", features: [] };
                results.data.forEach(function (row) {
                    var lat = row.lat || row.latitude || row.Lat || row.Y || row.y;
                    var lon = row.lon || row.longitude || row.Lng || row.X || row.x || row.lng;
                    if (lat !== undefined && lon !== undefined) {
                        geojson.features.push({
                            type: "Feature",
                            geometry: { type: "Point", coordinates: [lon, lat] },
                            properties: row
                        });
                    }
                });

                if (geojson.features.length > 0) {
                    window.addGeoJsonLayer(geojson, file.name);
                } else {
                    alert("No existen ejes cardinales válidos (lat/Y, lon/X) en CSV.");
                }
                finishLoading();
            }
        });
    } else {
        alert("Matriz de datos no tolerada (Usa .shp.zip, geojson o csv).");
        finishLoading();
    }
};

window.addGeoJsonLayer = function (geojson, name) {
    if (!window.sigPro || !window.sigPro.mapManager) return;
    var map = window.sigPro.mapManager.map;

    if (Array.isArray(geojson)) {
        geojson.forEach(function (gj) {
            window.addGeoJsonLayer(gj, gj.fileName || name);
        });
        return;
    }

    // Validar y normalizar el GeoJSON
    if (!geojson.type) {
        console.warn('GeoJSON sin tipo definido, se asume FeatureCollection');
        geojson = { type: 'FeatureCollection', features: geojson.features || [geojson] };
    }

    // Asegurar que sea FeatureCollection
    if (geojson.type !== 'FeatureCollection') {
        geojson = { type: 'FeatureCollection', features: [geojson] };
    }

    // Validar y reproyectar coordenadas si están fuera de rango WGS84
    // (detección básica de coordenadas proyectadas en metros)
    var hasProjectedCoords = false;
    geojson.features.forEach(function (f) {
        if (f.geometry && f.geometry.coordinates) {
            var coords = f.geometry.coordinates;
            // Check para Point
            if (f.geometry.type === 'Point') {
                if (Math.abs(coords[0]) > 180 || Math.abs(coords[1]) > 90) {
                    hasProjectedCoords = true;
                }
            }
            // Check para Polygon/LineString (array anidado)
            else if (Array.isArray(coords[0])) {
                var flatCoords = coords.flat(Infinity);
                if (flatCoords.length >= 2 && (Math.abs(flatCoords[0]) > 180 || Math.abs(flatCoords[1]) > 90)) {
                    hasProjectedCoords = true;
                }
            }
        }
    });

    if (hasProjectedCoords) {
        console.warn('El shapefile parece tener coordenadas proyectadas (no WGS84). shpjs debería haberlo reproyectado automáticamente.');
    }

    if (geojson.features) {
        window.currentFeatures = window.currentFeatures.concat(geojson.features);
    }

    var baseColors = ['#00f0ff', '#ff00ff', '#3b82f6', '#22c55e', '#f59e0b'];
    var color = baseColors[Math.floor(Math.random() * baseColors.length)];

    var layer = L.geoJSON(geojson, {
        style: function (feature) {
            return {
                color: color,
                weight: 2,
                fillColor: color,
                fillOpacity: 0.3
            };
        },
        pointToLayer: function (feature, latlng) {
            return L.circleMarker(latlng, {
                radius: 6,
                fillColor: color,
                color: "#fff",
                weight: 1,
                opacity: 0.9,
                fillOpacity: 0.8
            });
        },
        onEachFeature: function (feature, layer) {
            if (feature.properties) {
                var popupContent = "<div style='font-family: Outfit; font-size: 0.85rem; max-height: 200px; overflow-y: auto;'><b>[ DATOS GEO-ESPACIALES ]</b><br/>";
                for (var key in feature.properties) {
                    popupContent += "<span style='color:#0ff;'>" + key + "</span>: " + feature.properties[key] + "<br/>";
                }
                popupContent += "</div>";
                layer.bindPopup(popupContent);
            }
        }
    }).addTo(map);

    window.currentLayers.push({ name: name, layer: layer, isRaster: false, geojson: geojson });

    // Ajustar zoom a la extensión de la capa
    try {
        map.fitBounds(layer.getBounds());
    } catch (e) {
        console.warn('No se pudo ajustar el zoom automáticamente:', e);
    }

    // UI Actualización Lateral
    var layerList = document.getElementById('layer-list');
    if (layerList) {
        var emptySt = layerList.querySelector('.empty-state');
        if (emptySt) emptySt.remove();

        var item = document.createElement('div');
        item.className = 'layer-item';
        item.setAttribute('data-vector', 'true');
        item.setAttribute('draggable', 'true');
        item.style.display = 'flex';
        item.style.alignItems = 'center';
        item.style.gap = '10px';
        item.innerHTML = `
            <i class="bi bi-stack" style="color: #0ff;"></i>
            <span style="flex-grow:1; text-overflow:ellipsis; overflow:hidden; white-space:nowrap; cursor: grab;">${name}</span>
            <i class="bi bi-palette" style="cursor:pointer; color: #f0f;" onclick="window.openColorManagerVector()" title="Modificar Estilo Vectorial"></i>
            <i class="bi bi-trash" style="cursor:pointer; color: #ff4444;" onclick="window.removeLayer('${name.replace(/'/g, "\\'")}')" title="Eliminar Capa"></i>
        `;

        // Agregar eventos de drag & drop
        item.addEventListener('dragstart', window.handleLayerDragStart);
        item.addEventListener('dragover', window.handleLayerDragOver);
        item.addEventListener('drop', window.handleLayerDrop);
        item.addEventListener('dragend', window.handleLayerDragEnd);
        item.addEventListener('dragenter', window.handleLayerDragEnter);
        item.addEventListener('dragleave', window.handleLayerDragLeave);

        layerList.appendChild(item);
    }
};

window.openAttributeTable = function () {
    if (!window.currentFeatures || window.currentFeatures.length === 0) {
        alert('Data Lake vacío. Importa geometrías o CSVs primero.');
        return;
    }

    var columns = [];
    var data = window.currentFeatures.map(function (f, idx) {
        return Object.assign({ id: idx }, f.properties);
    });

    if (data.length > 0) {
        Object.keys(data[0]).forEach(function (key) {
            columns.push({
                title: key.toUpperCase(),
                field: key,
                editor: "input",
                headerFilter: "input"
            });
        });
    }

    if (window.attributeTable) {
        window.attributeTable.destroy();
    }

    window.attributeTable = new Tabulator("#attribute-table", {
        data: data,
        columns: columns,
        layout: "fitColumns",
        responsiveLayout: "collapse",
        pagination: "local",
        paginationSize: 15,
        theme: "bootstrap",
        dataEdited: function (data) {
            console.log("Datos de celda recalibrados:", data);
        }
    });

    new bootstrap.Modal(document.getElementById('attributeTableModal')).show();
};

window.exportTableCSV = function () {
    if (window.attributeTable) {
        window.attributeTable.download("csv", "exportacion_sig_pro.csv");
    }
};

window.generateChartFromData = function () {
    var modalTable = bootstrap.Modal.getInstance(document.getElementById('attributeTableModal'));
    if (modalTable) modalTable.hide();

    if (!window.currentFeatures || window.currentFeatures.length === 0) return;

    var keys = Object.keys(window.currentFeatures[0].properties);
    var xAxis = document.getElementById('chart-xAxis');
    var yAxis = document.getElementById('chart-yAxis');

    xAxis.innerHTML = '';
    yAxis.innerHTML = '';

    keys.forEach(function (k) {
        xAxis.innerHTML += '<option value="' + k + '">' + k + '</option>';
        yAxis.innerHTML += '<option value="' + k + '">' + k + '</option>';
    });

    new bootstrap.Modal(document.getElementById('chartModal')).show();
};

window.currentChart = null;

window.renderChart = function () {
    if (!window.currentFeatures || window.currentFeatures.length === 0) return;

    var type = document.getElementById('chart-type').value;
    var xKey = document.getElementById('chart-xAxis').value;
    var yKey = document.getElementById('chart-yAxis').value;

    var labels = [];
    var dataVals = [];
    var grouped = {};

    window.currentFeatures.forEach(function (f) {
        var x = f.properties[xKey] || 'N/A';
        var y = parseFloat(f.properties[yKey]);
        if (isNaN(y)) y = 1;

        if (!grouped[x]) grouped[x] = 0;
        grouped[x] += y;
    });

    var groupKeys = Object.keys(grouped).slice(0, 50);
    groupKeys.forEach(function (k) {
        labels.push(k);
        dataVals.push(grouped[k]);
    });

    var ctx = document.getElementById('dataChart').getContext('2d');
    if (window.currentChart) {
        window.currentChart.destroy();
    }

    Chart.defaults.color = 'white';
    Chart.defaults.font.family = 'Inter';
    window.currentChart = new Chart(ctx, {
        type: type,
        data: {
            labels: labels,
            datasets: [{
                label: 'Correlación: ' + yKey + ' vs ' + xKey,
                data: dataVals,
                backgroundColor: [
                    'rgba(0, 240, 255, 0.6)',
                    'rgba(255, 0, 255, 0.6)',
                    'rgba(59, 130, 246, 0.6)',
                    'rgba(34, 197, 94, 0.6)',
                    'rgba(245, 158, 11, 0.6)'
                ],
                borderColor: '#ffffff',
                borderWidth: 1
            }]
        },
        options: {
            maintainAspectRatio: false,
            scales: {
                x: { ticks: { color: 'rgba(255,255,255,0.7)' }, grid: { color: 'rgba(255,255,255,0.1)' } },
                y: { beginAtZero: true, ticks: { color: 'rgba(255,255,255,0.7)' }, grid: { color: 'rgba(255,255,255,0.1)' } }
            },
            plugins: {
                legend: { labels: { color: '#0ff', font: { family: 'Outfit', size: 14 } } }
            }
        }
    });
};

// ============================================
// FUNCIONALIDADES MODERNAS: RASTER Y GEOTIFF
// ============================================
window.currentRasterLayer = null;
window.currentRasterFile = null;
window.currentRasterName = null;

window.addRasterLayer = function () {
    document.getElementById('raster-upload-input').click();
};

window.handleRasterUpload = function (event) {
    var file = event.target.files[0];
    if (!file) return;

    var loadingLayer = document.getElementById('loading-overlay');
    var loadingText = loadingLayer ? loadingLayer.querySelector('span') : null;
    if (loadingLayer && loadingText) {
        loadingText.textContent = 'PROCESANDO GEO-RASTER...';
        loadingLayer.style.display = 'flex';
    }

    var fileReader = new FileReader();
    fileReader.onload = function (e) {
        var arrayBuffer = e.target.result;

        // Verificar que las librerías raster estén cargadas
        if (typeof parseGeoraster === 'undefined') {
            alert('ALERTA: La librería georaster no está disponible. Verifica tu conexión a Internet y recarga la página.');
            if (loadingLayer && loadingText) {
                loadingLayer.style.display = 'none';
                loadingText.textContent = 'COMPUTANDO DATOS GEOESPACIALES...';
            }
            return;
        }
        if (typeof GeoRasterLayer === 'undefined') {
            alert('ALERTA: La librería GeoRasterLayer no está disponible. Verifica tu conexión a Internet y recarga la página.');
            if (loadingLayer && loadingText) {
                loadingLayer.style.display = 'none';
                loadingText.textContent = 'COMPUTANDO DATOS GEOESPACIALES...';
            }
            return;
        }

        // georaster library parsea el buffer y su sistema de coordenadas
        parseGeoraster(arrayBuffer).then(function (georaster) {
            window.currentRasterFile = georaster;
            window.currentRasterName = file.name;

            // Diagnóstico de consola para debugging
            console.log('=== GeoTIFF Parseado Correctamente ===');
            console.log('Archivo:', file.name);
            console.log('Bandas (numberOfRasters):', georaster.numberOfRasters);
            console.log('CRS (EPSG):', georaster.projection);
            console.log('Dimensiones:', georaster.width, 'x', georaster.height);
            console.log('NoData valor:', georaster.noDataValue);
            console.log('Mínimos por banda:', georaster.mins);
            console.log('Máximos por banda:', georaster.maxs);
            console.log('Bounding Box:', georaster.xmin, georaster.ymin, georaster.xmax, georaster.ymax);

            var epsgCode = georaster.projection;

            // Función de ayuda para continuar el renderizado
            var continueRender = function () {
                // Poblar los selectores de banda antes del primer render
                window.populateBandSelectors(georaster);

                // El primer render usará los valores que poblaron los selectores en populateBandSelectors
                window.applyAdvancedStyle();

                if (loadingLayer && loadingText) {
                    loadingLayer.style.display = 'none';
                    loadingText.textContent = 'COMPUTANDO DATOS GEOESPACIALES...';
                }
                if (event.target) event.target.value = '';
            };

            // Detectar y cargar CRS remotamente si es uno distinto a los base (ej: UTM locales)
            if (epsgCode && epsgCode !== 4326 && epsgCode !== 3857 && epsgCode !== 900913) {
                var epsgString = 'EPSG:' + epsgCode;
                // Si la librería proj4 existe y no confiere definición, ir a epsg.io
                if (typeof proj4 !== 'undefined' && !proj4.defs(epsgString)) {
                    if (loadingText) loadingText.textContent = 'AUTO-CONFIGURANDO CRS (EPSG:' + epsgCode + ')...';
                    fetch('https://epsg.io/' + epsgCode + '.proj4')
                        .then(response => {
                            if (!response.ok) throw new Error('Network CRS Error');
                            return response.text();
                        })
                        .then(proj4def => {
                            console.log('✅ CRS Dinámico Obtenido:', epsgString, proj4def);
                            proj4.defs(epsgString, proj4def);
                            continueRender();
                        })
                        .catch(err => {
                            console.warn('ALERTA: Falla al obtener string proj4 desde epsg.io. El Raster podría renderizar desfasado.', err);
                            continueRender();
                        });
                } else {
                    continueRender();
                }
            } else {
                continueRender();
            }

        }).catch(function (err) {
            console.error('ALERTA: Error parseando raster:', err);
            // Error diferenciado según tipo de fallo
            var msg = 'Error al procesar el GeoTIFF.\n\n';
            if (err && err.message) {
                if (err.message.toLowerCase().includes('offset') || err.message.toLowerCase().includes('byte')) {
                    msg += '\u2022 El archivo puede estar incompleto o es un formato TIFF no estándar.';
                } else if (err.message.toLowerCase().includes('worker')) {
                    msg += '\u2022 Error interno de librería. Recarga la página e inténtalo de nuevo.';
                } else if (err.message.toLowerCase().includes('network') || err.message.toLowerCase().includes('fetch')) {
                    msg += '\u2022 Error de red al cargar recursos auxiliares. Verifica conexión a Internet.';
                } else {
                    msg += '\u2022 ' + err.message;
                }
            }
            msg += '\n\nFormatos soportados: GeoTIFF (.tif, .tiff, .geotiff) con cualquier CRS (WGS84, UTM, Magna Sirgas, etc.)';
            alert(msg);
            if (loadingLayer && loadingText) {
                loadingLayer.style.display = 'none';
                loadingText.textContent = 'COMPUTANDO DATOS GEOESPACIALES...';
            }
        });
    };
    fileReader.readAsArrayBuffer(file);
};

// ============================================
// DRAG & DROP PARA CAPAS (LAYER REORDERING)
// ============================================
window.draggedLayer = null;

window.handleLayerDragStart = function (e) {
    window.draggedLayer = this;
    this.classList.add('layer-item-dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
    // Hacer el arrastre más transparente
    this.style.opacity = '0.4';
};

window.handleLayerDragOver = function (e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
};

window.handleLayerDrop = function (e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }

    // Si el elemento arrastrado es diferente al destino
    if (window.draggedLayer !== this) {
        // Obtener todos los items de la lista
        var layerList = document.getElementById('layer-list');
        var items = Array.from(layerList.querySelectorAll('.layer-item'));

        // Encontrar índices
        var draggedIndex = items.indexOf(window.draggedLayer);
        var targetIndex = items.indexOf(this);

        // Mover el elemento en el DOM
        if (draggedIndex < targetIndex) {
            this.parentNode.insertBefore(window.draggedLayer, this.nextSibling);
        } else {
            this.parentNode.insertBefore(window.draggedLayer, this);
        }

        // Reordenar también el array currentLayers para mantener sincronía
        // Buscar las capas correspondientes en el array
        var draggedName = window.draggedLayer.querySelector('span').textContent;
        var targetName = this.querySelector('span').textContent;

        var draggedLayerData = null;
        var targetLayerData = null;

        window.currentLayers.forEach(function (layer, idx) {
            if (layer.name === draggedName) draggedLayerData = { data: layer, index: idx };
            if (layer.name === targetName) targetLayerData = { data: layer, index: idx };
        });

        if (draggedLayerData && targetLayerData) {
            // Remover la capa arrastrada de su posición original
            window.currentLayers.splice(draggedLayerData.index, 1);
            // Insertar en la nueva posición
            window.currentLayers.splice(targetLayerData.index, 0, draggedLayerData.data);
        }
    }

    return false;
};

window.handleLayerDragEnd = function (e) {
    this.style.opacity = '1';
    this.classList.remove('layer-item-dragging');
    window.draggedLayer = null;

    // Limpiar clases de drop-target
    var items = document.querySelectorAll('.layer-item');
    items.forEach(function (item) {
        item.classList.remove('layer-item-drop-target');
    });
};

window.handleLayerDragEnter = function (e) {
    if (this !== window.draggedLayer) {
        this.classList.add('layer-item-drop-target');
    }
};

window.handleLayerDragLeave = function (e) {
    this.classList.remove('layer-item-drop-target');
};

// ============================================
// ELIMINAR CAPA INDIVIDUAL
// ============================================
window.removeLayer = function (layerName) {
    if (!confirm('¿Eliminar capa: ' + layerName + '?')) return;

    // Buscar la capa en el array
    var layerIndex = -1;
    window.currentLayers.forEach(function (layer, idx) {
        if (layer.name === layerName) {
            layerIndex = idx;
        }
    });

    if (layerIndex === -1) {
        console.warn('Capa no encontrada:', layerName);
        return;
    }

    var layerData = window.currentLayers[layerIndex];

    // Remover del mapa
    if (layerData.layer) {
        window.sigPro.mapManager.map.removeLayer(layerData.layer);
    }

    // Si es raster, limpiar referencia global
    if (layerData.isRaster) {
        window.currentRasterLayer = null;
        window.currentRasterFile = null;
        window.currentRasterName = null;

        // Resetear panel de color manager
        var noRaster = document.getElementById('no-raster-selected');
        var rasterCtrls = document.getElementById('raster-controls');
        if (noRaster) noRaster.style.display = 'block';
        if (rasterCtrls) rasterCtrls.style.display = 'none';
    }

    // Remover del array
    window.currentLayers.splice(layerIndex, 1);

    // Remover del DOM
    var layerList = document.getElementById('layer-list');
    if (layerList) {
        var items = layerList.querySelectorAll('.layer-item');
        items.forEach(function (item) {
            var span = item.querySelector('span');
            if (span && span.textContent === layerName) {
                item.remove();
            }
        });

        // Mostrar empty state si no hay capas
        if (window.currentLayers.length === 0) {
            layerList.innerHTML = '<div class="empty-state">Inyecta datos para comenzar</div>';
        }
    }

    console.log('Capa eliminada:', layerName);
};

// ============================================
// GESTOR DE COLOR AVANZADO (LÓGICA)
// ============================================
window.toggleColorManager = function () {
    var panel = document.getElementById('color-manager-panel');
    if (!panel) return;
    panel.classList.toggle('open');
    if (panel.classList.contains('open')) {
        window.updateColorManagerTab();
    }
};

window.openColorManagerVector = function () {
    var modeSelect = document.getElementById('color-manager-mode');
    if (modeSelect) modeSelect.value = 'vector';
    var panel = document.getElementById('color-manager-panel');
    if (panel && !panel.classList.contains('open')) panel.classList.add('open');
    window.updateColorManagerTab();
};

window.openColorManagerRaster = function () {
    var modeSelect = document.getElementById('color-manager-mode');
    if (modeSelect) modeSelect.value = 'raster';
    var panel = document.getElementById('color-manager-panel');
    if (panel && !panel.classList.contains('open')) panel.classList.add('open');
    window.updateColorManagerTab();
};

window.updateColorManagerTab = function () {
    var modeSelect = document.getElementById('color-manager-mode');
    if (!modeSelect) return;
    var mode = modeSelect.value;

    var tabRaster = document.getElementById('color-tab-raster');
    var tabVector = document.getElementById('color-tab-vector');

    if (tabRaster) tabRaster.style.display = mode === 'raster' ? 'block' : 'none';
    if (tabVector) tabVector.style.display = mode === 'vector' ? 'block' : 'none';

    if (mode === 'vector') {
        window.populateVectorColorManager();
    }
};

window.populateVectorColorManager = function () {
    var select = document.getElementById('vector-layer-selector');
    var noVec = document.getElementById('no-vector-selected');
    var vecCtrls = document.getElementById('vector-controls');

    var vectorLayers = window.currentLayers.filter(l => !l.isRaster);

    if (vectorLayers.length === 0) {
        if (noVec) noVec.style.display = 'block';
        if (vecCtrls) vecCtrls.style.display = 'none';
        return;
    }

    if (noVec) noVec.style.display = 'none';
    if (vecCtrls) vecCtrls.style.display = 'block';

    var oldSelection = select.value;
    select.innerHTML = '';

    vectorLayers.forEach((l, idx) => {
        var opt = document.createElement('option');
        opt.value = idx;
        opt.textContent = l.name;
        select.appendChild(opt);
    });

    if (oldSelection && select.querySelector(`option[value="${oldSelection}"]`)) {
        select.value = oldSelection;
    }

    window.updateVectorAttributesSelector();
};

window.updateVectorAttributesSelector = function () {
    var selectLyrIdx = document.getElementById('vector-layer-selector').value;
    var vectorLayers = window.currentLayers.filter(l => !l.isRaster);
    var layerData = vectorLayers[selectLyrIdx];

    if (!layerData) return;

    var attrSel = document.getElementById('vector-attribute-selector');
    attrSel.innerHTML = '<option value="">Color Único (Sin clasificar)</option>';

    var sampleFeature = null;
    var leafletLayer = layerData.layer;
    if (leafletLayer.getLayers && leafletLayer.getLayers().length > 0) {
        sampleFeature = leafletLayer.getLayers()[0].feature;
    } else if (layerData.geojson && layerData.geojson.features && layerData.geojson.features.length > 0) {
        sampleFeature = layerData.geojson.features[0];
    }

    if (sampleFeature && sampleFeature.properties) {
        Object.keys(sampleFeature.properties).forEach(k => {
            var opt = document.createElement('option');
            opt.value = k;
            opt.textContent = k;
            attrSel.appendChild(opt);
        });
    }

    window.applyVectorStyle();
};

window.applyVectorStyle = function () {
    var selectLyrIdx = document.getElementById('vector-layer-selector').value;
    var vectorLayers = window.currentLayers.filter(l => !l.isRaster);
    var layerData = vectorLayers[selectLyrIdx];

    if (!layerData) return;

    var field = document.getElementById('vector-attribute-selector').value;
    var rampType = document.getElementById('vector-color-ramp').value;
    var opacityVal = document.getElementById('vector-opacity').value;
    var invertRamp = document.getElementById('vector-invert-ramp')?.checked || false;
    
    var opacity = parseInt(opacityVal) / 100;
    var leafletLayer = layerData.layer;

    if (!field) {
        var defaultColor = '#00f0ff';
        if (leafletLayer.getLayers) {
            leafletLayer.getLayers().forEach(l => l.setStyle({ color: defaultColor, fillColor: defaultColor, fillOpacity: opacity }));
        }
        return;
    }

    var uniqueValues = new Set();
    leafletLayer.getLayers().forEach(l => { if(l.feature && l.feature.properties[field]) uniqueValues.add(l.feature.properties[field]); });
    var valuesArray = Array.from(uniqueValues).sort();
    
    // ALERTA: Aseguramos rango de dominio [0, 1] incluso si hay un solo valor para evitar crash en chroma
    var domainEnd = Math.max(1, valuesArray.length - 1);
    
    // Reparación de rampas: asegurarse de que el nombre sea válido para Chroma
    // Algunos nombres vienen con Mayúsculas desde la UI
    var validRamp = rampType;
    if (['Set1', 'Set2', 'Set3', 'Paired', 'Dark2', 'Spectral'].includes(rampType)) {
        // Chroma soporta estos nombres directamente
    } else {
        validRamp = rampType.toLowerCase();
    }

    var colors = chroma.scale(validRamp).colors(Math.max(2, valuesArray.length));
    if (invertRamp) colors.reverse();
    
    var colorScale = chroma.scale(colors).domain([0, domainEnd]);

    leafletLayer.getLayers().forEach(l => {
        if (l.feature && l.feature.properties[field]) {
            var val = l.feature.properties[field];
            var idx = valuesArray.indexOf(val);
            var itemColor = colorScale(idx).hex();
            l.setStyle({ color: itemColor, fillColor: itemColor, fillOpacity: opacity });
        }
    });

    // ALERTA: Sincronizar automáticamente con el motor 3D si está activo
    if (window.Mode3DController && window.Mode3DController.isActive) {
        window.render3DExtrusion();
    }
};

window.setVectorRamp = function (value, label) {
    var hiddenInput = document.getElementById('vector-color-ramp');
    if (hiddenInput) hiddenInput.value = value;
    var lbl = document.getElementById('vector-ramp-label');
    if (lbl) lbl.innerText = label;
    var preview = document.getElementById('vector-ramp-preview');
    if (preview) preview.className = 'color-ramp-preview ms-2 ramp-' + value;
    window.applyVectorStyle();
};

window.setRasterRamp = function (value, label) {
    var hiddenInput = document.getElementById('color-ramp-selector');
    if (hiddenInput) hiddenInput.value = value;
    var lbl = document.getElementById('raster-ramp-label');
    if (lbl) lbl.innerText = label;
    var cssVal = value === 'spectral' ? 'Spectral' : value;
    var preview = document.getElementById('raster-ramp-preview');
    if (preview) preview.className = 'color-ramp-preview ms-2 ramp-' + cssVal;
    window.applyAdvancedStyle();
};

window.updateRasterControlsDisplay = function () {
    var mode = document.getElementById('raster-mode').value;
    var singleCtrl = document.getElementById('single-band-controls');
    var rgbCtrl = document.getElementById('rgb-band-controls');

    if (mode === 'single') {
        singleCtrl.style.display = 'block';
        rgbCtrl.style.display = 'none';
    } else {
        singleCtrl.style.display = 'none';
        rgbCtrl.style.display = 'block';
    }
    window.applyAdvancedStyle();
};

window.populateBandSelectors = function (georaster) {
    var single = document.getElementById('single-band-selector');
    var r = document.getElementById('r-band-selector');
    var g = document.getElementById('g-band-selector');
    var b = document.getElementById('b-band-selector');

    [single, r, g, b].forEach(sel => {
        if (!sel) return;
        sel.innerHTML = '';
        for (var i = 0; i < georaster.numberOfRasters; i++) {
            var opt = document.createElement('option');
            opt.value = i;
            opt.textContent = 'Banda ' + (i + 1);
            sel.appendChild(opt);
        }
    });

    // Default defaults
    if (georaster.numberOfRasters >= 3) {
        document.getElementById('raster-mode').value = 'rgb';
        r.value = 0; g.value = 1; b.value = 2;
    } else {
        document.getElementById('raster-mode').value = 'single';
    }
    window.updateRasterControlsDisplay();
};

window.applyAdvancedStyle = function () {
    if (!window.currentRasterFile) return;

    var mode = document.getElementById('raster-mode').value;
    var settings = {
        mode: mode,
        ramp: document.getElementById('color-ramp-selector').value,
        singleBand: parseInt(document.getElementById('single-band-selector').value) || 0,
        r: parseInt(document.getElementById('r-band-selector').value) || 0,
        g: parseInt(document.getElementById('g-band-selector').value) || 1,
        b: parseInt(document.getElementById('b-band-selector').value) || 2
    };

    window.renderGeoraster(window.currentRasterFile, settings, window.currentRasterName);

    // ALERTA: Sincronizar con el modelo 3D si está activo
    if (window.Mode3DController && window.Mode3DController.isActive) {
        window.render3DExtrusion();
    }
};

window.applyImageFilters = function () {
    var brightness = document.getElementById('raster-brightness').value;
    var contrast = document.getElementById('raster-contrast').value;
    var saturation = document.getElementById('raster-saturation').value;
    var opacity = document.getElementById('raster-opacity').value;

    document.getElementById('brightness-val').textContent = brightness + '%';
    document.getElementById('contrast-val').textContent = contrast + '%';
    document.getElementById('saturation-val').textContent = saturation + '%';
    document.getElementById('opacity-val').textContent = opacity + '%';

    if (window.currentRasterLayer) {
        // En Leaflet, el contenedor del layer puede verse afectado por filtros
        var container = window.currentRasterLayer.getContainer();
        if (container) {
            container.style.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
            container.style.opacity = opacity / 100;
        } else {
            // Fallback: tratar de encontrar el canvas
            var panes = window.sigPro.mapManager.map.getPanes();
            var overlayPane = panes.overlayPane;
            // georaster-layer-for-leaflet crea un contenedor dentro del pane
            // pero es más seguro aplicar solo la opacidad vía Leaflet si el contenedor no está listo
            window.currentRasterLayer.setOpacity(opacity / 100);
        }
    }
};

window.renderGeoraster = function (georaster, settings, name) {
    if (!window.sigPro || !window.sigPro.mapManager) return;
    var map = window.sigPro.mapManager.map;

    // Configuración por defecto if settings is a string (legacy support para colorRamp)
    var setup = { mode: 'single', ramp: 'viridis', singleBand: 0, r: 0, g: 1, b: 2 };
    if (typeof settings === 'string') setup.ramp = settings;
    else if (settings) Object.assign(setup, settings);

    // Remover raster existente
    if (window.currentRasterLayer) {
        map.removeLayer(window.currentRasterLayer);
        window.currentLayers = window.currentLayers.filter(l => l.layer !== window.currentRasterLayer);
        var layerListItems = document.querySelectorAll('.layer-item');
        layerListItems.forEach(item => {
            if (item.getAttribute('data-raster') === 'true') item.remove();
        });
    }

    // Calcular escala para mono-banda
    var bIdx = setup.singleBand;
    var min = (georaster.mins && georaster.mins[bIdx] !== undefined) ? georaster.mins[bIdx] : 0;
    var max = (georaster.maxs && georaster.maxs[bIdx] !== undefined) ? georaster.maxs[bIdx] : 255;
    if (min === max) max = min + 1;
    var scale = chroma.scale(setup.ramp).domain([min, max]);

    var layer = new GeoRasterLayer({
        georaster: georaster,
        pixelValuesToColorFn: function (pixelValues) {
            if (pixelValues[0] === georaster.noDataValue || Number.isNaN(pixelValues[0])) return null;

            if (setup.mode === 'rgb' && georaster.numberOfRasters >= 3) {
                var r = Math.round(pixelValues[setup.r]);
                var g = Math.round(pixelValues[setup.g]);
                var b = Math.round(pixelValues[setup.b]);
                if (r === 0 && g === 0 && b === 0 && georaster.noDataValue === 0) return null;
                return `rgb(${r},${g},${b})`;
            }

            // Mono-banda o fallback
            return scale(pixelValues[setup.singleBand]).hex();
        },
        resolution: 256
    });

    layer.addTo(map);
    // Solo ajustar zoom la primera vez que se carga (evitar saltos al cambiar color)
    if (!window.currentRasterLayer) map.fitBounds(layer.getBounds());

    window.currentRasterLayer = layer;
    window.currentLayers.push({ name: name || 'Raster TIFF', layer: layer, isRaster: true });

    // Actualizar Panel de Capas y asegurar que el Color Manager esté listo
    var noRaster = document.getElementById('no-raster-selected');
    var rasterCtrls = document.getElementById('raster-controls');
    if (noRaster) noRaster.style.display = 'none';
    if (rasterCtrls) rasterCtrls.style.display = 'block';

    var layerList = document.getElementById('layer-list');
    if (layerList) {
        var emptySt = layerList.querySelector('.empty-state');
        if (emptySt) emptySt.remove();

        var item = document.createElement('div');
        item.className = 'layer-item';
        item.setAttribute('data-raster', 'true');
        item.setAttribute('draggable', 'true');
        item.style.display = 'flex';
        item.style.alignItems = 'center';
        item.style.gap = '10px';
        item.innerHTML = `
            <i class="bi bi-image" style="color: #0ff;"></i>
            <span style="flex-grow:1; text-overflow:ellipsis; overflow:hidden; white-space:nowrap; cursor: grab;">${name || 'Raster TIFF'}</span>
            <i class="bi bi-palette" style="cursor:pointer; color: #f0f;" onclick="window.openColorManagerRaster()" title="Modificar Estilo Raster"></i>
            <i class="bi bi-trash" style="cursor:pointer; color: #ff4444;" onclick="window.removeLayer('${(name || 'Raster TIFF').replace(/'/g, "\\'")}')" title="Eliminar Capa"></i>
        `;

        // Agregar eventos de drag & drop
        item.addEventListener('dragstart', window.handleLayerDragStart);
        item.addEventListener('dragover', window.handleLayerDragOver);
        item.addEventListener('drop', window.handleLayerDrop);
        item.addEventListener('dragend', window.handleLayerDragEnd);
        item.addEventListener('dragenter', window.handleLayerDragEnter);
        item.addEventListener('dragleave', window.handleLayerDragLeave);

        layerList.appendChild(item);
    }

    // Aplicar filtros iniciales
    window.applyImageFilters();
};

// ============================================
// MODULO ECHARTS - DATA VIZ PREMIUM
// ============================================
window.echartsInstance = null;

window.toggleChartManager = function () {
    var panel = document.getElementById('chart-manager-panel');
    if (panel) {
        panel.classList.toggle('open');
        if (panel.classList.contains('open')) {
            window.updateChartSetup();
        }
    }
};

window.openFloatingChartPanel = function () {
    var panel = document.getElementById('floating-chart-panel');
    if (panel) {
        panel.style.display = 'block';
        // Inicializar ECharts en el contenedor flotante si no existe
        if (!window.floatingChartInstance && typeof echarts !== 'undefined') {
            window.floatingChartInstance = echarts.init(document.getElementById('floating-echarts-root'), 'dark');
        }
        // Generar el gráfico
        window.generateECharts();
    }
};

window.closeFloatingChartPanel = function () {
    var panel = document.getElementById('floating-chart-panel');
    if (panel) {
        panel.style.display = 'none';
    }
};

window.updateChartSetup = function () {
    var source = document.getElementById('chart-data-source').value;
    var vecSetup = document.getElementById('vector-chart-setup');
    var rasSetup = document.getElementById('raster-chart-setup');

    vecSetup.style.display = 'none';
    rasSetup.style.display = 'none';

    if (source === 'vector') {
        vecSetup.style.display = 'block';
        if (window.currentFeatures && window.currentFeatures.length > 0) {
            var keys = Object.keys(window.currentFeatures[0].properties);
            var xSel = document.getElementById('chart-x-axis');
            var ySel = document.getElementById('chart-y-axis');
            xSel.innerHTML = ''; ySel.innerHTML = '';
            keys.forEach(k => {
                xSel.innerHTML += `<option value="${k}">${k}</option>`;
                ySel.innerHTML += `<option value="${k}">${k}</option>`;
            });
        }
    } else if (source === 'raster') {
        rasSetup.style.display = 'block';
        if (window.currentRasterFile) {
            var bSel = document.getElementById('chart-raster-band');
            bSel.innerHTML = '';
            for (var i = 0; i < window.currentRasterFile.numberOfRasters; i++) {
                bSel.innerHTML += `<option value="${i}">Banda ${i + 1}</option>`;
            }
        }
    }
};

window.generateECharts = async function () {
    var source = document.getElementById('chart-data-source').value;
    if (source === 'none') {
        alert("Selecciona una fuente de datos originaria.");
        return;
    }

    try {
        if (typeof echarts === 'undefined') {
            alert("ALERTA: Librería ECharts no disponible. Asegúrate de tener conexión a internet.");
            return;
        }

        var chartDom = document.getElementById('floating-chart-panel') &&
            document.getElementById('floating-chart-panel').style.display !== 'none'
            ? document.getElementById('floating-echarts-root')
            : document.getElementById('echarts-root');
        if (!window.echartsInstance) {
            window.echartsInstance = echarts.init(chartDom, 'dark'); // Modo oscuro nativo
        }

        var myChart = window.echartsInstance;
        myChart.clear();

        if (source === 'vector') {
            var xKey = document.getElementById('chart-x-axis').value;
            var yKey = document.getElementById('chart-y-axis').value;

            if (!window.currentFeatures || window.currentFeatures.length === 0) {
                alert("Data Lake Vectorial vacío.");
                return;
            }

            const xValues = [];
            const yValues = [];

            window.currentFeatures.forEach((f) => {
                let xVal = f.properties[xKey];
                let yVal = parseFloat(f.properties[yKey]);
                if (!isNaN(yVal)) {
                    xValues.push(xVal);
                    yValues.push(yVal);
                }
            });

            let limit = Math.min(xValues.length, 5000);

            var option = {
                backgroundColor: 'transparent',
                tooltip: {
                    trigger: 'axis',
                    axisPointer: { type: 'shadow' }
                },
                grid: {
                    left: '3%', right: '4%', bottom: '3%', top: '15%', containLabel: true
                },
                dataZoom: [
                    { type: 'inside' },
                    { type: 'slider', bottom: 0, height: 10, borderColor: 'transparent', fillerColor: 'rgba(255, 102, 0, 0.2)' }
                ],
                xAxis: {
                    type: 'category',
                    data: xValues.slice(0, limit),
                    axisLine: { lineStyle: { color: '#ff8a33' } },
                    axisLabel: { color: '#ffffff88', align: 'center' }
                },
                yAxis: {
                    type: 'value',
                    name: yKey,
                    nameTextStyle: { color: '#ff8a33' },
                    axisLine: { lineStyle: { color: '#ff8a33' } },
                    splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
                    axisLabel: { color: '#ffffff88' }
                },
                series: [{
                    name: yKey,
                    data: yValues.slice(0, limit),
                    type: 'bar',
                    itemStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            { offset: 0, color: '#ff6600' },
                            { offset: 1, color: 'rgba(255,102,0,0.1)' }
                        ])
                    }
                }]
            };

            myChart.setOption(option);

        } else if (source === 'raster') {
            if (!window.currentRasterFile) {
                alert("Data Lake Raster vacío.");
                return;
            }
            var bandIdx = parseInt(document.getElementById('chart-raster-band').value);

            let values = window.currentRasterFile.values[bandIdx];
            let min = window.currentRasterFile.mins[bandIdx];
            let max = window.currentRasterFile.maxs[bandIdx];
            let noData = window.currentRasterFile.noDataValue;

            if (values && values.length > 0) {
                let flatValues = [];
                if (Array.isArray(values[0]) || values[0] instanceof Float32Array || values[0] instanceof Uint8Array) {
                    let strideY = Math.max(1, Math.floor(values.length / 200));
                    for (let y = 0; y < values.length; y += strideY) {
                        let row = values[y];
                        let strideX = Math.max(1, Math.floor(row.length / 200));
                        for (let x = 0; x < row.length; x += strideX) {
                            if (row[x] !== noData) flatValues.push(row[x]);
                        }
                    }
                } else {
                    let stride = Math.max(1, Math.floor(values.length / 10000));
                    for (let i = 0; i < values.length; i += stride) {
                        if (values[i] !== noData) flatValues.push(values[i]);
                    }
                }

                let bins = 100;
                let histogram = new Array(bins).fill(0);
                let binSize = (max - min) / bins;

                let binLabels = [];

                if (binSize > 0) {
                    flatValues.forEach(v => {
                        let bin = Math.floor((v - min) / binSize);
                        if (bin >= bins) bin = bins - 1;
                        if (bin >= 0) histogram[bin]++;
                    });

                    for (let i = 0; i < bins; i++) {
                        let binCenter = min + (i * binSize) + (binSize / 2);
                        binLabels.push(binCenter.toFixed(2));
                    }

                    var optionRaster = {
                        backgroundColor: 'transparent',
                        tooltip: {
                            trigger: 'axis',
                            axisPointer: { type: 'cross', label: { backgroundColor: '#6a7985' } }
                        },
                        grid: {
                            left: '3%', right: '4%', bottom: '3%', top: '15%', containLabel: true
                        },
                        dataZoom: [
                            { type: 'inside' },
                            { type: 'slider', bottom: 0, height: 10, borderColor: 'transparent', fillerColor: 'rgba(0, 229, 255, 0.2)' }
                        ],
                        xAxis: {
                            type: 'category',
                            boundaryGap: false,
                            data: binLabels,
                            name: "Radiancia (DN)",
                            nameLocation: 'middle',
                            nameGap: 25,
                            axisLine: { lineStyle: { color: '#ff8a33' } },
                            axisLabel: { color: '#ffffff88' }
                        },
                        yAxis: {
                            type: 'value',
                            name: "Frecuencia",
                            nameTextStyle: { color: '#ff8a33' },
                            axisLine: { lineStyle: { color: '#ff8a33' } },
                            splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
                            axisLabel: { color: '#ffffff88' }
                        },
                        series: [
                            {
                                name: 'Frecuencia Absoluta',
                                type: 'line',
                                smooth: true,
                                symbol: 'none',
                                sampling: 'lttb',
                                lineStyle: { color: '#00e5ff', width: 2 },
                                areaStyle: {
                                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                                        { offset: 0, color: 'rgba(0, 229, 255, 0.5)' },
                                        { offset: 1, color: 'rgba(0, 229, 255, 0.05)' }
                                    ])
                                },
                                data: histogram
                            }
                        ]
                    };

                    myChart.setOption(optionRaster);
                } else {
                    alert("Imagen de un solo valor, no se puede generar espectro.");
                }
            }
        }
    } catch (err) {
        console.error("ALERTA ECharts:", err);
        alert("Ocurrió un error renderizando el gráfico: " + err.message);
    }
};

// Handle window resize for ECharts
window.addEventListener('resize', function () {
    if (window.echartsInstance) window.echartsInstance.resize();
    if (window.floatingChartInstance) window.floatingChartInstance.resize();
    if (window.lensEchartsInstance) window.lensEchartsInstance.resize();
});

// ============================================
// MODULO LENTE ANALITICO (DATA LENS)
// ============================================
window.lensModeActive = false;
window.lensRadiusPx = 80;
window.lensEchartsInstance = null;
window.lensHoverTimeout = null;
window.lensCursorEl = null;

window.toggleDataLens = function () {
    window.lensModeActive = !window.lensModeActive;
    var panel = document.getElementById('lens-panel');
    var mapContainer = document.getElementById('map');

    if (!window.lensCursorEl) {
        window.lensCursorEl = document.createElement('div');
        window.lensCursorEl.className = 'lens-cursor-overlay';
        document.body.appendChild(window.lensCursorEl);
    }

    if (window.lensModeActive) {
        window.updateLensParameterSelect();
        panel.style.display = 'flex';
        window.lensCursorEl.style.display = 'block';
        window.lensCursorEl.style.width = (window.lensRadiusPx * 2) + 'px';
        window.lensCursorEl.style.height = (window.lensRadiusPx * 2) + 'px';

        mapContainer.style.cursor = 'crosshair';

        window.sigPro.mapManager.map.on('mousemove', window.handleLensMouseMove);
        document.addEventListener('mousemove', window.syncLensCursor);

        // Inicializar ECharts miniatura
        if (!window.lensEchartsInstance && typeof echarts !== 'undefined') {
            window.lensEchartsInstance = echarts.init(document.getElementById('lens-echarts-root'), 'dark');
        }
    } else {
        panel.style.display = 'none';
        window.lensCursorEl.style.display = 'none';
        mapContainer.style.cursor = '';
        window.sigPro.mapManager.map.off('mousemove', window.handleLensMouseMove);
        document.removeEventListener('mousemove', window.syncLensCursor);
    }
};

window.updateLensSecondarySelects = function () {
    let xSel = document.getElementById('lens-parameter-selector');
    let optsDiv = document.getElementById('lens-vector-options');
    let ySel = document.getElementById('lens-y-parameter');

    if (xSel && xSel.value.startsWith('vector-')) {
        if (optsDiv) optsDiv.style.display = 'block';
        if (ySel && window.currentFeatures) {
            let currentVal = ySel.value;
            ySel.innerHTML = '<option value="COUNT" style="color:#00e5ff;">Conteo Absoluto (COUNT)</option>';
            let props = window.currentFeatures[0].properties;
            Object.keys(props).forEach(k => {
                if (!isNaN(parseFloat(props[k]))) { // Solo numericos
                    let opt = document.createElement('option');
                    opt.value = k;
                    opt.textContent = k;
                    ySel.appendChild(opt);
                }
            });
            // restablish old value if exists
            if (Array.from(ySel.options).some(o => o.value === currentVal)) ySel.value = currentVal;
        }
    } else {
        if (optsDiv) optsDiv.style.display = 'none';
    }
};

window.updateLensParameterSelect = function () {
    let select = document.getElementById('lens-parameter-selector');
    if (!select) return;

    let isRaster = !!window.currentRasterFile && (window.currentLayers.some(l => l.isRaster));
    let hasVector = window.currentFeatures && window.currentFeatures.length > 0;

    select.innerHTML = '';

    if (isRaster) {
        let optGroup = document.createElement('optgroup');
        optGroup.label = 'Espectro (Raster)';
        for (let i = 0; i < window.currentRasterFile.numberOfRasters; i++) {
            let opt = document.createElement('option');
            opt.value = 'raster-' + i;
            opt.textContent = 'Banda ' + (i + 1);
            optGroup.appendChild(opt);
        }
        select.appendChild(optGroup);
    }

    if (hasVector) {
        let optGroup = document.createElement('optgroup');
        optGroup.label = 'Atributos (Vectorial)';
        let props = window.currentFeatures[0].properties;
        let keys = Object.keys(props);
        keys.forEach(k => {
            let opt = document.createElement('option');
            opt.value = 'vector-' + k;
            opt.textContent = 'Atributo: ' + k;
            optGroup.appendChild(opt);
        });
        select.appendChild(optGroup);
    }

    if (!isRaster && !hasVector) {
        let opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'Sin datos disponibles...';
        select.appendChild(opt);
    }

    if (hasVector || isRaster) window.updateLensSecondarySelects();
};

window.forceLensUpdate = function () {
    if (window.lensEchartsInstance && window.lensModeActive) {
        window.lensEchartsInstance.clear();
    }
};

window.syncLensCursor = function (e) {
    if (window.lensModeActive && window.lensCursorEl) {
        window.lensCursorEl.style.left = e.pageX + 'px';
        window.lensCursorEl.style.top = e.pageY + 'px';
    }
};

window.updateLensRadius = function (val) {
    window.lensRadiusPx = parseInt(val);
    document.getElementById('lens-radius-val').textContent = val + 'px';
    if (window.lensCursorEl) {
        window.lensCursorEl.style.width = (val * 2) + 'px';
        window.lensCursorEl.style.height = (val * 2) + 'px';
    }
};

window.handleLensMouseMove = function (e) {
    if (!window.lensModeActive) return;

    if (window.lensHoverTimeout) return;
    window.lensHoverTimeout = setTimeout(() => {
        window.computeLensData(e.latlng, e.containerPoint);
        window.lensHoverTimeout = null;
    }, 60);
};

window.computeLensData = function (latlng, containerPoint) {
    let selectVal = document.getElementById('lens-parameter-selector')?.value;
    if (!selectVal) return;

    let isRasterQuery = selectVal.startsWith('raster-');
    let isVectorQuery = selectVal.startsWith('vector-');

    let chartTitle = "Analítica";
    let xData = [];
    let yData = [];

    if (isRasterQuery) {
        let bandIdx = parseInt(selectVal.replace('raster-', ''));
        chartTitle = "Espectro Localizado (Banda " + (bandIdx + 1) + ")";
        let raster = window.currentRasterFile;

        let epsgCode = raster.projection;
        let projX = latlng.lng;
        let projY = latlng.lat;

        if (epsgCode && epsgCode !== 4326 && typeof proj4 !== 'undefined') {
            try {
                if (proj4.defs('EPSG:' + epsgCode)) {
                    let coords = proj4('EPSG:4326', 'EPSG:' + epsgCode, [latlng.lng, latlng.lat]);
                    projX = coords[0];
                    projY = coords[1];
                }
            } catch (e) { }
        }

        let pxX = Math.floor((projX - raster.xmin) / raster.pixelWidth);
        let pxY = Math.floor((raster.ymax - projY) / raster.pixelHeight);

        let map = window.sigPro.mapManager.map;
        let centerCont = map.latLngToContainerPoint(latlng);
        let edgeCont = L.point(centerCont.x + window.lensRadiusPx, centerCont.y);
        let edgeLatLng = map.containerPointToLatLng(edgeCont);

        let radiusDeg = Math.abs(edgeLatLng.lng - latlng.lng);
        let radiusPxRaster = Math.floor(radiusDeg / raster.pixelWidth);
        radiusPxRaster = Math.min(raster.width / 4, Math.max(1, radiusPxRaster));

        let minX = Math.max(0, pxX - radiusPxRaster);
        let maxX = Math.min(raster.width - 1, pxX + radiusPxRaster);
        let minY = Math.max(0, pxY - radiusPxRaster);
        let maxY = Math.min(raster.height - 1, pxY + radiusPxRaster);

        let dataValues = [];
        let r2 = radiusPxRaster * radiusPxRaster;

        if (raster.values && raster.values[bandIdx] && maxX > minX && maxY > minY) {
            let values = raster.values[bandIdx];
            let is2D = Array.isArray(values[0]) || values[0] instanceof Float32Array || values[0] instanceof Uint8Array;

            for (let y = minY; y <= maxY; y++) {
                let dy = y - pxY;
                for (let x = minX; x <= maxX; x++) {
                    let dx = x - pxX;
                    if ((dx * dx + dy * dy) <= r2) {
                        let val;
                        if (is2D) val = values[y][x];
                        else val = values[y * raster.width + x];

                        if (val !== undefined && val !== raster.noDataValue && !isNaN(val)) {
                            dataValues.push(val);
                        }
                    }
                }
            }
        }

        if (dataValues.length > 0) {
            let limitSamples = 3000;
            if (dataValues.length > limitSamples) {
                let step = Math.ceil(dataValues.length / limitSamples);
                dataValues = dataValues.filter((_, idx) => idx % step === 0);
            }

            let vMin = Math.min(...dataValues);
            let vMax = Math.max(...dataValues);
            if (vMin === vMax) vMax = vMin + 1;
            let bins = 20;
            let hist = new Array(bins).fill(0);
            let step = (vMax - vMin) / bins;

            dataValues.forEach(v => {
                let bin = Math.floor((v - vMin) / step);
                if (bin >= bins) bin = bins - 1;
                hist[bin]++;
            });

            for (let i = 0; i < bins; i++) {
                xData.push((vMin + i * step + step / 2).toFixed(1));
                yData.push(hist[i]);
            }

            window.renderLensChart(chartTitle, xData, yData, 'line');
        } else {
            window.renderLensChart(chartTitle, [], [], 'line');
        }

    } else if (isVectorQuery) {
        let xKey = selectVal.replace('vector-', '');
        let yKeyNode = document.getElementById('lens-y-parameter');
        let chartTypeNode = document.getElementById('lens-chart-type');
        let yKey = yKeyNode && yKeyNode.offsetParent !== null ? yKeyNode.value : 'COUNT';
        let cType = chartTypeNode && chartTypeNode.offsetParent !== null ? chartTypeNode.value : 'bar';

        chartTitle = yKey === 'COUNT' ? `Frecuencia: ${xKey}` : `Correlación: ${xKey}`;

        let map = window.sigPro.mapManager.map;
        let pCenter = map.latLngToContainerPoint(latlng);

        let insideCount = 0;
        let rawPoints = [];

        window.currentFeatures.forEach(f => {
            let centerLngLat;
            if (f.geometry.type === 'Point') {
                centerLngLat = L.latLng(f.geometry.coordinates[1], f.geometry.coordinates[0]);
            } else if (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon') {
                let coords = f.geometry.coordinates.flat(Infinity);
                let cgLng = coords[0]; let cgLat = coords[1];
                centerLngLat = L.latLng(cgLat, cgLng);
            }

            if (centerLngLat) {
                let p = map.latLngToContainerPoint(centerLngLat);
                let dx = p.x - pCenter.x;
                let dy = p.y - pCenter.y;
                if ((dx * dx + dy * dy) <= window.lensRadiusPx * window.lensRadiusPx) {
                    insideCount++;
                    rawPoints.push(f.properties);
                }
            }
        });

        if (insideCount > 0) {
            if (yKey === 'COUNT') {
                let countsByCategory = {};
                rawPoints.forEach(p => {
                    let catVal = p[xKey] || 'N/A';
                    countsByCategory[catVal] = (countsByCategory[catVal] || 0) + 1;
                });
                Object.keys(countsByCategory).forEach(k => {
                    xData.push(k.substring(0, 15));
                    yData.push(countsByCategory[k]);
                });
                window.renderLensChart(chartTitle, xData, yData, cType);
            } else {
                let isXNum = !isNaN(parseFloat(rawPoints[0][xKey]));
                let isYNum = !isNaN(parseFloat(rawPoints[0][yKey]));

                if (cType === 'scatter' && isXNum && isYNum) {
                    xData = null; // scatter doesn't need categories in X
                    yData = [];
                    rawPoints.forEach(p => {
                        let xV = parseFloat(p[xKey]);
                        let yV = parseFloat(p[yKey]);
                        if (!isNaN(xV) && !isNaN(yV)) {
                            yData.push([xV, yV]);
                        }
                    });
                    window.renderLensChart(chartTitle, xData, yData, 'scatter');
                } else {
                    let aggMap = {};
                    rawPoints.forEach(p => {
                        let catVal = p[xKey] || 'N/A';
                        if (!aggMap[catVal]) aggMap[catVal] = [];
                        let nVal = parseFloat(p[yKey]);
                        if (!isNaN(nVal)) aggMap[catVal].push(nVal);
                    });
                    Object.keys(aggMap).forEach(k => {
                        xData.push(k.substring(0, 10)); // Truncar para estetica
                        if (aggMap[k].length > 0) {
                            let sum = aggMap[k].reduce((a, b) => a + b, 0);
                            yData.push(parseFloat((sum / aggMap[k].length).toFixed(2))); // Promedio
                        } else {
                            yData.push(0);
                        }
                    });
                    window.renderLensChart(chartTitle, xData, yData, cType);
                }
            }
        } else {
            window.renderLensChart(chartTitle, [], [], cType);
        }
    }
};

window.renderLensChart = function (title, xData, yData, type) {
    if (!window.lensEchartsInstance) return;

    let isScatter = type === 'scatter' && !xData;
    let isAreaRaster = title.includes("Espectro Localizado");

    let option = {
        backgroundColor: 'transparent',
        animationDuration: 100, // Rápidas iteraciones
        tooltip: {
            show: true,
            trigger: isScatter ? 'item' : 'axis',
            textStyle: { fontSize: 10 },
            confine: true
        },
        grid: { left: '15%', right: '5%', bottom: '20%', top: '30%', containLabel: true },
        title: {
            text: title,
            textStyle: { color: isAreaRaster ? '#00e5ff' : '#f5932a', fontSize: 11, fontWeight: 'bold' },
            left: 'center',
            top: 5
        },
        xAxis: isScatter ? {
            type: 'value',
            splitLine: { show: false },
            axisLine: { lineStyle: { color: 'rgba(245, 147, 42, 0.4)' } },
            axisLabel: { color: '#f5932a', fontSize: 9 }
        } : {
            type: 'category',
            data: xData,
            axisLabel: { show: !isAreaRaster && xData && xData.length <= 15, color: '#f5932a', fontSize: 8, interval: 'auto' },
            axisLine: { lineStyle: { color: isAreaRaster ? 'rgba(0, 229, 255, 0.5)' : 'rgba(245, 147, 42, 0.5)' } },
            splitLine: { show: false }
        },
        yAxis: {
            type: 'value',
            splitLine: { show: false },
            axisLabel: { show: !isAreaRaster, color: '#f5932a', fontSize: 9 },
            axisLine: { show: !isAreaRaster, lineStyle: { color: isAreaRaster ? 'rgba(0, 229, 255, 0.5)' : 'rgba(245, 147, 42, 0.5)' } }
        },
        series: [{
            data: yData,
            type: type,
            smooth: type === 'line',
            symbolSize: isScatter ? 5 : (type === 'line' ? 'none' : undefined),
            itemStyle: {
                color: isAreaRaster ? '#00e5ff' : '#f5932a'
            },
            areaStyle: isAreaRaster && type === 'line' ? {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: 'rgba(0, 229, 255, 0.7)' },
                    { offset: 1, color: 'rgba(0, 229, 255, 0.05)' }
                ])
            } : undefined
        }]
    };

    window.lensEchartsInstance.setOption(option, { notMerge: true });
};

// ============================================
// HEXBIN RASTER TOOL
// ============================================
window.toggleHexbinTool = function () {
    var panel = document.getElementById('hexbin-panel');
    if (!panel) return;
    panel.classList.toggle('open');
    if (panel.classList.contains('open')) {
        var nameLabel = document.getElementById('hexbin-raster-name');
        var bandSelect = document.getElementById('hexbin-band');
        if (window.currentRasterFile) {
            nameLabel.textContent = window.currentRasterName || 'Raster Activo';
            bandSelect.innerHTML = '';
            for (var i = 0; i < window.currentRasterFile.numberOfRasters; i++) {
                bandSelect.innerHTML += '<option value="' + i + '">Banda ' + (i + 1) + '</option>';
            }
        } else {
            nameLabel.textContent = 'No hay raster cargado';
            bandSelect.innerHTML = '<option value="">Selecciona Raster...</option>';
        }
    }
};

window.generateHexbins = function () {
    if (!window.currentRasterFile) {
        alert("Debe cargar un raster primero.");
        return;
    }
    if (typeof turf === 'undefined' || typeof geoblaze === 'undefined') {
        alert("Librerías Turf o Geoblaze no están cargadas.");
        return;
    }

    var sizeKm = parseFloat(document.getElementById('hexbin-size').value);
    if (isNaN(sizeKm) || sizeKm <= 0) sizeKm = 1;

    var bandIdx = parseInt(document.getElementById('hexbin-band').value);
    if (isNaN(bandIdx)) bandIdx = 0;

    var statType = document.getElementById('hexbin-stat').value || 'mean';

    var loadingLayer = document.getElementById('loading-overlay');
    var loadingText = loadingLayer ? loadingLayer.querySelector('span') : null;
    if (loadingLayer && loadingText) {
        loadingText.textContent = 'GENERANDO MALLA HEXAGONAL...';
        loadingLayer.style.display = 'flex';
    }

    // ALERTA: Estamos realizando análisis espacial intensivo con Geoblaze y Turf.
    setTimeout(function () {
        try {
            var georaster = window.currentRasterFile;
            var projCode = georaster.projection;
            console.log("Hexbin Config - ProjCode:", projCode);
            console.log("Original Raster Bounds:", georaster.xmin, georaster.ymin, georaster.xmax, georaster.ymax);

            // Definiendo Web Mercator por seguridad si no existe en proj4
            if (typeof proj4 !== 'undefined' && !proj4.defs('EPSG:3857')) {
                proj4.defs('EPSG:3857', '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext  +no_defs');
            }

            var pMin, pMax, pTopLeft, pBottomRight;
            var bbox;
            if (projCode === 4326 || !projCode) {
                bbox = [
                    Math.min(georaster.xmin, georaster.xmax),
                    Math.min(georaster.ymin, georaster.ymax),
                    Math.max(georaster.xmin, georaster.xmax),
                    Math.max(georaster.ymin, georaster.ymax)
                ];
            } else {
                if (typeof proj4 !== 'undefined') {
                    // Tratar de proyectar las 4 esquinas para encontrar el verdadero BBOX en WGS84
                    var c1 = proj4('EPSG:' + projCode, 'EPSG:4326', [georaster.xmin, georaster.ymin]);
                    var c2 = proj4('EPSG:' + projCode, 'EPSG:4326', [georaster.xmax, georaster.ymin]);
                    var c3 = proj4('EPSG:' + projCode, 'EPSG:4326', [georaster.xmax, georaster.ymax]);
                    var c4 = proj4('EPSG:' + projCode, 'EPSG:4326', [georaster.xmin, georaster.ymax]);

                    var xs = [c1[0], c2[0], c3[0], c4[0]].filter(x => !isNaN(x));
                    var ys = [c1[1], c2[1], c3[1], c4[1]].filter(y => !isNaN(y));

                    if (xs.length > 0 && ys.length > 0) {
                        bbox = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
                    } else {
                        bbox = [georaster.xmin, georaster.ymin, georaster.xmax, georaster.ymax];
                    }
                } else {
                    bbox = [georaster.xmin, georaster.ymin, georaster.xmax, georaster.ymax];
                }
            }

            console.log("Calculated WGS84 BBOX:", bbox);

            // Validación contra dimensiones 0 o NaN
            if (isNaN(bbox[0]) || isNaN(bbox[1])) {
                throw new Error("Proyección inválida o Bounds NaN");
            }

            // Autodiagnóstico de escala:
            var polyBbox = turf.bboxPolygon(bbox);
            var areaBboxKm = turf.area(polyBbox) / 1000000;
            console.log("Turf Area del Raster (km2):", areaBboxKm);

            // Si el área de un hexágono (aprox 2.6 * sizeKm^2) es más grande que toda la imagen raster
            // turf.hexGrid fallará y devolverá 0 hexágonos.
            // Para asegurar al menos un buen render, auto-reduciremos el sizeKm:
            var hexAreaAprox = 2.6 * sizeKm * sizeKm;
            if (hexAreaAprox > areaBboxKm * 0.8) {
                // Reducir tamaño de celda para que quepan unos ~20 hexágonos
                sizeKm = Math.sqrt(areaBboxKm / (2.6 * 20));
                if (sizeKm < 0.001) sizeKm = 0.001; // Límite inferior de 1 metro
                console.warn("Escala de hexágono muy grande. Autocambiando a:", sizeKm, "km");
            }

            var hexGrid = turf.hexGrid(bbox, sizeKm, { units: 'kilometers' });

            // Safety Net final
            if (hexGrid.features.length === 0) {
                // Generar fall-back super forzado si aún da 0
                sizeKm = Math.sqrt(areaBboxKm / 50) || 0.01;
                hexGrid = turf.hexGrid(bbox, sizeKm, { units: 'kilometers' });
            }

            if (loadingText) loadingText.textContent = 'ANALIZANDO INTERSECCIÓN ESPACIAL...';

            var validFeatures = [];
            var evalErrors = [];
            var undefinedPolyvals = 0;
            var needsProj = (projCode !== 4326 && projCode && typeof proj4 !== 'undefined');

            hexGrid.features.forEach(function (feature, index) {
                try {
                    // Leaflet y Turf trabajan en WGS84 pero Geoblaze intercepta según la matriz nativa.
                    var geomToTest = feature.geometry; // Default
                    if (needsProj) {
                        // Clon profundo de coordenadas para proyectarlas de vuelta al CRS Nativo
                        var clonedCoords = feature.geometry.coordinates.map(function (ring) {
                            return ring.map(function (coord) {
                                return proj4('EPSG:4326', 'EPSG:' + projCode, coord);
                            });
                        });
                        geomToTest = { type: feature.geometry.type, coordinates: clonedCoords };
                    }

                    // A geoblaze le gusta recibir un pure geojson Feature o geometry object
                    var polyVal = geoblaze[statType](georaster, geomToTest);
                    var val = null;

                    if (Array.isArray(polyVal)) {
                        val = polyVal[bandIdx];
                    } else if (typeof polyVal === 'object' && polyVal !== null) {
                        val = polyVal[bandIdx] !== undefined ? polyVal[bandIdx] : Object.values(polyVal)[0];
                    } else if (typeof polyVal === 'number') {
                        val = polyVal;
                    }

                    if (val !== undefined && val !== null && !isNaN(val)) {
                        feature.properties[statType + '_val'] = parseFloat(Number(val).toFixed(4));
                        validFeatures.push(feature);
                    } else {
                        undefinedPolyvals++;
                    }
                } catch (err) {
                    if (evalErrors.length < 5) evalErrors.push(err.message || err.toString());
                }
            });

            console.log("Hexbins generados:", hexGrid.features.length);
            console.log("Hexbins con data válida:", validFeatures.length);
            console.log("Hexbins sin data (Nodata/Out of bounds):", undefinedPolyvals);
            if (evalErrors.length > 0) console.warn("Errores en Geoblaze:", evalErrors);

            hexGrid.features = validFeatures;

            if (hexGrid.features.length === 0) {
                alert("La malla se generó (" + turf.hexGrid(bbox, sizeKm, { units: 'kilometers' }).features.length + " hexágonos) pero no intersepta datos numéricos. Geoblaze Errors: " + (evalErrors[0] || "Ninguno") + " | Nodata count: " + undefinedPolyvals);
                if (loadingLayer) loadingLayer.style.display = 'none';
                return;
            }

            var layerName = "Hexbins (" + statType + ") - " + sizeKm + "km";
            window.addGeoJsonLayer(hexGrid, layerName);

            var panel = document.getElementById('hexbin-panel');
            if (panel) panel.classList.remove('open');

            setTimeout(function () {
                var layerSelect = document.getElementById('vector-layer-selector');
                if (layerSelect) {
                    window.openColorManagerVector();
                }
            }, 600);

            if (loadingLayer) loadingLayer.style.display = 'none';
        } catch (e) {
            console.error("Error generando hexbins:", e);
            alert("Error en el cómputo de hexbins. Detalle: " + e.message);
            if (loadingLayer) loadingLayer.style.display = 'none';
        }
    }, 150);
};

// ============================================
// FUEL COST CALCULATOR - FUNCIONES GLOBALES
// ============================================

window.fuelCostManager = null;
window.fuelChartManager = null;

// Inicializar Fuel Cost Managers
window.initFuelCostTools = function () {
    if (!window.sigPro || !window.sigPro.mapManager) {
        console.error('Mapa no inicializado');
        return;
    }

    window.fuelCostManager = new FuelCostManager(window.sigPro.mapManager.map);
    window.fuelChartManager = new FuelChartManager('echarts-root');

    console.log('⛽ Fuel Cost Tools inicializadas');
};

// Toggle Fuel Cost Panel
window.toggleFuelCostPanel = function () {
    var panel = document.getElementById('fuel-cost-panel');
    if (!panel) return;

    var isOpen = panel.classList.contains('open');
    if (isOpen) {
        panel.classList.remove('open');
    } else {
        panel.classList.add('open');
        // Inicializar si es necesario
        if (!window.fuelCostManager) {
            window.initFuelCostTools();
        }
        // Verificar estado de la red para OSRM
        if (window.fuelCostManager) {
            window.fuelCostManager.checkOSRMStatus();
        }
    }
};

// Toggle Fuel Chart Panel (REMOVED - integrado en DataViz)

// Start route drawing
window.startRouteDrawing = function () {
    if (!window.fuelCostManager) {
        window.initFuelCostTools();
    }
    window.fuelCostManager.startDrawing();
};

// Finish route drawing
window.finishRouteDrawing = function () {
    if (!window.fuelCostManager) {
        alert('Inicia dibujando puntos primero');
        return;
    }
    window.fuelCostManager.finishDrawing();
};

// Change draw mode
window.changeDrawMode = function () {
    var drawModeSelect = document.getElementById('draw-mode');
    if (!drawModeSelect) return;

    var newMode = drawModeSelect.value;

    if (window.fuelCostManager) {
        window.fuelCostManager.drawMode = newMode;

        // Si está dibujando, reiniciar con nuevo modo
        if (window.fuelCostManager.isDrawing) {
            window.fuelCostManager.stopDrawing();
            window.fuelCostManager.startDrawing();
        }
    }

    console.log('🎨 Modo de dibujo cambiado a:', newMode);
};

// Clear route points
window.clearRoutePoints = function () {
    if (!window.fuelCostManager) {
        window.initFuelCostTools();
    }
    window.fuelCostManager.stopDrawing();
    window.fuelCostManager.clearMarkers();
    window.fuelCostManager.routePoints = [];

    // Limpiar resultados
    var resultsDiv = document.getElementById('route-results');
    if (resultsDiv) {
        resultsDiv.innerHTML = '<div class="text-muted" style="font-size: 0.6rem; text-align: center; margin-top: 20px;">Añade puntos para calcular</div>';
    }

    // Limpiar parámetros del Sidebar:
    
    // 1. Resetear inputs de configuración
    document.getElementById('fuel-price').value = "1.20";
    document.getElementById('fuel-efficiency').value = "12";
    document.getElementById('vehicle-type').value = "carro";
    document.getElementById('fuel-speed').value = "60";
    document.getElementById('traffic-delay').value = "0";
    document.getElementById('draw-mode').value = "points";
    document.getElementById('route-mode').value = "direct";

    // 2. Limpiar lista de tramos de velocidad y dejar uno por defecto
    var speedList = document.getElementById('speed-segments-list');
    if (speedList) {
        speedList.innerHTML = '';
        window.addSpeedSegment(); // Añadir el tramo inicial por defecto
    }

    // 3. Ocultar leyenda de colores
    var speedLegend = document.getElementById('speed-color-legend');
    if (speedLegend) {
        speedLegend.style.display = 'none';
    }

    window.fuelCostManager.showNotification('Parámetros y ruta reiniciados', 'info');
};

// Calculate route
window.calculateRoute = function () {
    if (!window.fuelCostManager) {
        alert('Inicia dibujando puntos primero');
        return;
    }
    window.fuelCostManager.calculateRoute();
};

// Apply vehicle preset
window.applyVehiclePreset = function () {
    if (!window.fuelCostManager) {
        window.initFuelCostTools();
    }
    window.fuelCostManager.applyVehiclePreset();
};

// Generate fuel chart (integrated in DataViz panel)
window.generateFuelChart = function () {
    if (!window.fuelChartManager) {
        alert('No hay datos para graficar. Calcula una ruta primero.');
        return;
    }

    var chartType = document.getElementById('fuel-chart-type').value;
    var xVar = document.getElementById('fuel-chart-x').value;
    var yVar = document.getElementById('fuel-chart-y').value;

    var routes = window.fuelChartManager.getComparisonRoutes();

    if (routes.length === 0) {
        alert('Añade al menos una ruta para comparar (botón AÑADIR COMPARACIÓN)');
        return;
    }

    window.fuelChartManager.generateChart(routes, chartType, xVar, yVar);
};

// Update fuel chart setup visibility (called from DataViz panel)
window.updateChartSetup = function () {
    var dataSource = document.getElementById('chart-data-source').value;

    // Hide all setups
    document.getElementById('vector-chart-setup').style.display = 'none';
    document.getElementById('raster-chart-setup').style.display = 'none';
    document.getElementById('fuel-chart-setup').style.display = 'none';

    // Show selected setup
    if (dataSource === 'vector') {
        document.getElementById('vector-chart-setup').style.display = 'block';
    } else if (dataSource === 'raster') {
        document.getElementById('raster-chart-setup').style.display = 'block';
    } else if (dataSource === 'fuel') {
        document.getElementById('fuel-chart-setup').style.display = 'block';
        // Initialize fuel chart manager if needed
        if (!window.fuelChartManager) {
            window.initFuelCostTools();
        }
    }
};

// Generate ECharts (unified function for DataViz panel)
window.generateECharts = function () {
    var dataSource = document.getElementById('chart-data-source').value;

    if (dataSource === 'fuel') {
        window.generateFuelChart();
    } else if (dataSource === 'vector') {
        window.generateChartFromData();
    } else if (dataSource === 'raster') {
        alert('Generando histograma raster...');
        // TODO: Implement raster chart generation
    } else {
        alert('Selecciona una fuente de datos primero');
    }
};

// Add route comparison
window.addRouteComparison = function () {
    if (!window.fuelCostManager || !window.fuelChartManager) {
        alert('Calcula una ruta primero');
        return;
    }

    var routeData = window.fuelCostManager.exportRouteForComparison();
    if (!routeData) return;

    var added = window.fuelChartManager.addRouteComparison(routeData);

    if (added) {
        window.fuelCostManager.showNotification('Ruta añadida para comparación', 'success');
        // Auto-generate chart
        setTimeout(function () {
            window.generateFuelChart();
        }, 300);
    } else {
        window.fuelCostManager.showNotification('Esta ruta ya está en comparación', 'info');
    }
};

// Remove route comparison
window.removeRouteComparison = function (routeId) {
    if (!window.fuelChartManager) return;
    window.fuelChartManager.removeRouteComparison(routeId);
};
