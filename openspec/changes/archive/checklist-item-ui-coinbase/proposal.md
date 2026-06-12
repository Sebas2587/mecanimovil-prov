# Propuesta: UI checklist ítems — Coinbase compacto

## Why
Los headers del modal checklist, la barra de progreso y las interfaces de cada tipo de ítem usaban tipografía grande, colores hex legacy y duplicación de título entre pantalla e ítem, alejándose del sistema institucional Coinbase.

## What Changes
- Header del modal (`ChecklistContainer`) y pantalla de ítem: barra compacta, tipografía `sm`/`md`, badge de estado inline.
- `ChecklistProgressBar`: solo barra delgada + métricas; sin fila de círculos por paso.
- `ChecklistItemRenderer` + subcomponentes (`FuelGauge`, `Inventory`): tokens `COLORS.institutional`, inputs outline hairline, CTA pill primary.
- Prop `hideHeader` en renderer cuando la pantalla de ítem ya muestra el título.

## Pantallas / componentes
- `components/checklist/ChecklistContainer.tsx`
- `components/checklist/ChecklistProgressBar.tsx`
- `components/checklist/ChecklistItemRenderer.tsx`
- `components/checklist/checklistItemStyles.ts`
- `components/checklist/items/FuelGaugeComponent.tsx`
- `components/checklist/items/InventoryChecklistComponent.tsx`
- `app/checklist-item/[ordenId]/[itemId].tsx`

## Design tokens
- `COLORS.institutional`, `SPACING`, `TYPOGRAPHY`, `BORDERS`, `withOpacity`
- `InstitutionalIcon`, `platformShadow`
