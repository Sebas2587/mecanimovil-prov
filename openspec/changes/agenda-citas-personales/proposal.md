# Propuesta: Agenda citas personales (UI proveedor)

## Why
El proveedor atiende clientes fuera de Mecanimovil y necesita bloquear su agenda,
registrar datos manualmente y distinguir citas personales de órdenes marketplace.

## What Changes
- Calendario unificado con etiquetas **Mecanimovil** / **Personal**
- FAB crear cita personal
- Formulario manual + selector catálogo mis-servicios
- Cerrar servicio → historial Completadas
- Cancelar → Rechazadas; eliminar físico si cancelada
- Banner recomendar app usuarios (sin checklist)

## Pantallas
- `app/(tabs)/calendario.tsx`
- `app/agendar-cita-personal.tsx`
- `app/cita-agenda-personal/[id].tsx`
- `app/(tabs)/ordenes.tsx`

## Design tokens
- `COLORS.institutional`, `SHADOWS.editorial`, Lucide vía `InstitutionalIcon`

## Non-goals
- Checklist, créditos, pagos MP en citas personales
- Mover citas Mecanimovil desde calendario
