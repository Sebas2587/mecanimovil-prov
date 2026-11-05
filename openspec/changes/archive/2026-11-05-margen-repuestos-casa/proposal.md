# margen-repuestos-casa

## Why

El serializer del taller ahora separa la tienda real del link (`tienda_referencia`) de la casa sugerida (`casa_sugerida`) y manda costo, cobrado y margen por línea y por cotización. Si el enlace se muestra como si fuera de la casa, el taller compra en el lugar equivocado. El margen tiene que verse en la línea y en el resumen, y moverse cuando cambia el precio cobrado.

## What Changes

- La fila **Ver en tienda** nombra la tienda real del link, muestra «Casa sugerida: X» aparte y, si `precio_verificado_en_casa` es false, deja visible `nota_referencia`.
- Cada repuesto en `CotizacionIaEditor` y en el desglose del pipeline muestra costo, cobrado y margen (CLP y %). En el editor el margen se recalcula con el precio que el taller está escribiendo: `(cobrado − costo) × cantidad`, y el % es sobre el cobrado. Costo desconocido se lee «sin costo».
- El resumen de la cotización muestra costo total de repuestos, cobrado total, ganancia y %. Verde si la ganancia es positiva, rojo si es negativa.

No hay rutas nuevas ni cambios de backend. Textos con `InstitutionalText` caption; ganancia con `semanticUp` / `semanticDown`; aviso con Lucide `AlertTriangle`. Sin colores hex.
