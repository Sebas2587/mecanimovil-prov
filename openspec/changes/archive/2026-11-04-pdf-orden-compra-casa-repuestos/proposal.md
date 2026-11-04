# pdf-orden-compra-casa-repuestos

## Why

El taller arma la compra en el editor de cotización IA y hoy no puede bajar la orden de compra para la casa de repuestos. Además, la línea «origen del precio» pega el slug crudo (`todoautochile.cl`, `Comercialramirezspa`) al nombre de la tienda, y esa etiqueta no es la que se le muestra al proveedor.

## What Changes

- Botón **PDF para casa de repuestos** en el componente compartido `CotizacionIaEditor` (detalle y editor: `app/cotizacion-canal/[id]`, chat omnicanal, cita, cotización libre).
- `GET /ordenes/cotizaciones-canal/{id}/orden-compra-pdf/` con la misma sesión que el resto de la API. En web descarga el archivo; en nativo lo escribe con `expo-file-system` y abre la hoja de compartir con `expo-sharing`.
- El botón no aparece en la vista previa de plantilla ni cuando la cotización aún no tiene id guardado.
- La línea «Solo taller · origen del precio» muestra el nombre humano de tienda que manda el backend, sin concatenar el dominio o slug.

No hay rutas nuevas. No hay cambios de backend: el endpoint ya está publicado. Tokens del design system ya usados en el editor (`TallerPildora` tono suave, icono Lucide `FileDown`, color `ink`).
