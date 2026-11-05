## Why

La tarjeta «Finanzas del mes» abre créditos de plataforma. El taller necesita el libro de caja (cobros, devoluciones y saldo por caso) sin tratar un 404 del API como período vacío ni el neto como ganancia. El backend de la etapa 2 sigue en revisión y no está desplegado.

## What Changes

- Nueva ruta `/caja-taller`. La tarjeta de finanzas del mes abre esa caja. «Recargar créditos» y el plan siguen en `/creditos`.
- Servicios `GET /ordenes/caja/`, `POST /ordenes/caja/cobros/` y `POST /ordenes/caja/costos/` sobre el contrato provisional. La clave de idempotencia viaja en el alta de cobro.
- El neto se etiqueta «Cobros menos devoluciones». El margen real se muestra solo si el API lo trae; null es incompleto. La app no calcula margen con el exigible.
- Un pagado de fuente con `pago_contabilizable` false no es deuda. Un pendiente 0 no pisa ese pagado. Un reembolso del API gana al pagado viejo.
- El total de la cotización sale de las mismas líneas (IVA incluido). Si falta un precio, el total es «Incompleto», no $0.
- Tokens institucionales (`COLORS.institutional`, `SPACING`, `TYPOGRAPHY`). Sin colores sueltos. El pie de registro queda fuera del scroll.
- El backend puede sumar `cliente_nombre`, `vehiculo_patente` y `folio` en cada caso. Hasta entonces la fila muestra ancla y ancla id, sin un pedido por caso.
