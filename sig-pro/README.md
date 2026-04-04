# SIG Pro - Sistema de Información Geográfica Profesional

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)
![Python](https://img.shields.io/badge/python-%3E%3D3.8-blue.svg)
![Status](https://img.shields.io/badge/status-active-success.svg)

**Sistema de Información Geográfica profesional, portable y de código abierto**

[Características](#-características-principales) •
[Instalación](#-instalación) •
[Uso](#-uso-básico) •
[Configuración](#-configuración-avanzada) •
[Contribuir](#-contribución) •
[Licencia](#-licencia)

</div>

---

## 🎯 Descripción

SIG Pro es un **Sistema de Información Geográfica** profesional desarrollado como una aplicación de escritorio portable usando Electron. Combina una interfaz web moderna con un backend Python para proporcionar herramientas avanzadas de análisis geoespacial, visualización 3D y gestión de proyectos GIS.

### ✨ ¿Por qué SIG Pro?

- 🚀 **Portable**: Se ejecuta en cualquier computadora sin instalaciones complejas
- 🎨 **Accesible**: Interfaz intuitiva para usuarios principiantes y avanzados
- 🔬 **Potente**: Backend Python para análisis geoespacial avanzado
- 🌐 **Moderno**: Tecnologías web actuales con actualizaciones fáciles
- 🔓 **Open Source**: Código abierto para contribuciones y personalización

## 🚀 Características Principales

### 🗺️ **Visualización y Análisis**
- **Mapas Base**: OpenStreetMap, Satélite, Topográfico
- **Capas Vectoriales**: Puntos, Líneas, Polígonos con estilos personalizados
- **Capas Raster**: Imágenes georreferenciadas, DEM, ortofotos
- **Visualización 3D**: Vista tridimensional con Three.js
- **Sistema de Coordenadas**: Soporte para múltiples CRS (WGS84, UTM, etc.)

### 🛠️ **Herramientas de Dibujo y Edición**
- **Dibujo de Geometrías**: Polígonos, Líneas, Puntos
- **Medición**: Distancias, Áreas, Perímetros
- **Edición de Capas**: Crear, Editar, Eliminar geometrías
- **Estilos Personalizados**: Colores, grosores, transparencias

### 📤 **Importación y Exportación**
- **Formatos Vectoriales**: GeoJSON, Shapefile, KML, GPX, CSV
- **Formatos Raster**: GeoTIFF, PNG, JPG con georreferenciación
- **Proyecciones**: Transformación entre sistemas de coordenadas
- **Validación**: Comprobación de geometrías y metadatos

### 📁 **Gestión de Proyectos**
- **Creación de Proyectos**: Nombre, descripción, sistema de coordenadas
- **Guardado y Carga**: Persistencia de proyectos y capas
- **Historial**: Proyectos recientes y acceso rápido
- **Organización**: Estructura de carpetas y metadatos

### 🔧 **Backend Python**
- **Procesamiento Geoespacial**: GDAL/OGR, Rasterio, Shapely
- **API REST**: Flask para comunicación frontend-backend
- **Análisis Avanzado**: Operaciones espaciales, estadísticas
- **Formato de Datos**: Conversión y validación de formatos

## 📦 Estructura del Proyecto

```
sig-pro/
├── src/                      # Código fuente principal (JavaScript)
│   ├── main.js              # Inicialización de la aplicación
│   ├── core/                # Módulos principales
│   │   ├── MapManager.js    # Gestión del mapa
│   │   ├── LayerManager.js  # Gestión de capas
│   │   ├── DrawManager.js   # Herramientas de dibujo
│   │   └── ImportManager.js # Importación de datos
│   ├── ui/                  # Componentes de interfaz
│   │   ├── StatusBar.js     # Barra de estado
│   │   └── LayerPanel.js    # Panel de capas
│   └── styles/              # Estilos CSS
├── python_api/               # Backend Python
│   ├── app.py               # API Flask principal
│   ├── client.py            # Cliente Python para pruebas
│   └── requirements.txt     # Dependencias Python
├── electron-app/             # Aplicación Electron (frontend)
│   ├── main.js              # Proceso principal de Electron
│   ├── preload.js           # Comunicación segura frontend-backend
│   ├── index.html           # Interfaz web empaquetada
│   ├── package.json         # Dependencias Electron
│   ├── assets/              # Iconos y recursos
│   └── README.md            # Documentación Electron
├── dist/                     # Build de producción (generado)
├── sig_env/                  # Entorno virtual Python (no versionado)
├── requirements.txt          # Dependencias Python
├── package.json             # Dependencias Node.js
├── vite.config.js           # Configuración Vite
├── install.bat              # Instalador Windows
├── start_backend.bat        # Iniciador del backend
├── INICIAR_TODO.bat         # Iniciador completo
├── .gitignore               # Archivos excluidos de git
├── .gitattributes           # Configuración de git
├── LICENSE                  # Licencia MIT
└── README.md                # Esta documentación
```

> **Nota**: Los directorios `node_modules/`, `sig_env/` y `dist/` no se versionan en Git. Se generan automáticamente durante la instalación.

## 🛠️ Instalación y Ejecución

### Requisitos del Sistema

- **Node.js**: Versión 18 o superior
- **Python**: Versión 3.8 o superior
- **Sistema Operativo**: Windows 10+, macOS 10.14+, Linux moderno

### ⚡ Instalación Rápida (Windows)

1. **Ejecuta el instalador**:
   ```bash
   install.bat
   ```

2. **Inicia la aplicación**:
   ```bash
   INICIAR_TODO.bat
   ```

   O inicia componentes por separado:
   ```bash
   start_backend.bat    # Inicia el backend Python
   ```

### 🔧 Instalación Manual

#### 1. Configurar Backend Python

```bash
# Crear entorno virtual
python -m venv sig_env

# Activar entorno (Windows)
sig_env\Scripts\activate

# Activar entorno (macOS/Linux)
source sig_env/bin/activate

# Instalar dependencias
pip install -r requirements.txt
```

#### 2. Configurar Frontend

```bash
# Instalar dependencias Node.js
npm install

# O si usas la carpeta electron-app
cd electron-app
npm install
```

#### 3. Iniciar la Aplicación

```bash
# Terminal 1 - Backend Python
cd python_api
python app.py

# Terminal 2 - Frontend (en otra terminal)
npm run dev

# O para Electron
cd electron-app
npm start
```

## 🎮 Uso Básico

### Iniciar la Aplicación
1. **Ejecuta** `npm start` en la carpeta `electron-app`
2. **Espera** a que inicie el servidor Python (verificado en la esquina superior derecha)
3. **Comienza** a usar las herramientas GIS

### Funciones Principales

#### **Gestión de Capas**
- **Añadir Capa Base**: Toolbar → OpenStreetMap/Satélite
- **Importar Datos**: Panel lateral → Importar Datos → Seleccionar archivo
- **Gestionar Capas**: Panel lateral → Capas → Controlar visibilidad y estilos

#### **Herramientas de Dibujo**
- **Dibujar Polígono**: Panel lateral → Herramientas → Dibujar Polígono
- **Añadir Marcador**: Panel lateral → Herramientas → Añadir Marcador
- **Medir Distancia**: Panel lateral → Herramientas → Medir Distancia

#### **Gestión de Proyectos**
- **Nuevo Proyecto**: Panel lateral → Proyectos → Nuevo Proyecto
- **Guardar Proyecto**: Panel lateral → Proyectos → Guardar Proyecto
- **Abrir Proyecto**: Panel lateral → Proyectos → Abrir Proyecto

#### **Importación de Datos**
- **Formatos Soportados**: GeoJSON, KML, GPX, Shapefile, CSV, GeoTIFF
- **Proceso**: Seleccionar archivo → Validar → Cargar → Visualizar

## 🔧 Configuración Avanzada

### Variables de Entorno
Crea un archivo `.env` en `electron-app/`:

```bash
PYTHON_PORT=5000
NODE_ENV=development
PYTHON_PATH=/usr/bin/python3
```

### Personalización de Iconos
1. **Crea iconos** en PNG (512x512px)
2. **Convierte** a ICO, ICNS, PNG según la plataforma
3. **Reemplaza** en `electron-app/assets/`
4. **Reconstruye** con `npm run build:win`

### Configuración del Backend
Edita `python_api/app.py` para modificar:
- Puerto de escucha
- Rutas de archivos
- Configuración de CORS
- Límites de carga

## 🐛 Solución de Problemas

### Errores Comunes

#### "No se pudo iniciar el servidor Python"
- **Solución**: Verifica que Python esté instalado y en el PATH
- **Alternativa**: Ejecuta manualmente `python python_api/app.py`

#### "Conexión al servidor fallida"
- **Solución**: Espera 10-15 segundos a que el servidor inicie
- **Alternativa**: Reinicia la aplicación

#### "No se cargan las capas"
- **Solución**: Verifica formatos soportados y estructura de archivos
- **Alternativa**: Revisa consola de desarrollo (F12) para errores

### Herramientas de Depuración
- **Consola de Desarrollo**: `Ctrl+Shift+I` o `F12`
- **Logs de Python**: Terminal de inicio de aplicación
- **Logs de Electron**: `~/.config/SIG Pro/logs/` o `%APPDATA%/SIG Pro/logs/`

## 📋 Dependencias

### Frontend (Electron)
- **Electron**: 28.0.0
- **Bootstrap**: 5.3.2
- **Leaflet**: 1.9.4
- **Bootstrap Icons**: 1.11.3

### Backend (Python)
- **Flask**: 3.0.0
- **GDAL**: 3.8.0+
- **Rasterio**: 1.3.0+
- **Shapely**: 2.0.0+
- **Folium**: 0.14.0+

### Construcción
- **Electron Builder**: 24.13.3
- **Concurrently**: 8.2.2
- **Node.js**: 18+

## 🔄 Construcción de Instaladores

### Para Windows
```bash
cd electron-app
npm run build:win
```

### Para macOS
```bash
cd electron-app
npm run build:mac
```

### Para Linux
```bash
cd electron-app
npm run build:linux
```

Los instaladores se generarán en la carpeta `dist/`.

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo [LICENSE](LICENSE) para más detalles.

## 🤝 Contribución

1. **Fork** el proyecto
2. **Crea** una rama (`git checkout -b feature/AmazingFeature`)
3. **Commit** tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. **Push** a la rama (`git push origin feature/AmazingFeature`)
5. **Abre** un Pull Request

## 📞 Soporte y Contacto

- **Issues**: [Reportar problemas](https://github.com/Felipe_Flores/SIG-Pro/issues)
- **Discusiones**: [GitHub Discussions](https://github.com/Felipe_Flores/SIG-Pro/discussions)
- **Documentación**: [Wiki](https://github.com/Felipe_Flores/SIG-Pro/wiki)

---

<div align="center">

**Transformando la forma en que trabajas con datos geoespaciales** 🗺️✨

Hecho con ❤️ por [Felipe Flores](https://github.com/Felipe_Flores)

</div>