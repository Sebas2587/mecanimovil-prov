## Context

`contentContainerStyle.paddingBottom` alarga el contenido. El viewport del scroll sigue pasando por debajo del botón absoluto, así que un teléfono a mitad de ficha queda tapado y no recibe el toque.

## Goals / Non-Goals

**Goals:**

- El control en reposo está fuera del scroll.
- Sin pie, no queda un `bottomOffset` distinto del que tenía el botón absoluto: ese botón ya no está.
- En la lista, el margen del marco es el alto que reporta `onLayout` del control.

**Non-Goals:**

- No reordenar la navegación.
- No fijar un alto de botón en un test y presentarlo como prueba de layout.

## Decisions

1. La cita usa el `rightComponent` de la cabecera. El menú solo existe abierto.
2. «Nueva cotización» mide su caja, aire incluido, y Servicios aplica ese número como `marginBottom` del marco.

## Risks / Trade-offs

- [El menú abierto cuelga sobre el scroll] → Solo mientras está abierto. En reposo no hay capa encima del teléfono.
