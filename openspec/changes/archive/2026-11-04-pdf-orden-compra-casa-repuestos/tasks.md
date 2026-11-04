# Tasks — pdf-orden-compra-casa-repuestos

## PDF
- [x] Agregar `expo-file-system` y `expo-sharing` compatibles con Expo SDK 57
- [x] `services/cotizacionCanalService.ts`: GET del PDF autenticado y bytes + nombre de archivo
- [x] `utils/abrirOrdenCompraPdf.ts` / `.web.ts`: escribir y compartir en nativo; descargar en web
- [x] `components/chats/CotizacionIaEditor.tsx`: botón «PDF para casa de repuestos», oculto sin id guardado, con loading y error

## Origen del precio
- [x] `components/cotizacion/repuestoCerteza.ts`: `nombreFuente` muestra el nombre humano y no concatena el slug
- [x] Tests de nombre de tienda y de visibilidad / nombre de archivo del PDF

## Verificación
- [x] `openspec validate pdf-orden-compra-casa-repuestos`
- [x] Typecheck y `expo export --platform web` sin errores nuevos
- [x] Archivar el change
