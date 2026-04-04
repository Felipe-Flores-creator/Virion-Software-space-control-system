# SIG Pro - Aplicación de Escritorio Electron

## 🎯 Descripción

SIG Pro es un Sistema de Información Geográfica profesional convertido a una aplicación de escritorio portable usando Electron. Combina una interfaz web moderna con un backend Python para procesamiento geoespacial avanzado.

## 🚀 Características

- **Interfaz Web Moderna**: Bootstrap 5 + Leaflet.js
- **Backend Python**: Flask + GDAL/OGR para procesamiento geoespacial
- **Aplicación Portable**: Se ejecuta como cualquier programa de escritorio
- **Sin Instalaciones**: No requiere Python, Node.js o navegadores
- **Multiplataforma**: Windows, macOS y Linux
- **Offline**: Funciona sin conexión a internet
- **Gestión de Proyectos**: Crear, guardar y cargar proyectos GIS

## 📦 Requisitos del Sistema

### Mínimos
- **Windows**: Windows 10 o superior
- **macOS**: macOS 10.14 o superior
- **Linux**: Distribución moderna con soporte a GLIBC 2.27+
- **RAM**: 4GB recomendados
- **Almacenamiento**: 500MB de espacio libre

### Recomendados
- **RAM**: 8GB o más
- **GPU**: Tarjeta gráfica con soporte WebGL
- **Almacenamiento**: SSD recomendado para mejor rendimiento

## 🛠️ Instalación y Ejecución

### Opción 1: Versión Portable (Recomendada)

1. **Descarga el instalador** desde la sección de releases
2. **Ejecuta el instalador** (`SIG Pro Setup.exe`)
3. **Sigue las instrucciones** del instalador
4. **Inicia la aplicación** desde el menú de inicio o el acceso directo

### Opción 2: Desarrollo

1. **Clona o descarga** el proyecto
2. **Abre una terminal** en la carpeta `sig-pro/electron-app`
3. **Instala dependencias**:
   ```bash
   npm install
   ```
4. **Inicia la aplicación**:
   ```bash
   npm start
   ```

### Opción 3: Construir desde Cero

1. **Instala Node.js** (versión 18 o superior)
2. **Instala Python** (versión 3.8 o superior)
3. **Clona el proyecto** y navega a `sig-pro/electron-app`
4. **Instala dependencias**:
   ```bash
   npm install
   ```
5. **Construye la aplicación**:
   ```bash
   npm run build:win  # Para Windows
   npm run build:mac  # Para macOS
   npm run build:linux  # Para Linux
   ```

## 🎮 Uso Básico

### Iniciar la Aplicación
1. **Ejecuta** `SIG Pro.exe` (Windows) o el ejecutable correspondiente
2. **Espera** a que inicie el servidor Python (mensaje en la esquina superior derecha)
3. **Comienza** a usar las herramientas GIS

### Funciones Principales
- **Capas Base**: OpenStreetMap, Satélite
- **Herramientas de Dibujo**: Polígonos, Marcadores, Medición
- **Importación**: GeoJSON, KML, GPX, Raster
- **Gestión de Proyectos**: Crear, Guardar, Cargar
- **Vista 3D**: Activar vista tridimensional

### Menú de Aplicación
- **Archivo**: Nuevo, Abrir, Guardar proyectos
- **Herramientas**: Acceso rápido a funciones de dibujo
- **Ver**: Control de zoom y herramientas de desarrollo
- **Ayuda**: Documentación y información de la aplicación

## 🔧 Configuración Avanzada

### Variables de Entorno
Puedes crear un archivo `.env` en la carpeta `electron-app`:

```bash
# Puerto del servidor Python
PYTHON_PORT=5000

# Modo de desarrollo
NODE_ENV=development

# Ruta personalizada al Python
PYTHON_PATH=/usr/bin/python3
```

### Configuración del Servidor Python
Edita `python_api/app.py` para modificar:
- Puerto de escucha
- Rutas de archivos
- Configuración de CORS
- Límites de carga

### Personalización de Iconos
1. **Crea tus iconos** en PNG (512x512px)
2. **Convierte** a los formatos necesarios (ICO, ICNS)
3. **Reemplaza** los archivos en `electron-app/assets/`
4. **Reconstruye** la aplicación

## 🐛 Solución de Problemas

### Errores Comunes

#### "No se pudo iniciar el servidor Python"
- **Solución**: Verifica que Python esté instalado y en el PATH
- **Alternativa**: Ejecuta manualmente `python python_api/app.py` desde la carpeta principal

#### "Conexión al servidor fallida"
- **Solución**: Espera 10-15 segundos a que el servidor inicie
- **Alternativa**: Reinicia la aplicación

#### "No se cargan las capas"
- **Solución**: Verifica que los archivos estén en formatos soportados
- **Alternativa**: Revisa la consola de desarrollo (F12) para errores

#### "La aplicación se cierra inesperadamente"
- **Solución**: Cierra procesos Python en segundo plano
- **Alternativa**: Reinicia el sistema y vuelve a intentar

### Herramientas de Depuración

#### Consola de Desarrollo
- **Abre**: `Ctrl+Shift+I` o `F12`
- **Verifica**: Errores de JavaScript y red
- **Monitoriza**: Estado de conexión al servidor

#### Logs de Python
- **Ubicación**: Terminal donde se inicia la aplicación
- **Verifica**: Errores de importación y procesamiento
- **Monitoriza**: Estado del servidor

#### Logs de Electron
- **Ubicación**: `~/.config/SIG Pro/logs/` (Linux/macOS) o `%APPDATA%/SIG Pro/logs/` (Windows)
- **Verifica**: Errores de aplicación y sistema

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

## 🔄 Actualizaciones

### Desde el Instalador
1. **Descarga** la nueva versión
2. **Ejecuta** el instalador (reemplazará la versión anterior)
3. **Inicia** la aplicación

### Manualmente
1. **Descarga** los nuevos archivos
2. **Reemplaza** los archivos en la carpeta de instalación
3. **Reinicia** la aplicación

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo [LICENSE](LICENSE) para más detalles.

## 🤝 Contribución

1. **Fork** el proyecto
2. **Crea** una rama (`git checkout -b feature/AmazingFeature`)
3. **Commit** tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. **Push** a la rama (`git push origin feature/AmazingFeature`)
5. **Abre** un Pull Request

## 📞 Soporte

Para soporte y preguntas:
- **Issues**: [GitHub Issues](https://github.com/tu-usuario/SIG-Pro/issues)
- **Documentación**: [Wiki](https://github.com/tu-usuario/SIG-Pro/wiki)
- **Email**: tu-email@ejemplo.com

## 📊 Roadmap

- [ ] Sistema de usuarios y autenticación
- [ ] Base de datos PostgreSQL + PostGIS
- [ ] Análisis espacial avanzado
- [ ] Exportación a múltiples formatos
- [ ] Plugins y extensiones
- [ ] Integración con servicios externos
- [ ] Versión móvil (React Native)

---

**SIG Pro** - Transformando la forma en que trabajas con datos geoespaciales