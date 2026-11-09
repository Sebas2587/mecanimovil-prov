## Why

PR24 encoló los diálogos institucionales, pero un botón de `showAlertButtons` oculta el modal sin sacar el aviso de la cola. El siguiente diálogo queda pendiente y React no lo pinta porque es la misma referencia. Tras enviar una cotización, «Ahora no» deja mudo el segundo envío. Tras un fallo de red en el checklist, «Reintentar» guarda (PATCH 200) y no muestra «Tu respuesta ha sido guardada exitosamente».

## What Changes

- Al pulsar un botón del diálogo de varios botones, se aplica `dequeueAlert` y luego el `onPress` del botón.
- Se conserva la cola, el diseño y los textos de PR24.
- Un test del host falla antes del arreglo y pasa después.
