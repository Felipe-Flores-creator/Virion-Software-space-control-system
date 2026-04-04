/**
 * UIManager.js - Gestiona la interfaz de usuario
 */

// El chequeo de conexión ahora reside únicamente en main.js para evitar conflictos

// ============================================
// CONTROL DEL DRAWER (PANEL LATERAL)
// ============================================

window.toggleDrawer = (categoryId, title) => {
    const drawer = document.getElementById('tool-drawer');
    const drawerTitle = document.getElementById('drawer-title');
    const sections = document.querySelectorAll('.drawer-section');
    const categoryBtns = document.querySelectorAll('.category-btn');

    // Desmarcar todos los botones
    categoryBtns.forEach(btn => btn.classList.remove('active'));

    // Verificar si ya está abierto el mismo drawer
    const targetSection = document.getElementById(`drawer-${categoryId}`);
    if (drawer.classList.contains('open') && targetSection && targetSection.classList.contains('active')) {
        window.closeDrawer();
        return;
    }

    // Ocultar todas las secciones
    sections.forEach(sec => sec.classList.remove('active'));

    // Mostrar sección correspondiente y actualizar título
    if (targetSection) {
        targetSection.classList.add('active');
        if (drawerTitle) drawerTitle.textContent = title;
    }

    // Marcar botón activo
    const activeBtn = Array.from(categoryBtns).find(btn =>
        btn.getAttribute('onclick')?.includes(`'${categoryId}'`)
    );
    if (activeBtn) activeBtn.classList.add('active');

    // Abrir drawer
    drawer.classList.add('open');
};

window.closeDrawer = () => {
    const drawer = document.getElementById('tool-drawer');
    if (drawer) drawer.classList.remove('open');

    const categoryBtns = document.querySelectorAll('.category-btn');
    categoryBtns.forEach(btn => btn.classList.remove('active'));
};

// ============================================
// PROYECTOS (LocalStorage)
// ============================================

window.createProject = () => {
    if (typeof bootstrap !== 'undefined') {
        const modal = new bootstrap.Modal(document.getElementById('projectModal'));
        modal.show();
    }
};

window.saveProject = () => {
    if (typeof bootstrap !== 'undefined') {
        const modal = new bootstrap.Modal(document.getElementById('saveModal'));
        modal.show();
    }
};

window.loadProject = () => alert('Cargar proyecto - En desarrollo');

window.saveProjectData = () => {
    const name = document.getElementById('projectName')?.value;

    if (!name) {
        alert('Por favor ingrese un nombre para el proyecto');
        return;
    }

    const projectData = {
        name: name,
        description: document.getElementById('projectDescription')?.value || '',
        crs: document.getElementById('projectCRS')?.value || 'EPSG:4326',
        extent: document.getElementById('projectExtent')?.value || 'current',
        date: new Date().toISOString()
    };

    const projects = JSON.parse(localStorage.getItem('sigProProjects') || '[]');
    projects.push(projectData);
    localStorage.setItem('sigProProjects', JSON.stringify(projects));

    // Cerrar modal
    const modalEl = document.getElementById('projectModal');
    if (typeof bootstrap !== 'undefined' && modalEl) {
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
    }

    alert('Proyecto creado exitosamente');
};

window.confirmSaveProject = () => {
    alert('Proyecto guardado exitosamente');

    const modalEl = document.getElementById('saveModal');
    if (typeof bootstrap !== 'undefined' && modalEl) {
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
    }
};

window.loadProjectsList = () => {
    const projectsList = document.getElementById('projects-list');
    if (!projectsList) return;

    const projects = JSON.parse(localStorage.getItem('sigProProjects') || '[]');
    projectsList.innerHTML = '';

    if (projects.length === 0) {
        projectsList.innerHTML = '<p class="text-muted text-center">No hay proyectos guardados</p>';
        return;
    }

    projects.forEach((project, index) => {
        const projectItem = document.createElement('div');
        projectItem.className = 'project-item';
        projectItem.innerHTML = `
            <div class="project-item-header">
                <div>
                    <div class="project-title">${project.name}</div>
                    <small class="text-muted">${project.description || 'Sin descripción'}</small>
                </div>
                <div class="project-date">${new Date(project.date).toLocaleDateString()}</div>
            </div>
            <div class="project-actions">
                <button class="btn btn-info btn-sm" onclick="window.openProject(${index})">
                    <i class="bi bi-box-arrow-in-right"></i>
                </button>
                <button class="btn btn-danger btn-sm" onclick="window.deleteProject(${index})">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;
        projectsList.appendChild(projectItem);
    });
};

window.openProject = (index) => {
    const projects = JSON.parse(localStorage.getItem('sigProProjects') || '[]');
    const project = projects[index];
    if (project) {
        alert(`Cargando proyecto: ${project.name}`);
    }
};

window.deleteProject = (index) => {
    if (confirm('¿Está seguro de eliminar este proyecto?')) {
        const projects = JSON.parse(localStorage.getItem('sigProProjects') || '[]');
        projects.splice(index, 1);
        localStorage.setItem('sigProProjects', JSON.stringify(projects));
        window.loadProjectsList();
    }
};

console.log('✅ UIManager cargado');
