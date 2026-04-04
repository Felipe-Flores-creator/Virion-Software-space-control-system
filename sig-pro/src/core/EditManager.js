/**
 * Clase que gestiona edición de geometrías
 */
export class EditManager {
    constructor(mapManager, layerManager) {
        this.mapManager = mapManager;
        this.layerManager = layerManager;
        this.isEditing = false;
    }

    toggleEdit() {
        this.isEditing = !this.isEditing;
        console.log('Edición:', this.isEditing ? 'activada' : 'desactivada');
    }

    enableVertexEdit(layerName) {
        console.log('Editar vértices:', layerName);
    }

    undo(layerName) {
        console.log('Deshacer:', layerName);
    }

    redo(layerName) {
        console.log('Rehacer:', layerName);
    }

    deleteFeature(layerName) {
        console.log('Eliminar:', layerName);
    }

    saveEdits() {
        console.log('Guardar ediciones');
    }
}
