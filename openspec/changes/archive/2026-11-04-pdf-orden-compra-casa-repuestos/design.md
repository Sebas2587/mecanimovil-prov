# Design: PDF de orden de compra y nombre de tienda

## Pantallas

El botón vive en `components/chats/CotizacionIaEditor.tsx`, que ya comparten el detalle (`app/cotizacion-canal/[id].tsx`), el chat (`app/chat-omnicanal.tsx`), la cita (`app/cita-agenda-personal/[id].tsx`), el modal libre y la vista de plantilla. No se duplica el control en cada host.

Se muestra solo si `cotizacion.id > 0`. La vista previa de plantilla (`plantillaToCotizacionPreview`) usa un id negativo y un borrador sin folio guardado no tiene id: en ambos casos el botón no se renderiza. Un detalle de solo lectura con folio guardado sí lo muestra.

## PDF

`cotizacionCanalService.descargarOrdenCompraPdf` hace `GET /ordenes/cotizaciones-canal/{id}/orden-compra-pdf/` vía el cliente axios existente (`Authorization: Token …`, timeout 60s, `responseType: 'arraybuffer'`). El nombre de archivo sale de `Content-Disposition` o, si no viene, `orden-compra-{id}.pdf`.

- Web (`abrirOrdenCompraPdf.web.ts`): `Blob` + `<a download>`.
- Nativo (`abrirOrdenCompraPdf.ts`): `File` de `expo-file-system` en `Paths.cache` y `Sharing.shareAsync` con MIME `application/pdf`. Dependencias alineadas a Expo SDK 57 (`npx expo install`).

Mientras descarga, la píldora queda en loading y no acepta otro toque. Si la red, el cuerpo o la hoja de compartir fallan, un alerta corto pide reintentar. No se muestra el cuerpo del error.

## Origen del precio

`nombreFuente` deja de armar `tienda · dominio`. `tienda` es el nombre humano; `dominio` (por ejemplo `todoautochile.cl` o `Comercialramirezspa`) solo se usa si no hay nombre. `fichasInternasDe` sigue alimentando `FuenteFichaInterna` («Solo taller · origen del precio») con ese texto.

## Design system

Píldora existente `TallerPildora` (`tono="suave"`, `forma="hoja"`) e icono Lucide `FileDown`. Sin colores hex nuevos.
