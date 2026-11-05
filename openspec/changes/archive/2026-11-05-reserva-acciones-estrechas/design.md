## Context

El botón «···» mide 56 y se ancla sobre el pie. El scroll solo sumaba 24, así que la última línea queda debajo del botón. «Nueva cotización» mide 48 y flota 12 px sobre la barra. Hoy y Agenda ya reservan 72. Servicios no.

## Goals / Non-Goals

**Goals:**

- El padding termina por encima del botón, con 12 px de aire.
- El ancla sigue sobre el pie o la barra. No se mueve el botón a otro párrafo.
- El pie, el área segura y el scroll siguen.

**Non-Goals:**

- No reordenar la navegación ni ocultar acciones.
- No tocar el viewport ni el zoom.
- No rediseñar el modal. El subtítulo pasa de una línea a dos.

## Decisions

1. `reservaScrollSobreAccion(ancla, alto)` es el padding.
2. En la ficha, el ancla es el alto del pie más 12, o la posición que el botón ya tenía si no hay pie.
3. En Servicios, se suman 72 al padding cuando la acción flotante está visible.

## Risks / Trade-offs

- [El botón sigue fijo mientras se hace scroll] → Al llegar al final, la última línea queda libre. No se tapa el teléfono ni el texto de avance en reposo al fondo.
