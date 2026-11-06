## Why

En producción la lista de cotizaciones sigue mostrando «TEST Cotización IA 12» porque el filtro solo mira `servicio_nombre`. En la ficha ese texto es el nombre del cliente, así que el control de ocultar pruebas no aparece.

## What Changes

- Una cotización es de prueba si la palabra TEST aparece en `cliente_nombre`, `cliente_display` o `servicio_nombre`.
- Sigue oculta por defecto y se puede volver a mostrar. No se borra el registro.
- El resto de la etapa 3 no cambia.

## Capabilities

### New Capabilities

### Modified Capabilities

- `dashboard-home`: el filtro TEST mira los títulos visibles de la ficha, no solo el servicio.

## Impact

- `utils/filtroCotizacionPrueba.ts` y su test. `CotizacionesVista` ya usa esa función.
