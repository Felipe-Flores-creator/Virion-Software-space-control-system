"""
API REST para el SIG Pro - Backend Python
Proporciona servicios de procesamiento geoespacial
"""

from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import geopandas as gpd
import pandas as pd
import json
import tempfile
import os
from shapely.geometry import Point, Polygon, LineString
import logging

# Configuración de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="SIG Pro API",
    description="API para procesamiento geoespacial del Sistema de Información Geográfica",
    version="1.0.0"
)

# Configuración CORS - Permitir todo para desarrollo
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

class GeometryInfo(BaseModel):
    type: str
    coordinates: List[Any]
    properties: Dict[str, Any] = {}

class ProcessingResult(BaseModel):
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None

@app.get("/")
async def root():
    """Endpoint raíz"""
    return {
        "message": "SIG Pro API - Sistema de Información Geográfica",
        "version": "1.0.0",
        "endpoints": {
            "upload": "/api/upload/",
            "analyze": "/api/analyze/",
            "convert": "/api/convert/",
            "buffer": "/api/buffer/",
            "clip": "/api/clip/"
        }
    }

@app.post("/api/upload/")
async def upload_file(file: UploadFile = File(...)):
    """
    Subir y procesar un archivo geoespacial
    Soporta: GeoJSON, Shapefile, KML, GPX
    """
    try:
        # Validar tipo de archivo
        allowed_types = ['geojson', 'json', 'shp', 'kml', 'gpx']
        file_extension = file.filename.split('.')[-1].lower()
        
        if file_extension not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"Tipo de archivo no soportado. Tipos permitidos: {', '.join(allowed_types)}"
            )

        # Guardar archivo temporalmente
        with tempfile.NamedTemporaryFile(delete=False, suffix=f'.{file_extension}') as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name

        try:
            # Leer archivo con GeoPandas
            if file_extension in ['geojson', 'json']:
                gdf = gpd.read_file(temp_file_path)
            elif file_extension == 'shp':
                # Para shapefiles, necesitamos el directorio
                gdf = gpd.read_file(temp_file_path)
            elif file_extension == 'kml':
                gdf = gpd.read_file(temp_file_path, driver='KML')
            elif file_extension == 'gpx':
                gdf = gpd.read_file(temp_file_path, driver='GPX')

            # Obtener información básica
            info = {
                "filename": file.filename,
                "total_features": len(gdf),
                "geometry_type": str(gdf.geometry.type.iloc[0]) if len(gdf) > 0 else None,
                "crs": str(gdf.crs) if gdf.crs else "No CRS",
                "bbox": list(gdf.total_bounds) if len(gdf) > 0 else None,
                "columns": list(gdf.columns),
                "sample_features": []
            }

            # Obtener muestras de características
            if len(gdf) > 0:
                sample_size = min(5, len(gdf))
                for idx, row in gdf.head(sample_size).iterrows():
                    feature_info = {
                        "id": int(idx),
                        "geometry_type": row.geometry.geom_type,
                        "properties": {col: str(row[col]) for col in gdf.columns if col != 'geometry'}
                    }
                    info["sample_features"].append(feature_info)

            # Convertir a GeoJSON para respuesta
            geojson_data = json.loads(gdf.to_json())

            return JSONResponse(content={
                "success": True,
                "message": f"Archivo {file.filename} procesado exitosamente",
                "info": info,
                "geojson": geojson_data
            })

        finally:
            # Limpiar archivo temporal
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)

    except Exception as e:
        logger.error(f"Error procesando archivo {file.filename}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/analyze/")
async def analyze_geometry(geometries: List[GeometryInfo]):
    """
    Analizar geometrías y calcular métricas
    """
    try:
        results = []
        
        for i, geom_info in enumerate(geometries):
            try:
                # Crear geometría con Shapely
                if geom_info.type.upper() == 'POINT':
                    geometry = Point(geom_info.coordinates)
                    area = 0
                    length = 0
                elif geom_info.type.upper() == 'POLYGON':
                    geometry = Polygon(geom_info.coordinates)
                    area = geometry.area
                    length = geometry.length
                elif geom_info.type.upper() == 'LINESTRING':
                    geometry = LineString(geom_info.coordinates)
                    area = 0
                    length = geometry.length
                else:
                    raise ValueError(f"Tipo de geometría no soportado: {geom_info.type}")

                # Calcular métricas
                metrics = {
                    "geometry_type": geom_info.type,
                    "area": round(area, 6),
                    "length": round(length, 6),
                    "bounds": list(geometry.bounds),
                    "is_valid": geometry.is_valid,
                    "is_simple": geometry.is_simple,
                    "centroid": [geometry.centroid.x, geometry.centroid.y]
                }

                results.append({
                    "id": i,
                    "success": True,
                    "metrics": metrics,
                    "properties": geom_info.properties
                })

            except Exception as e:
                results.append({
                    "id": i,
                    "success": False,
                    "error": str(e),
                    "properties": geom_info.properties
                })

        return JSONResponse(content={
            "success": True,
            "message": f"Análisis completado para {len(geometries)} geometrías",
            "results": results
        })

    except Exception as e:
        logger.error(f"Error en análisis de geometrías: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/buffer/")
async def create_buffer(
    geometries: List[GeometryInfo],
    distance: float,
    units: str = "meters"
):
    """
    Crear buffer alrededor de geometrías
    """
    try:
        buffered_geometries = []
        
        for i, geom_info in enumerate(geometries):
            try:
                # Crear geometría base
                if geom_info.type.upper() == 'POINT':
                    geometry = Point(geom_info.coordinates)
                elif geom_info.type.upper() == 'POLYGON':
                    geometry = Polygon(geom_info.coordinates)
                elif geom_info.type.upper() == 'LINESTRING':
                    geometry = LineString(geom_info.coordinates)
                else:
                    raise ValueError(f"Tipo de geometría no soportado: {geom_info.type}")

                # Crear buffer
                buffered = geometry.buffer(distance)

                buffered_geometries.append({
                    "id": i,
                    "original_type": geom_info.type,
                    "buffered_type": buffered.geom_type,
                    "buffer_distance": distance,
                    "buffer_units": units,
                    "area": round(buffered.area, 6),
                    "properties": geom_info.properties
                })

            except Exception as e:
                buffered_geometries.append({
                    "id": i,
                    "success": False,
                    "error": str(e),
                    "properties": geom_info.properties
                })

        return JSONResponse(content={
            "success": True,
            "message": f"Buffer creado para {len(geometries)} geometrías",
            "distance": distance,
            "units": units,
            "results": buffered_geometries
        })

    except Exception as e:
        logger.error(f"Error creando buffer: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/convert/")
async def convert_coordinates(
    coordinates: List[List[float]],
    from_crs: str,
    to_crs: str
):
    """
    Convertir coordenadas entre sistemas de referencia
    """
    try:
        import pyproj
        
        # Crear transformador
        transformer = pyproj.Transformer.from_crs(from_crs, to_crs, always_xy=True)
        
        converted_coords = []
        for coord in coordinates:
            if len(coord) != 2:
                raise ValueError("Cada coordenada debe tener exactamente 2 valores (x, y)")
            
            x, y = transformer.transform(coord[0], coord[1])
            converted_coords.append([x, y])

        return JSONResponse(content={
            "success": True,
            "message": f"Convertidas {len(coordinates)} coordenadas",
            "from_crs": from_crs,
            "to_crs": to_crs,
            "original_coordinates": coordinates,
            "converted_coordinates": converted_coords
        })

    except Exception as e:
        logger.error(f"Error convirtiendo coordenadas: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/health/")
async def health_check():
    """Verificación de salud del servicio"""
    return {
        "status": "healthy",
        "service": "SIG Pro API",
        "version": "1.0.0",
        "dependencies": {
            "geopandas": gpd.__version__,
            "pandas": pd.__version__,
            "shapely": "2.0.0+"
        }
    }

@app.get("/api/incendios/csv")
async def get_incendios_csv():
    """
    Obtener datos de incendios desde API externa (VIIRS)
    Retorna CSV parseado con puntos de calor/fuego
    """
    import requests

    # Nueva URL estable de la NASA FIRMS (VIIRS NRT Global 24h)
    external_api_url = "https://firms.modaps.eosdis.nasa.gov/api/area/csv/5cda0cba8aabe3f4d4f5bde5947cf7e6/VIIRS_NOAA20_SP/world/3"

    try:
        # Añadir headers para simular navegador
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        # Hacer request a la API externa
        response = requests.get(external_api_url, headers=headers, timeout=30)
        response.raise_for_status()

        # Retornar el CSV directamente
        from fastapi.responses import PlainTextResponse
        return PlainTextResponse(
            content=response.text,
            media_type="text/csv",
            headers={
                "Content-Disposition": "attachment; filename=incendios_viirs.csv"
            }
        )
    except requests.RequestException as e:
        logger.error(f"Error obteniendo incendios: {str(e)}")
        # Retornar CSV vacío con headers si falla
        return PlainTextResponse(
            content="lat,lon,confidence,frp,acquisition_date\n",
            media_type="text/csv"
        )

@app.get("/api/incendios/geojson")
async def get_incendios_geojson():
    """
    Obtener datos de incendios como GeoJSON
    """
    import requests

    # Nueva URL estable de la NASA FIRMS (VIIRS NRT Global 24h)
    external_api_url = "https://firms.modaps.eosdis.nasa.gov/api/area/csv/5cda0cba8aabe3f4d4f5bde5947cf7e6/VIIRS_NOAA20_SP/world/3"

    try:
        # Añadir headers para simular navegador
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(external_api_url, headers=headers, timeout=30)
        response.raise_for_status()

        # Parsear CSV
        lines = response.text.strip().split('\n')
        if len(lines) < 2:
            return {"type": "FeatureCollection", "features": []}

        headers = [h.strip() for h in lines[0].split(',')]

        # Encontrar columnas de lat/lon
        lat_idx = next((i for i, h in enumerate(headers) if h.lower() in ['lat', 'latitude']), 0)
        lon_idx = next((i for i, h in enumerate(headers) if h.lower() in ['lon', 'lng', 'longitude']), 1)

        features = []
        for line in lines[1:]:
            if not line.strip():
                continue
            values = [v.strip() for v in line.split(',')]
            if len(values) < 2:
                continue

            try:
                lat = float(values[lat_idx])
                lon = float(values[lon_idx])

                # Crear properties
                props = {}
                for i, header in enumerate(headers):
                    if i < len(values):
                        props[header] = values[i]

                features.append({
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [lon, lat]
                    },
                    "properties": props
                })
            except (ValueError, IndexError):
                continue

        return {
            "type": "FeatureCollection",
            "features": features,
            "total": len(features)
        }

    except requests.RequestException as e:
        logger.error(f"Error obteniendo incendios: {str(e)}")
        return {"type": "FeatureCollection", "features": []}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000, reload=True)