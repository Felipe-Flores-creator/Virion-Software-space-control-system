/**
 * Mode3DManager.js — Motor de Navegación 3D Profesional
 * Arquitectura similar a QGIS 3D Map View:
 *  - Click Derecho + Arrastre: Inclinación vertical (Tilt) con interpolación suave.
 *  - Click Izquierdo: Panning nativo de Leaflet (sin interferencia).
 *  - Rueda del mouse: Zoom nativo de Leaflet (sin interferencia).
 *  - Loop de animación normalizado por deltaTime para framerate constante.
 *  - Sin rotación en eje Z (siempre bloqueado en 0°).
 */

const Mode3DController = {
    // ── Estado de vista 3D ────────────────────────────────────────────────────
    isActive: false,
    currentTilt: 0,      // Grados actuales (interpolados)
    targetTilt: 0,       // Grados objetivo (solucionados por el usuario)

    // ── Constantes de navegación ──────────────────────────────────────────────
    TILT_MIN: 0,         // 0° = Vista plana (como QGIS en 2D)
    TILT_MAX: 80,        // 80° = Máxima inclinación permitida
    TILT_DEFAULT: 45,    // Inclinación inicial al activar el modo
    TILT_SPEED: 0.4,     // Grados por pixel de movimiento del mouse
    LERP_SPEED: 8.0,     // Velocidad de interpolación suave (unidades/segundo)
    PERSPECTIVE: 3000,   // px de perspectiva CSS

    // ── Estado interno de controladores ───────────────────────────────────────
    _isTilting: false,
    _lastMouseY: 0,
    _rafPending: false,  // Throttle del mousemove con requestAnimationFrame
    _lastFrameTime: 0,

    // ── Bind de handlers para poder removerlos limpiamente ────────────────────
    _handlers: {},

    // =========================================================================
    // INICIALIZACIÓN
    // =========================================================================
    init: function () {
        if (document.getElementById('mode-3d-styles')) return;

        // Inyectar estilos CSS del motor 3D
        const style = document.createElement('style');
        style.id = 'mode-3d-styles';
        style.innerHTML = `
            #map.mode-3d-active {
                background: #111318 !important;
                overflow: visible !important;
                /* CLAVE: perspective en el PADRE hace que el hijo rote
                   correctamente sin que los tiles desaparezcan (efecto mapa negro). 
                   Equivalente al comportamiento de Mapbox GL / Google Maps. */
                perspective: 2400px;
            }
            #map.mode-3d-active .leaflet-map-pane {
                transform-style: preserve-3d !important;
                /* Pivote 60% para ver mejor los laterales de la extrusión 3D */
                transform-origin: 50% 60% !important; 
                will-change: transform, rotate, scale;
            }
            .leaflet-tile-pane {
                transform: translateZ(0);
            }

            /* Hint de navegación — visible solo en modo 3D activo */
            .nav-help-hint {
                position: absolute;
                bottom: 20px;
                right: 20px;
                z-index: 10000;
                background: rgba(15, 15, 20, 0.82);
                color: #e0e0e0;
                padding: 10px 15px;
                border-radius: 8px;
                font-size: 11px;
                font-family: 'Segoe UI', Arial, sans-serif;
                border: 1px solid rgba(255, 170, 0, 0.3);
                pointer-events: none;
                display: none;
                line-height: 1.8;
                backdrop-filter: blur(4px);
            }
            #map.mode-3d-active .nav-help-hint {
                display: block;
            }
            .nav-help-hint b {
                color: #ffaa00;
            }

            /* Cursor visual cuando se está inclinando */
            #map.mode-3d-active.tilting-active {
                cursor: ns-resize !important;
            }

            .leaflet-overlay-pane svg path {
                backface-visibility: hidden;
            }
        `;
        document.head.appendChild(style);

        this._createHintUI();
        this._bindEvents();
        this._startLoop();
    },

    // =========================================================================
    // UI: Hint de controles
    // =========================================================================
    _createHintUI: function () {
        if (document.getElementById('nav-hint')) return;
        const hint = document.createElement('div');
        hint.id = 'nav-hint';
        hint.className = 'nav-help-hint';
        hint.innerHTML = `
            <div><b>Click Izquierdo:</b> Mover Mapa (Panning)</div>
            <div><b>Click Derecho + Arrastre:</b> Inclinar Vista</div>
            <div><b>Rueda:</b> Zoom</div>
        `;
        const mapEl = document.getElementById('map');
        if (mapEl) mapEl.appendChild(hint);
    },

    // =========================================================================
    // CONTROLADORES DE EVENTOS
    // =========================================================================
    _bindEvents: function () {
        const mapEl = document.getElementById('map');
        if (!mapEl) return;

        // Guardamos referencias para poder removerlos con removeEventListener
        this._handlers.mousedown = (e) => this._onMouseDown(e);
        this._handlers.mousemove = (e) => this._onMouseMoveQueued(e);
        this._handlers.mouseup = (e) => this._onMouseUp(e);
        this._handlers.contextmenu = (e) => { if (this.isActive) e.preventDefault(); };

        // ALERTA: Quitamos {capture: true} porque bloquea eventos de Leaflet para el Panningnativo
        mapEl.addEventListener('mousedown', this._handlers.mousedown);
        mapEl.addEventListener('contextmenu', this._handlers.contextmenu, { capture: true });
        window.addEventListener('mousemove', this._handlers.mousemove);
        window.addEventListener('mouseup', this._handlers.mouseup);
    },

    _onMouseDown: function (e) {
        if (!this.isActive) return;

        if (e.button === 2) {
            // Click Derecho → Modo Inclinación (Tilt)
            this._isTilting = true;
            this._lastMouseY = e.clientY;
            document.getElementById('map')?.classList.add('tilting-active');

            // NO se deshabilita dragging de Leaflet porque Leaflet ignora el botón derecho
            // por diseño nativo. Deshabilitarlo causaba pérdida permanente del pan con
            // click izquierdo si el mouseup no disparaba dentro de la ventana.
            e.preventDefault();   // Solo evitar el menú contextual del browser
            e.stopPropagation();
        }
        // Click Izquierdo → Leaflet maneja el panning de forma nativa (sin interrupción)
    },

    /**
     * Encola el procesamiento del mousemove en el próximo frame de rAF.
     * Evita procesar eventos más rápido que la tasa de refresco del monitor (throttle).
     */
    _pendingMouseEvent: null,
    _onMouseMoveQueued: function (e) {
        if (!this.isActive || !this._isTilting) return;
        this._pendingMouseEvent = e;
        if (!this._rafPending) {
            this._rafPending = true;
            requestAnimationFrame(() => {
                this._processPendingMouse();
                this._rafPending = false;
            });
        }
    },

    _processPendingMouse: function () {
        const e = this._pendingMouseEvent;
        if (!e || !this._isTilting) return;

        const dy = e.clientY - this._lastMouseY;
        // Movimiento hacia arriba (dy negativo) → más inclinación (tilt mayor)
        // Movimiento hacia abajo (dy positivo) → menos inclinación (volver a plano)
        this.targetTilt = Math.max(
            this.TILT_MIN,
            Math.min(this.TILT_MAX, this.targetTilt - dy * this.TILT_SPEED)
        );
        this._lastMouseY = e.clientY;
        this._pendingMouseEvent = null;
    },

    _onMouseUp: function (e) {
        if (!this.isActive) return;

        if (e.button === 2 && this._isTilting) {
            this._isTilting = false;
            document.getElementById('map')?.classList.remove('tilting-active');
            // No hace falta re-habilitar dragging porque nunca se deshabilitó
        }
    },

    // =========================================================================
    // ANIMATION LOOP — normalizado por deltaTime
    // =========================================================================
    _startLoop: function () {
        const loop = (timestamp) => {
            if (this._lastFrameTime === 0) this._lastFrameTime = timestamp;
            const dt = Math.min((timestamp - this._lastFrameTime) / 1000, 0.1); // en segundos, clamped a 100ms
            this._lastFrameTime = timestamp;

            if (this.isActive) {
                // Interpolación exponencial suave (independiente del framerate)
                const alpha = 1 - Math.exp(-this.LERP_SPEED * dt);
                this.currentTilt += (this.targetTilt - this.currentTilt) * alpha;

                // ALERTA: CLAVE PROFESIONAL
                // Leaflet usa la propiedad 'transform' para el Panning (translate3d).
                // Si nosotros usamos 'transform' para rotar, bloqueamos el movimiento.
                // Usamos las nuevas propiedades CSS independientes 'rotate' y 'scale' 
                // que NO interfieren con el transform de Leaflet.
                const pane = document.querySelector('.leaflet-map-pane');
                if (pane) {
                    pane.style.rotate = `x ${this.currentTilt.toFixed(3)}deg`;
                    pane.style.scale = `1.15`; // Ligera escala para cubrir el horizonte
                }
            }

            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    },

    // =========================================================================
    // TOGGLE DEL PANEL 3D
    // =========================================================================
    togglePanel: function () {
        const panel = document.getElementById('mode-3d-panel');
        if (!panel) return;
        const isOpen = panel.classList.toggle('open');
        this.isActive = isOpen;
        const mapEl = document.getElementById('map');
        const leafletMap = window.sigPro?.mapManager?.map;

        if (isOpen) {
            mapEl?.classList.add('mode-3d-active');
            // Iniciar con inclinación predeterminada, transición suave desde 0
            this.currentTilt = 0;
            this.targetTilt = this.TILT_DEFAULT;
            this._lastFrameTime = 0;

            if (leafletMap) {
                // Garantizar que el dragging esté activo al entrar en modo 3D
                leafletMap.dragging.enable();
                // invalidateSize le avisa a Leaflet que recalcule el viewport
                leafletMap.invalidateSize({ animate: false });
            }
            this.populateLayerSelect();
        } else {
            this._isTilting = false;
            mapEl?.classList.remove('tilting-active');
            if (leafletMap) leafletMap.dragging.enable();
            this._resetEnvironment();
        }
    },

    // =========================================================================
    // RESET DEL ENTORNO AL SALIR DEL MODO 3D
    // =========================================================================
    _resetEnvironment: function () {
        const mapEl = document.getElementById('map');
        const pane = document.querySelector('.leaflet-map-pane');

        if (mapEl) mapEl.classList.remove('mode-3d-active');
        if (pane) {
            pane.style.transform = 'none';
            pane.style.rotate = 'none';
            pane.style.scale = 'none';
        }

        this.targetTilt = 0;
        this.currentTilt = 0;

        // Limpiar transformaciones residuales en elementos de capas
        window.currentLayers?.forEach(layerObj => {
            if (layerObj.layer?.eachLayer) {
                layerObj.layer.eachLayer(l => {
                    const el = l.getElement ? l.getElement() : null;
                    if (el) {
                        el.style.transform = '';
                        el.style.filter = '';
                    }
                });
            }
        });
    },

    // =========================================================================
    // SELECTOR DE CAPAS Y ATRIBUTOS
    // =========================================================================
    populateLayerSelect: function () {
        const select = document.getElementById('mode3d-layer-select');
        if (!select) return;
        select.innerHTML = '<option value="">Selecciona Vector...</option>';
        window.currentLayers?.forEach((l, i) => {
            if (!l.isRaster) {
                const opt = document.createElement('option');
                opt.value = i;
                opt.textContent = l.name;
                select.appendChild(opt);
            }
        });
    },

    updateAttributes: function () {
        const sel = document.getElementById('mode3d-layer-select')?.value;
        const attrSel = document.getElementById('mode3d-attribute-select');
        if (!attrSel || sel === '' || sel == null) return;

        const data = window.currentLayers[sel];
        if (!data?.layer) return;

        const attrs = new Set();
        let count = 0;
        data.layer.eachLayer(l => {
            if (count < 30 && l.feature?.properties) {
                Object.keys(l.feature.properties).forEach(k => attrs.add(k));
                count++;
            }
        });

        attrSel.innerHTML = '<option value="">Selecciona Atributo...</option>';
        Array.from(attrs).sort().forEach(k => {
            const opt = document.createElement('option');
            opt.value = k;
            opt.textContent = k;
            attrSel.appendChild(opt);
        });
    },

    // =========================================================================
    // EXTRUSIÓN 3D DE GEOMETRÍAS
    // =========================================================================
    render: function () {
        const layerSel = document.getElementById('mode3d-layer-select');
        const attrSel = document.getElementById('mode3d-attribute-select');
        const multEl = document.getElementById('mode3d-multiplier');
        const colorEl = document.getElementById('mode3d-base-color');

        if (!layerSel || !attrSel) return;

        const sel = layerSel.value;
        const attr = attrSel.value;
        const mult = parseFloat(multEl?.value) || 1.0;
        const bColor = colorEl?.value || '#ffaa00';

        if (sel === '' || !attr) return;

        const data = window.currentLayers[sel];
        if (!data?.layer?.eachLayer) return;

        // Calcular rango de valores para normalización
        let maxV = -Infinity;
        let minV = Infinity;
        data.layer.eachLayer(l => {
            if (l.feature?.properties) {
                const v = parseFloat(l.feature.properties[attr]);
                if (!isNaN(v)) {
                    if (v > maxV) maxV = v;
                    if (v < minV) minV = v;
                }
            }
        });

        const range = maxV !== minV ? maxV - minV : 1;

        // Aplicar extrusión a cada entidad
        data.layer.eachLayer(l => {
            const el = l.getElement ? l.getElement() : null;
            if (!el || !l.feature?.properties) return;

            // ALERTA: Extrusión proporcional basada en datos (Senior GIS Logic)
            const v = parseFloat(l.feature.properties[attr]);
            const val = isNaN(v) ? 0 : v;

            // Si el rango es 0, usamos h=100 para todos, si no, escalamos proporcionalmente
            let h = 0;
            if (maxV === minV) {
                h = 100 * mult;
            } else {
                h = ((val - minV) / range) * 250 * mult;
            }

            // Asegurar altura mínima visual si el valor es mayor a 0
            if (val > 0 && h < 2) h = 2;

            // Respetar el color de simbología existente (Regla 3 del usuario)
            // ALERTA: Usar el color de simbología de Leaflet si existe
            const color = el.getAttribute('fill') || el.style.fill || bColor;
            el.setAttribute('fill', color);
            el.style.fill = color;
            el.style.stroke = chroma(color).brighten(1).hex();
            el.style.strokeWidth = '0.5px';

            // Extrusión real 3D por CSS Perspective
            el.style.transform = `translateZ(${h}px)`;

            // Sombra progresiva para efecto volumétrico
            const wallColor = chroma(color).darken(2.5).hex();
            const shadowColor = chroma('#000').alpha(0.2).css();
            const steps = 3;
            const blur = Math.max(1, h / 15);
            let filterStr = '';
            for (let i = 1; i <= steps; i++) {
                filterStr += `drop-shadow(0 ${(h / steps) * i}px ${blur}px ${chroma(wallColor).alpha(0.6).css()}) `;
            }
            filterStr += `drop-shadow(0 ${h}px 4px ${shadowColor}) brightness(1.05)`;
            el.style.filter = filterStr;
            el.style.backfaceVisibility = 'hidden';
        });
    }
};

// ── API Pública Global ─────────────────────────────────────────────────────────
window.Mode3DController = Mode3DController;
window.toggle3DModePanel = () => Mode3DController.togglePanel();
window.update3DModeAttributes = () => Mode3DController.updateAttributes();
window.render3DExtrusion = () => Mode3DController.render();
window.close3DExtrusion = () => Mode3DController.togglePanel();
window.populate3DLayerSelect = () => Mode3DController.populateLayerSelect();

// Auto-inicializar
Mode3DController.init();
