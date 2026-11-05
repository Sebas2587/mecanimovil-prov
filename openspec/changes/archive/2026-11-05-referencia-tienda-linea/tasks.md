# Tasks — referencia-tienda-linea

## Datos y UI
- [x] `services/cotizacionCanalService.ts`: campos `url_referencia`, `tienda_referencia`, `precio_verificado_clp`
- [x] `components/cotizacion/ReferenciaTiendaLinea.tsx`: fila compacta y enlace
- [x] `components/chats/CotizacionIaEditor.tsx` y `components/commercial/KanbanDetailModal.tsx`: mostrar la fila bajo cada repuesto, visible sin abrir el precio

## Verificación
- [x] Tests de texto y de ocultar cuando no hay URL
- [x] `openspec validate referencia-tienda-linea`
- [x] Typecheck, lint y `expo export --platform web`
- [x] Archivar el change
