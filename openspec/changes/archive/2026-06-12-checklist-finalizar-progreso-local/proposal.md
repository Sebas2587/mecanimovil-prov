# Propuesta: Habilitar finalizar checklist tras reapertura

## Why
Tras `reabrir_checklist`, el backend deja `progreso_porcentaje` en 0% aunque las respuestas sigan completas. La app proveedor usaba ese valor para `canFinalize`, bloqueando la firma aunque la UI mostrara todos los ítems listos.

## What Changes
- Calcular progreso desde `respuestas` + `template.items` (no solo `progreso_porcentaje` del API).
- Comparar ítems obligatorios con helper tolerante number/string en `item_template`.
- Actualizar `progreso_porcentaje` local al guardar cada respuesta.
