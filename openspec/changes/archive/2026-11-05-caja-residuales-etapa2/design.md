## Context

El POST de cobro solo marcaba incierto cuando `status == null`. Un proxy puede devolver 502 o 504 después de haber guardado. El input de fechas escribía el ref de la consulta, y el texto «Cargando» usaba ese borrador. `fecha_efectiva` del movimiento puede ser un instante ISO. La sesión guardaba un solo intento sin dueño.

## Goals / Non-Goals

**Goals:**

- Tratar null, 408 y cualquier 5xx como resultado ambiguo del cobro: misma clave, sin edición, sin decir que fue rechazado.
- Mostrar el período del pedido en curso y el período del libro, aunque el input diga otra cosa.
- Precargar el reembolso con `fechaSantiago(ahora)`.
- Aislar el intento por `usuario.id` y `proveedor_id`.

**Non-Goals:**

- Inventar idempotencia de costos. Merge, deploy y el PR 16 quedan fuera.

## Decisions

1. `resultadoAmbiguo` es verdadero sin estado, con 408 y con estado >= 500. 400, 403, 404 y 409 son definitivos: se puede editar y una clave nueva no duplica un guardado.
2. El ref de consulta solo cambia en Consultar y en la paginación. `Cargando` usa ese pedido. El resumen dice `Libro desde a hasta` con las fechas de la respuesta.
3. Un GET 5xx del mismo período conserva el libro ya cargado y no lo presenta como vacío.
4. `cuerpoDesdeEntrada` ignora `fecha_efectiva` del movimiento. El día es el de hoy en America/Santiago.
5. La sesión es un mapa dueño → intento. Un JSON viejo sin dueño se descarta. Cambiar de cuenta solo cambia la clave que se lee.

## Risks / Trade-offs

- Reintentar un 5xx con la misma clave es seguro si el servidor es idempotente. Si el 5xx fue un rechazo real, el reintento repite un no y no crea otra fila.
- Un datetime de un día real sigue sin enviarse desde el formulario: el reembolso manda solo el día.
