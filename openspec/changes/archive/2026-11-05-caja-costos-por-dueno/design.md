## Context

El cobro incierto ya vive en un mapa por usuario y taller. El costo ambiguo estaba en un ref con un solo objeto. El catch lo reemplazaba entero, así que el 502 tardío de A borraba la protección de B.

## Goals / Non-Goals

**Goals:**

- Un mapa `clave de cuenta → { serial, aviso }` para el costo.
- Escribir y borrar solo la clave del envío.
- Restaurar el aviso de la cuenta visible al cambiar de identidad.
- No pintar ni cerrar el formulario de B cuando el costo de A responde 200, 400 o 409.

**Non-Goals:**

- Persistir el costo en sessionStorage. El cobro incierto ya tiene su mapa. Merge, deploy y el PR 16 quedan fuera.

## Decisions

1. El ref del costo es un `Map`. La clave es la misma de usuario y taller que usa el intento del cobro.
2. Un 502 hace `set` de esa clave. Un 200 o un rechazo definitivo hace `delete` de esa clave. Ninguno recorre ni reemplaza el mapa.
3. El ref del cobro en curso sigue siendo de una cuenta, pero solo se escribe si la clave coincide. La clave idempotente vive en el mapa de intentos, no en esa ranura. No hace falta otro mapa.

## Risks / Trade-offs

- El mapa del costo muere si se desmonta la pantalla. El caso que se corrige es el cambio de cuenta en la misma pestaña, con los dos POST todavía en vuelo.
