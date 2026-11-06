# Design

## Context

La fila vive en `estilosPartesEditor`. `gridColPrecio` usa `flex: 1` y `minWidth: 0`. Cantidad mide 72 px y el subtotal 104 px, con dos separaciones de 12 px. Dentro de la card, a 320 px de viewport, a la columna del precio le quedan unos 56 px. El input gasta ese ancho en padding y en el «$», y el texto «67.900» queda fuera.

A unos 390 px la misma fila todavía deja ~120 px al precio y el monto se lee. El arreglo tiene que conservar esa fila de tres columnas cuando cabe.

## Goals / Non-Goals

**Goals:**

- Leer el monto formateado completo en el campo de precio unitario a 320 px.
- No generar scroll horizontal de la página ni tapar los otros controles.
- Mantener el input de texto en 16 px en web.

**Non-Goals:**

- Cambiar `ClpMoneyInput` para el resto de la app.
- Reescribir envío, margen, reapertura o `RevisionCotizador`.
- Tocar la carga de la caja. `useSenalRed` solo lee `navigator.onLine` en web. `useWebVisualViewport` solo suma padding inferior. Ninguno llama a `cargar`.

## Decisions

1. `repuestoGrid` usa `flexWrap: 'wrap'`.
2. `gridColPrecio` deja `flex: 1` (basis 0) y pasa a `flexGrow: 1`, `flexShrink: 0`, `minWidth: 112`, `maxWidth: '100%'`. 112 px más las columnas fijas no caben en el ancho útil de 320 px, así que el subtotal baja. El precio crece con el espacio que queda en su línea, bastante para «67.900» y para montos de siete cifras. A ~390 px las tres columnas siguen en una línea.
3. No se usa `overflow: hidden` global ni se bloquea el zoom.

## Risks / Trade-offs

- Entre ~330 y ~380 px el subtotal puede bajar a la segunda línea. El monto del input sigue visible y nada se superpone.
- Si el gutter real difiere unos pixeles, el corte entre una y dos líneas se mueve. El piso de 112 px evita volver al campo de solo «$».

## Migration Plan

Cambio de estilo. No hay datos que migrar.

## Open Questions

Ninguna.
