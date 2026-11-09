## Context

`PlatformAlertHost` (PR24) encola con `enqueueAlert`. `close()` sí hace `dequeueAlert`. El `onPress` de `kind === 'buttons'` solo hace `setRequest(null)` y deja `queueRef.current` en el diálogo ya cerrado.

## Goals / Non-Goals

- Goals: el siguiente `showAlertButtons` se ve; «Ahora no» y «Reintentar» no tragan el diálogo que viene.
- Non-Goals: no cambiar copy, variantes, autoFocus ni el diseño de PR24.

## Decisions

- El botón de `kind === 'buttons'` hace lo mismo que `close()` con la cola: `dequeueAlert` y `setRequest(queueRef.current.current)`, y después `btn.onPress`.
- Si `onPress` abre otro diálogo en el mismo tick, la cola ya está vacía y ese diálogo pasa a `current`.
