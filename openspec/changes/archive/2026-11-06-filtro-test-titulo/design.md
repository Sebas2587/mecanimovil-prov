## Context

`esCotizacionDePrueba` solo prueba `servicio_nombre`. En `CotizacionesVista` el título de la tarjeta es `cliente_nombre` y el servicio va en el subtítulo. Las fichas vivas «TEST Cotización IA 12» tienen TEST en el cliente, así que `pruebas.length` queda en 0 y no se pinta «Verlas».

## Goals / Non-Goals

**Goals:**

- Tratar como prueba la palabra TEST en `cliente_nombre`, `cliente_display` o `servicio_nombre`.
- Mantener la misma regex de límite de palabra.
- Conservar el ocultado reversible que ya arma `CotizacionesVista`.

**Non-Goals:**

- Borrar registros.
- Cambiar carga, menú, confirmaciones, cita o el plural de caja.
- Cambiar qué campo pinta el título de la tarjeta.

## Decisions

1. La función recibe los tres campos y devuelve true si alguno cumple la regex actual.
2. La vista no cambia: ya filtra con esa función y muestra el control cuando hay pruebas.

## Risks / Trade-offs

- Un cliente real cuyo nombre contenga la palabra TEST también se oculta. Es el mismo criterio pedido para el título visible, y se puede volver a mostrar.

## Migration Plan

Solo cliente. No hay datos que migrar.

## Open Questions

Ninguna.
