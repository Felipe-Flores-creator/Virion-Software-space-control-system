"""
Cliente Python para comunicarse con el frontend del SIG Pro
Este script permite la integración entre Python y JavaScript
"""

import requests
import json
import os
from typing import Dict, List, Any, Optional
from pathlib import Path

class SIGProClient:
    """Cliente para comunicarse con la API del SIG Pro"""
    
    def __init__(self, api_url: str = "http://localhost:8000"):
        self.api_url = api_url.rstrip('/')
        self.session = requests.Session()
        
    def upload_file(self, file_path: str) -> Dict[str, Any]:
        """Subir un archivo geoespacial a la API"""
        try:
            with open(file_path, 'rb') as file:
                files = {'file': (os.path.basename(file_path), file)}
                response = self.session.post(
                    f"{self.api_url}/api/upload/",
                    files=files
                )
                response.raise_for_status()
                return response.json()
                
        except requests.exceptions.RequestException as e:
            print(f"Error subiendo archivo: {e}")
            return {"success": False, "error": str(e)}
    
    def analyze_geometries(self, geometries: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analizar geometrías"""
        try:
            response = self.session.post(
                f"{self.api_url}/api/analyze/",
                json=geometries
            )
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.RequestException as e:
            print(f"Error analizando geometrías: {e}")
            return {"success": False, "error": str(e)}
    
    def create_buffer(self, geometries: List[Dict[str, Any]], distance: float, units: str = "meters") -> Dict[str, Any]:
        """Crear buffer alrededor de geometrías"""
        try:
            data = {
                "geometries": geometries,
                "distance": distance,
                "units": units
            }
            response = self.session.post(
                f"{self.api_url}/api/buffer/",
                json=data
            )
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.RequestException as e:
            print(f"Error creando buffer: {e}")
            return {"success": False, "error": str(e)}
    
    def convert_coordinates(self, coordinates: List[List[float]], from_crs: str, to_crs: str) -> Dict[str, Any]:
        """Convertir coordenadas entre sistemas de referencia"""
        try:
            data = {
                "coordinates": coordinates,
                "from_crs": from_crs,
                "to_crs": to_crs
            }
            response = self.session.post(
                f"{self.api_url}/api/convert/",
                json=data
            )
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.RequestException as e:
            print(f"Error convirtiendo coordenadas: {e}")
            return {"success": False, "error": str(e)}
    
    def check_health(self) -> Dict[str, Any]:
        """Verificar el estado del servicio"""
        try:
            response = self.session.get(f"{self.api_url}/api/health/")
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.RequestException as e:
            print(f"Error verificando salud del servicio: {e}")
            return {"success": False, "error": str(e)}

def process_shapefile(file_path: str) -> Dict[str, Any]:
    """Procesar un archivo Shapefile y devolver información"""
    client = SIGProClient()
    
    # Subir el archivo
    result = client.upload_file(file_path)
    
    if result.get("success"):
        print(f"Archivo procesado exitosamente: {result['info']['filename']}")
        print(f"Total de características: {result['info']['total_features']}")
        print(f"Tipo de geometría: {result['info']['geometry_type']}")
        
        return result
    else:
        print(f"Error procesando archivo: {result.get('error', 'Desconocido')}")
        return result

def analyze_geometry_example():
    """Ejemplo de análisis de geometrías"""
    client = SIGProClient()
    
    # Ejemplo de geometrías
    geometries = [
        {
            "type": "Point",
            "coordinates": [-70.6693, -33.4489],
            "properties": {"name": "Punto de ejemplo"}
        },
        {
            "type": "Polygon",
            "coordinates": [[
                [-70.6700, -33.4490],
                [-70.6680, -33.4490],
                [-70.6680, -33.4480],
                [-70.6700, -33.4480],
                [-70.6700, -33.4490]
            ]],
            "properties": {"name": "Polígono de ejemplo"}
        }
    ]
    
    result = client.analyze_geometries(geometries)
    
    if result.get("success"):
        print("Análisis de geometrías completado:")
        for res in result["results"]:
            if res["success"]:
                metrics = res["metrics"]
                print(f"- {res['properties']['name']}: Área={metrics['area']}, Longitud={metrics['length']}")
    
    return result

def create_buffer_example():
    """Ejemplo de creación de buffer"""
    client = SIGProClient()
    
    geometries = [
        {
            "type": "Point",
            "coordinates": [-70.6693, -33.4489],
            "properties": {"name": "Punto central"}
        }
    ]
    
    result = client.create_buffer(geometries, distance=0.001, units="degrees")
    
    if result.get("success"):
        print("Buffer creado exitosamente:")
        for res in result["results"]:
            if res["success"]:
                print(f"- {res['properties']['name']}: Área del buffer={res['area']}")
    
    return result

def convert_coordinates_example():
    """Ejemplo de conversión de coordenadas"""
    client = SIGProClient()
    
    # Coordenadas en WGS84 (grados)
    coordinates = [
        [-70.6693, -33.4489],  # Santiago, Chile
        [-70.6800, -33.4500]
    ]
    
    result = client.convert_coordinates(
        coordinates=coordinates,
        from_crs="EPSG:4326",
        to_crs="EPSG:32719"  # UTM zona 19S
    )
    
    if result.get("success"):
        print("Conversión de coordenadas completada:")
        for i, (orig, conv) in enumerate(zip(result["original_coordinates"], result["converted_coordinates"])):
            print(f"- Punto {i+1}: {orig} -> {conv}")
    
    return result

if __name__ == "__main__":
    # Verificar salud del servicio
    client = SIGProClient()
    health = client.check_health()
    
    if health.get("status") == "healthy":
        print("✅ Servicio SIG Pro API está saludable")
        
        # Ejecutar ejemplos
        print("\n📊 Ejecutando ejemplos de procesamiento...")
        
        analyze_geometry_example()
        print()
        
        create_buffer_example()
        print()
        
        convert_coordinates_example()
        
    else:
        print("❌ Servicio SIG Pro API no está disponible")
        print(f"Estado: {health}")