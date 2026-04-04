/**
 * ResizePanel.js - Gestiona el redimensionamiento y movimiento de paneles laterales
 * Permite expandir/retraer paneles cambiando ancho y alto, y moverlos desde el header
 */

(function () {
    'use strict';

    // Configuración de tamaños mínimos y máximos
    const MIN_WIDTH = 200;
    const MAX_WIDTH = 600;
    const MIN_HEIGHT = 150;
    const MAX_HEIGHT = 800;

    // Estado actual del redimensionamiento
    let currentResize = null;

    // Estado actual del arrastre
    let currentDrag = null;

    /**
     * Inicializa los resize handles y drag para un panel
     * @param {string} panelId - ID del panel
     * @param {object} options - Opciones de redimensionamiento
     */
    function initPanel(panelId, options = {}) {
        const panel = document.getElementById(panelId);
        if (!panel) {
            console.warn(`Panel ${panelId} no encontrado`);
            return;
        }

        const {
            resizableWidth = true,
            resizableHeight = false,
            draggable = true,
            minWidth = MIN_WIDTH,
            maxWidth = MAX_WIDTH,
            minHeight = MIN_HEIGHT,
            maxHeight = MAX_HEIGHT
        } = options;

        // Inicializar drag desde el header
        if (draggable) {
            initPanelDrag(panel);
        }

        // Crear resize handle derecho (ancho)
        if (resizableWidth) {
            const rightHandle = document.createElement('div');
            rightHandle.className = 'resize-handle right';
            rightHandle.setAttribute('data-resize', 'right');
            panel.appendChild(rightHandle);
            initResizeHandler(rightHandle, panel, 'width', minWidth, maxWidth);
        }

        // Crear resize handle inferior (alto)
        if (resizableHeight) {
            const bottomHandle = document.createElement('div');
            bottomHandle.className = 'resize-handle bottom';
            bottomHandle.setAttribute('data-resize', 'bottom');
            panel.appendChild(bottomHandle);
            initResizeHandler(bottomHandle, panel, 'height', minHeight, maxHeight);
        }

        // Crear resize handle de esquina (ancho + alto)
        if (resizableWidth && resizableHeight) {
            const cornerHandle = document.createElement('div');
            cornerHandle.className = 'resize-handle corner';
            cornerHandle.setAttribute('data-resize', 'corner');
            panel.appendChild(cornerHandle);
            initCornerHandler(cornerHandle, panel, minWidth, maxWidth, minHeight, maxHeight);
        }

        console.log(`✅ Panel ${panelId} inicializado con redimensionamiento y arrastre`);
    }

    /**
     * Inicializa el arrastre del panel desde el header
     */
    function initPanelDrag(panel) {
        const header = panel.querySelector('.panel-header');
        if (!header) {
            console.warn(`Panel ${panel.id} no tiene .panel-header para arrastre`);
            return;
        }

        header.classList.add('panel-drag-handle');

        header.addEventListener('mousedown', function (e) {
            // Solo permitir arrastre con click izquierdo
            if (e.button !== 0) return;

            // No iniciar arrastre si se hizo click en un botón
            if (e.target.closest('button')) return;

            e.preventDefault();
            e.stopPropagation();

            const rect = panel.getBoundingClientRect();

            currentDrag = {
                panel: panel,
                startX: e.clientX,
                startY: e.clientY,
                startLeft: rect.left,
                startTop: rect.top,
                originalWidth: rect.width,
                originalHeight: rect.height
            };

            panel.classList.add('panel-dragging');
            document.body.style.cursor = 'move';
        });
    }

    /**
     * Inicializa el handler para redimensionar en una dirección
     */
    function initResizeHandler(handle, panel, direction, minSize, maxSize) {
        handle.addEventListener('mousedown', function (e) {
            e.preventDefault();
            e.stopPropagation();

            const rect = panel.getBoundingClientRect();
            const startX = e.clientX;
            const startY = e.clientY;
            const startWidth = rect.width;
            const startHeight = rect.height;

            currentResize = {
                panel: panel,
                direction: direction,
                startX: startX,
                startY: startY,
                startWidth: startWidth,
                startHeight: startHeight,
                minSize: minSize,
                maxSize: maxSize
            };

            panel.classList.add('panel-dragging');
            document.body.style.cursor = direction === 'width' ? 'ew-resize' : 'ns-resize';
        });
    }

    /**
     * Inicializa el handler para redimensionar en esquina (ancho + alto)
     */
    function initCornerHandler(handle, panel, minWidth, maxWidth, minHeight, maxHeight) {
        handle.addEventListener('mousedown', function (e) {
            e.preventDefault();
            e.stopPropagation();

            const rect = panel.getBoundingClientRect();
            const startX = e.clientX;
            const startY = e.clientY;
            const startWidth = rect.width;
            const startHeight = rect.height;

            currentResize = {
                panel: panel,
                direction: 'corner',
                startX: startX,
                startY: startY,
                startWidth: startWidth,
                startHeight: startHeight,
                minWidth: minWidth,
                maxWidth: maxWidth,
                minHeight: minHeight,
                maxHeight: maxHeight
            };

            panel.classList.add('panel-dragging');
            document.body.style.cursor = 'nwse-resize';
        });
    }

    /**
     * Maneja el evento de mousemove global para redimensionar y arrastrar
     */
    function handleMouseMove(e) {
        // Manejar redimensionamiento
        if (currentResize) {
            const { panel, direction, startX, startY, startWidth, startHeight,
                minWidth, maxWidth, minHeight, maxHeight } = currentResize;

            if (direction === 'width' || direction === 'corner') {
                const deltaX = e.clientX - startX;
                let newWidth = startWidth + deltaX;
                newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
                panel.style.width = newWidth + 'px';
            }

            if (direction === 'height' || direction === 'corner') {
                const deltaY = e.clientY - startY;
                let newHeight = startHeight + deltaY;
                newHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));
                panel.style.height = newHeight + 'px';
            }

            // Disparar evento de resize para que otros componentes se ajusten
            panel.dispatchEvent(new CustomEvent('panelresize', {
                detail: { width: panel.offsetWidth, height: panel.offsetHeight }
            }));
        }

        // Manejar arrastre
        if (currentDrag) {
            const { panel, startX, startY, startLeft, startTop } = currentDrag;

            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;

            const newLeft = startLeft + deltaX;
            const newTop = startTop + deltaY;

            // Limitar dentro de la ventana
            const maxX = window.innerWidth - panel.offsetWidth;
            const maxY = window.innerHeight - panel.offsetHeight;

            panel.style.left = Math.max(0, Math.min(newLeft, maxX)) + 'px';
            panel.style.top = Math.max(0, Math.min(newTop, maxY)) + 'px';

            // Resetear right para que left funcione correctamente
            panel.style.right = 'auto';
        }
    }

    /**
     * Maneja el evento de mouseup global para finalizar redimensionamiento y arrastre
     */
    function handleMouseUp() {
        if (currentResize) {
            currentResize.panel.classList.remove('panel-dragging');
            currentResize = null;
            document.body.style.cursor = '';
        }

        if (currentDrag) {
            currentDrag.panel.classList.remove('panel-dragging');
            currentDrag = null;
            document.body.style.cursor = '';
        }
    }

    // Event listeners globales
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // Exponer funciones globalmente
    window.ResizePanel = {
        init: initPanel,
        initAll: function () {
            // Inicializar todos los paneles por defecto
            this.init('chart-manager-panel', {
                resizableWidth: true,
                resizableHeight: true,
                draggable: true,
                minWidth: 250,
                maxWidth: 500,
                minHeight: 200,
                maxHeight: 600
            });

            this.init('hexbin-panel', {
                resizableWidth: true,
                resizableHeight: true,
                draggable: true,
                minWidth: 250,
                maxWidth: 450,
                minHeight: 200,
                maxHeight: 600
            });

            this.init('color-manager-panel', {
                resizableWidth: true,
                resizableHeight: false,
                draggable: true,
                minWidth: 200,
                maxWidth: 400
            });

            this.init('right-panel', {
                resizableWidth: true,
                resizableHeight: true,
                draggable: true,
                minWidth: 180,
                maxWidth: 350,
                minHeight: 200,
                maxHeight: 700
            });

            this.init('lens-panel', {
                resizableWidth: true,
                resizableHeight: true,
                draggable: true,
                minWidth: 250,
                maxWidth: 450,
                minHeight: 150,
                maxHeight: 400
            });

            this.init('fuel-cost-panel', {
                resizableWidth: true,
                resizableHeight: true,
                draggable: true,
                minWidth: 280,
                maxWidth: 450,
                minHeight: 300,
                maxHeight: 700
            });

            this.init('floating-chart-panel', {
                resizableWidth: true,
                resizableHeight: true,
                draggable: true,
                minWidth: 350,
                maxWidth: 700,
                minHeight: 300,
                maxHeight: 600
            });

            console.log('✅ Todos los paneles inicializados con redimensionamiento y arrastre');
        }
    };

    // Auto-inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            window.ResizePanel.initAll();
        });
    } else {
        window.ResizePanel.initAll();
    }

})();
