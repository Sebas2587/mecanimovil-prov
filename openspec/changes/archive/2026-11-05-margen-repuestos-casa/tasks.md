# Tasks — margen-repuestos-casa

## Datos y cálculo
- [x] Tipos nuevos en `services/cotizacionCanalService.ts`
- [x] `utils/margenRepuestos.ts` y `utils/referenciaTienda.ts`: casa, aviso y margen en vivo

## UI
- [x] `components/cotizacion/ReferenciaTiendaLinea.tsx`: tienda real, casa sugerida y nota
- [x] `components/cotizacion/MargenRepuestos.tsx`: línea y resumen, verde o rojo
- [x] `CotizacionIaEditor.tsx` y `KanbanDetailModal.tsx`: mostrarlos sin abrir el precio

## Verificación
- [x] Tests de referencia y de margen
- [x] `openspec validate margen-repuestos-casa`
- [x] Typecheck y `expo export --platform web`
- [x] Archivar el change
