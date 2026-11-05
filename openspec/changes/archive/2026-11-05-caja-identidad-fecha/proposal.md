## Why

El backend `f7df557` ya manda `cliente_nombre`, `vehiculo_patente` y `folio` en cada caso y cada movimiento del mismo GET. Una fecha imposible, también `2026-02-30T15:04:00`, responde 400 `fecha_invalida` y no inserta. El contracargo llega como movimiento `tipo=contracargo`.

## What Changes

- La caja lee esos tres campos de la fila. Null o vacío sigue en el ancla. No inventa «Cliente» ni un folio y no pide cada caso.
- No se envía un día que no existe, con o sin hora. Un 400 `fecha_invalida` dice que el servidor no guardó el cobro.
- Un movimiento `contracargo` se muestra así, sin devolución manual y sin sumar otro monto.
- `resumen.faltantes` sigue siendo una lista de códigos.

## Capabilities

### New Capabilities

- Ninguna. El cambio ajusta `caja-taller`.

### Modified Capabilities

- `caja-taller`: identidad del mismo libro, fecha inválida y contracargo.

## Impact

- `utils/cajaTaller.ts`, `components/caja/CajaLibro.tsx`, `components/caja/CajaAlta.tsx` y sus tests.
- No entra en el PR de totales nulos. No hay merge ni deploy.
