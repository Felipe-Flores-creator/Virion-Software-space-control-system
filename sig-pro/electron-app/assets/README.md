# Iconos para SIG Pro

Esta carpeta contiene los iconos necesarios para la aplicación SIG Pro en diferentes formatos y tamaños.

## Archivos requeridos

Para que la aplicación funcione correctamente, se necesitan los siguientes archivos:

### Windows (.ico)
- `icon.ico` - Icono para Windows (formato .ico, múltiples tamaños)

### macOS (.icns)
- `icon.icns` - Icono para macOS (formato .icns)

### Linux (.png)
- `icon.png` - Icono para Linux (formato PNG, 512x512px recomendado)

## Creación de iconos

Puedes crear estos iconos usando herramientas como:

### Online (recomendado para principiantes):
- [ConvertICO.com](https://convertico.com/) - Convierte PNG a ICO
- [CloudConvert](https://cloudconvert.com/) - Conversión de múltiples formatos
- [Iconverticons](https://iconverticons.com/online/) - Conversión avanzada

### Software de escritorio:
- **GIMP** (gratuito) - Para crear y editar PNG
- **Axialis IconWorkshop** - Para crear iconos profesionales
- **Adobe Photoshop** - Para diseño avanzado

### Comandos (para usuarios avanzados):

```bash
# Convertir PNG a ICO (requiere ImageMagick)
convert icon.png icon.ico

# Convertir PNG a ICNS (requiere icnsutils en Linux)
png2icns icon.icns icon.png

# Crear ICO con múltiples tamaños
convert icon-16.png icon-32.png icon-48.png icon-256.png icon.ico
```

## Especificaciones de iconos

### Icono PNG
- **Tamaño recomendado**: 512x512 px
- **Formato**: PNG con transparencia
- **Fondo**: Transparente o blanco

### Icono ICO
- **Tamaños incluidos**: 16x16, 32x32, 48x48, 256x256
- **Formato**: ICO con múltiples resoluciones
- **Color**: 32-bit con canal alpha

### Icono ICNS
- **Tamaños incluidos**: 16x16, 32x32, 128x128, 256x256, 512x512
- **Formato**: ICNS para macOS
- **Color**: 32-bit con transparencia

## Ejemplo de icono

Para un proyecto SIG, se recomienda un icono que represente:
- Un globo terráqueo o mapa
- Coordenadas o cuadrícula
- Herramientas de medición
- Estilo profesional y limpio

## Notas

- Los iconos deben tener fondo transparente para mejor integración
- Usa colores consistentes con el diseño de la aplicación
- El icono debe ser reconocible incluso en tamaños pequeños
- Prueba los iconos en diferentes fondos (claro y oscuro)

## Instalación

1. Crea tus iconos en PNG (512x512px)
2. Convierte al formato necesario para cada plataforma
3. Coloca los archivos en esta carpeta con los nombres especificados
4. Reconstruye la aplicación con `npm run build`