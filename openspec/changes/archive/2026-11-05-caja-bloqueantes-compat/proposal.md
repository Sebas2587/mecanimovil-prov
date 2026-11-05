## Why

La revisión del libro encontró tres fallos que duplican un cobro, muestran Pagado cuando la orden ya está reembolsada, o pintan el período anterior. También leía `faltantes` como contadores y no dejaba devolver una entrada manual sin pegar un UUID.

## What Changes

- Un POST sin respuesta queda atado a su clave y su cuerpo. No se edita ni se manda otro cobro hasta reintentar ese mismo envío. La pantalla no afirma que el libro no cambió.
- El intento sobrevive a salir de la pantalla y a refrescar la pestaña.
- La proyección `estado_cobro_ui` de la orden gana a los flags viejos de la oferta.
- Una respuesta tardía de otro período no pisa el libro que se está pidiendo.
- `resumen.faltantes` se lee como lista de códigos.
- La devolución sale de una entrada manual visible. Mercado Pago no se anota a mano.
- Una fecha imposible no pasa aunque tenga forma YYYY-MM-DD.
- `cliente_nombre`, `vehiculo_patente` y `folio` se leen de la misma fila. No hay una petición por caso.
