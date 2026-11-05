## Context

El GET `/api/ordenes/caja/` anota en lote `cliente_nombre`, `vehiculo_patente` y `folio` en `casos.results` y `movimientos.results`. Vacío es null. No trae teléfono, correo ni dirección. El POST de cobro rechaza un día inexistente con 400 `fecha_invalida` y no crea fila, incluido `2026-02-30T15:04:00`. El contracargo es `tipo: "contracargo"`.

## Goals / Non-Goals

**Goals:**

- Mostrar los tres campos cuando vienen en la fila y el ancla cuando son null o blancos.
- No enviar fechas imposibles y reconocer el 400 sin tratarlo como respuesta perdida.
- Rotular el contracargo y no ofrecer una devolución manual encima.

**Non-Goals:**

- Pedir cada ancla, inventar un folio o recalcular reembolsos de Mercado Pago.
- Meter esta caja en el PR de totales nulos. Merge y deploy quedan fuera.

## Decisions

1. `tituloHumano` solo arma el título con textos no vacíos. Null, `""` y espacios quedan fuera. No se sustituye por «Cliente».
2. `motivoFechaCobro` rechaza el día de calendario aunque venga con hora. El formulario sigue enviando solo `YYYY-MM-DD` de un día real.
3. `falloDesdeRespuesta` para `fecha_invalida` dice que el servidor no guardó el cobro. Un 400 no marca el intento como incierto.
4. `etiquetaTipoMovimiento('contracargo')` es «Contracargo». Esa fila no tiene botón de devolver.

## Risks / Trade-offs

- Un datetime de un día real (`2026-11-05T15:04:00`) tampoco se envía: el formulario pide el día. El servidor sí aceptaría esa hora si el día existe; aquí no la mandamos.
- Si el backend omite las claves, la fila sigue en el ancla. Eso cubre una respuesta vieja.
