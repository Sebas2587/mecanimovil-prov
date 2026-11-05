# Proposal

## Why

En 320 el botón «···» tapa el teléfono de la ficha y el texto de avance. «Nueva cotización» tapa la última tarjeta de Servicios. El scroll no reserva el alto de esas acciones.

## What Changes

- La ficha deja, sobre el pie, el alto del botón más un hueco. El botón no se corre encima de otro texto.
- Servicios suma el mismo hueco que Hoy ya usa para «Nueva cotización».
- El subtítulo del modal puede ocupar dos líneas.

## Capabilities

### New Capabilities

### Modified Capabilities

- `ordenes-gestion`: la lista y la ficha reservan el espacio de las acciones flotantes.

## Impact

- `utils/reservaAccionFlotante.ts`, ficha de cita, lista de Servicios y el subtítulo del modal.
- No cambia rutas, permisos ni el viewport.
