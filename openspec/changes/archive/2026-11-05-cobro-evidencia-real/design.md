## Context

`OfertaProveedor` trae `estado_pago_repuestos` (`no_aplica` | `pendiente` | `pagado`) y `estado_pago_servicio` (`pendiente` | `pagado`). `Orden` en `services/ordenesProveedor.ts` no los declara: solo `estado`, `total` y `metodo_pago`. `PipelineComercialItem` tampoco. El detalle de orden y el de servicio resolvían el cobro solo con `estado`, así que `en_ejecucion` o `completado` borraban un Pagado anterior. `resumenPreciosOrden` tomaba cualquier objeto `desglose_precios` y volvía 0 los campos ausentes.

## Goals / Non-Goals

**Goals:**

- Leer los campos de pago si el registro los trae, también cuando el estado ya es de trabajo.
- No afirmar ausencia de pago ni deuda cero cuando el dato no está.
- No mostrar comisión ni ganancia si un importe del desglose no viene explícito.

**Non-Goals:**

- No inventar un campo de reembolso en el API.
- No armar la caja del mes (etapa 2).
- No cambiar rutas, permisos ni el margen del cotizador.

## Decisions

1. Los campos de pago ganan sobre `estado`. `pagada` solo cuenta si ningún campo la contradice. `en_ejecucion`, `completado`, `aceptada` y `pago_validado` no son cobro.
2. `reembolsado`, `fallido` y `cancelado` en un campo dejan la ficha en «Pago sin información», con el detalle de lo que figura. No es Pagado ni Por cobrar.
3. Un importe es explícito si es un número finito o un texto numérico, incluido `0`. `null`, `''` y texto no numérico no se suman.
4. El monto de la orden se muestra una vez, en la ficha. `null` no pasa por `formatearMontoCLP`, que hoy devuelve `$0`.
5. El color del badge usa el avance normalizado, no `obtenerColorEstado` del enum crudo.

## Contrato que falta (etapa 2)

`GET /ordenes/proveedor-ordenes/{id}/` y la lista de órdenes no garantizan `estado_pago_repuestos` ni `estado_pago_servicio`. La ficha de pipeline tampoco. Si el backend no los manda, una orden que salió de `pagada` queda en «Pago sin información»: no se recupera el Pagado desde el avance. La etapa 2 tiene que pedir esos campos en el serializer de la orden y no inventar un total mensual.

## Risks / Trade-offs

- [El serializer no manda los campos] → La ficha no dice Pagado después de completar. Es la lectura honesta con el contrato actual.
- [Un valor nuevo de pago cae en «sin información»] → Mejor que mostrarlo como Pagado por un `pagada` viejo.
