# Proposal

## Why

El menú de más acciones se dibuja fuera del botón de 44 px. En nativo el toque no sigue a ese dibujo: la opción se ve y no recibe el press.

## What Changes

- El menú abierto vive en un Modal de pantalla completa, dentro de esa superficie.
- Fondo, Escape y atrás cierran sin ejecutar una acción.

## Capabilities

### New Capabilities

### Modified Capabilities

- `ordenes-gestion`: el menú abierto tiene superficie de toque propia.

## Impact

- `CitaMasAcciones` en la cabecera de la cita.
- No cambia la lista de Servicios ni el zoom.
