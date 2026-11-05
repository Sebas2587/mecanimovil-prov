# Design: referencia de tienda en la línea

## Dónde

La fila vive en `RepuestoRow` de `components/chats/CotizacionIaEditor.tsx`, justo bajo la grilla de cantidad y precio. Así queda a la vista en el detalle del taller sin abrir el sheet de precio. Los hosts que ya montan ese editor (detalle de canal, chat, cita, modal libre, plantilla) la heredan. El desglose del pipeline (`KanbanDetailModal`) usa la misma fila bajo cada repuesto.

## Datos

`CotizacionCanalSerializer` entrega en cada repuesto:

- `url_referencia`: string, `''` si no hay ficha
- `tienda_referencia`: string, `''` si no hay nombre
- `precio_verificado_clp`: entero o `null`

La fila se oculta cuando `url_referencia` está vacío. El texto es el nombre y, si hay monto, el precio con `formatearMontoCLP` (`$12.000`). Si falta el nombre o el monto, se omite esa parte y el enlace sigue.

## Abrir la ficha

Web: `window.open(url, '_blank', 'noopener,noreferrer')`. Nativo: `Linking.openURL`. Solo se abre `http` o `https`.

## Design system

Fila en una línea, caption, sin card extra. Enlace `captionBold` color `primary` con `ExternalLink` de Lucide.
