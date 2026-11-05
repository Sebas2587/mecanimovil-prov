## Context

`claveParaIntento` crea otra clave cuando el cuerpo cambia. Tras un timeout, «Volver» deja editar motivo o fecha y esa clave nueva puede duplicar el cobro si el servidor sí guardó el primero. La lista tomaba la oferta antes que la proyección de la orden. El GET no descartaba una respuesta vieja.

## Goals / Non-Goals

- Goals: resolver el intento incierto con su identidad original; no mostrar cifras de otro período; leer la proyección real; devolver una entrada manual sin UUID a mano.
- Non-Goals: no merge, no deploy, no cambiar la semántica del reembolso de Mercado Pago.

## Decisions

- Sin `response` el intento queda `incierto` en memoria y, si existe, en `sessionStorage`. Editar no emite otra clave.
- Una respuesta HTTP, aunque sea 409, ya no es incierta: el cuerpo puede cambiar y la clave nueva corresponde a otro envío.
- `estado_cobro_ui` de la orden se lee antes que los flags de la oferta. Si la orden no trae proyección, se mantiene la lectura vieja.
- El libro en pantalla solo se pinta si su período coincide con los controles. La respuesta lleva un número de consulta y se descarta si ya salió otra.

## Risks / Trade-offs

- Recargar el proceso sin `sessionStorage` pierde el intento. En la pestaña web queda guardado.
