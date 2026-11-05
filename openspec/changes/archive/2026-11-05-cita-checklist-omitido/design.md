## Context

`CitaAgendaPersonalSerializer` sirve la lista `GET /ordenes/citas-agenda-personal/` y el detalle. Siempre incluye `checklist_estado` (enum o null) y `estado_operativo`.

Enums de `ChecklistInstance`: PENDIENTE, EN_PROGRESO, PAUSADO, PENDIENTE_FIRMA_SUPERVISOR, PENDIENTE_FIRMA_CLIENTE, COMPLETADO, CANCELADO.

`get_estado_operativo` es más grueso: EN_PROGRESO, PAUSADO y las dos firmas salen `en_ejecucion`. Sin instancia: `agendado` si hay técnico, si no `nuevo`. Cancelada y cerrada van primero. `CANCELADO` del checklist cae en el else y el API manda `agendado`.

`EventoAgendaUnificadoSerializer` copia `checklist_estado` pero no lleva `estado_operativo`. El campo del evento es opcional.

## Goals / Non-Goals

**Goals:**

- Enum explícito afina. PENDIENTE no se vuelve ejecución.
- Campo omitido, null, vacío o desconocido lee `estado_operativo`.
- Cita cancelada o cerrada sigue ganando.

**Non-Goals:**

- No cambiar el backend.
- No tratar el modal ni el viewport en este cambio.

## Decisions

1. Solo los siete enums son checklist explícito.
2. `CANCELADO` explícito se muestra «Cancelado», aunque el grueso del API diga `agendado`.
3. Sin enum usable, `mapCitaEstadoOperativo` conserva nuevo, en ejecución, completado y cancelado.

## Risks / Trade-offs

- [Lista y detalle reciben payloads distintos] → La misma función puede decir «En ejecución» en la lista y «Falta la firma» en el detalle. El test lo fija. No se fuerza el mismo texto si falta el enum.
