## Context

Hoy `redondearCLP(null)` y `total_clp || 0` pintan $0. El contrato viejo no trae `totales_completos`. El contrato nuevo lo trae y pone `total_clp` en null si falta una línea. Un 0 numérico sigue siendo un total real.

## Goals / Non-Goals

- Goals: la misma lectura en lista, detalle, burbuja y editor; no enviar un total incompleto como 0; seguir mostrando el 0 legítimo.
- Non-Goals: no pantalla de caja, no cambio de ruta, no recalcular margen ni reembolsos.

## Decisions

- Si `totales_completos` no viene y `total_clp` es número, se muestra ese número. Así el backend viejo no cambia.
- Si `totales_completos` es false o `total_clp` es null, el texto es «Incompleto». `total_persistido_clp` no reemplaza ese vacío.
- El editor usa las líneas en pantalla. Un precio null o vacío bloquea el envío. Un precio 0 no.
- Guardar un borrador no es enviarlo.

## Risks / Trade-offs

- Una línea creada con precio 0 sigue siendo un cero explícito, igual que hoy. No se la trata como precio faltante.
