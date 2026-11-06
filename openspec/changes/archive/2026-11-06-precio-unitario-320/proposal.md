# Proposal

## Why

A 320 px de ancho, la fila Cant. / Precio unit. / Subtotal del editor de repuestos aplasta el campo del medio hasta dejar solo el signo «$». El monto sigue existiendo (el subtotal lo muestra) pero no se puede leer en el input.

## What Changes

- La columna del precio unitario deja de poder encogerse por debajo de un ancho legible. Si las tres columnas no caben, el subtotal pasa a la línea siguiente en vez de recortar el monto.
- No se toca el cálculo de margen, el envío, la reapertura del folio ni la revisión del cotizador.
- La caja no entra: el aviso de señal y el alto del teclado no relanzan la consulta del libro.

## Capabilities

### New Capabilities

### Modified Capabilities

- `asistente-ia`: el precio unitario de un repuesto permanece legible a 320 px sin desbordar la página.

## Impact

- `components/cotizacion/editor/estilosPartesEditor.ts`
- Test de los estilos de esa fila.
- Sin cambios de API, de caja ni de zoom.
