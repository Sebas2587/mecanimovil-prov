# Proposal

## Why

Una orden que ya se pagó y pasa a ejecución o a completada pierde el «Pagado», porque la ficha mira el estado del trabajo. Un desglose a medias se convierte en ceros y parece comisión real.

## What Changes

- El cobro usa `estado_pago_repuestos` y `estado_pago_servicio` cuando vienen. El avance no demuestra pago.
- Sin evidencia, la etiqueta es «Pago sin información». No se afirma que no hubo pago.
- Reembolso, fallo, cancelación o pago parcial no quedan en Pagado por un estado `pagada` viejo.
- El resumen de precios solo suma importes explícitos. El cero cuenta si viene escrito.
- En el detalle de orden, el color sigue al avance normalizado y el total nulo no se ve como $0.

## Capabilities

### New Capabilities

### Modified Capabilities

- `ordenes-gestion`: cobro y desglose de la ficha exigen evidencia, no el avance del trabajo.

## Impact

- `utils/cobroTrabajo.ts`, `utils/resumenPreciosOrden.ts` y las pantallas de orden, servicio, lista y solicitud.
- El contrato de `Orden` no garantiza los campos de pago. Si no vienen, queda documentado para la etapa 2.
- Sin cambio de enums ni de rutas.
