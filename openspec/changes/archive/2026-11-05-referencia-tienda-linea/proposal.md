# referencia-tienda-linea

## Why

El serializer de cotización del taller ahora manda, en cada repuesto, el link de la ficha (`url_referencia`), el nombre de la tienda (`tienda_referencia`) y el precio verificado (`precio_verificado_clp`). Hoy esa referencia no se ve en la línea: el taller tiene que entrar al precio para buscar de dónde salió.

## What Changes

- Tipo `RepuestoCotizacion` con `url_referencia`, `tienda_referencia` y `precio_verificado_clp`.
- Bajo cada línea de repuesto en `CotizacionIaEditor` (detalle y editor compartidos: `app/cotizacion-canal/[id]`, chat, cita, cotización libre y plantilla) y en el desglose del pipeline (`KanbanDetailModal`), una fila compacta `{tienda} {precio}` y el enlace **Ver en tienda**.
- El enlace abre `url_referencia` en una pestaña nueva en web y con `Linking.openURL` en nativo.
- Si `url_referencia` viene vacío, la fila no se muestra.

No hay rutas nuevas ni cambios de backend. La fila usa `InstitutionalText` caption, color `muted` / `primary`, icono Lucide `ExternalLink` y el gap de `SPACING.fixed.xs`. Sin colores hex.
