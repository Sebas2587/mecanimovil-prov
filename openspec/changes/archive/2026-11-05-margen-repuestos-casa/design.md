# Design: casa sugerida y margen de repuestos

## Referencia

`ReferenciaTiendaLinea` sigue en la línea del editor y en `KanbanDetailModal`. El nombre junto al enlace es solo `tienda_referencia`. «Casa sugerida» es otra línea. Si `precio_verificado_en_casa` es false, se muestra `nota_referencia` (o un aviso corto si el backend la manda vacía). El nombre de la casa nunca reemplaza el de la tienda del link.

## Margen en vivo

`utils/margenRepuestos.ts` calcula desde la línea que el editor ya edita (`precio_unitario_clp` es el cobrado; `costo_unitario_clp` es el costo):

- margen CLP = (cobrado − costo) × cantidad
- % = margen / (cobrado × cantidad), solo si el cobrado de la línea es mayor que 0
- costo `null` → «sin costo» y sin margen inventado

El resumen suma las líneas. Si alguna no tiene costo, la ganancia solo incluye las que sí lo tienen y el texto lo dice. Los totales del serializer quedan en el tipo; la UI usa el cálculo local para que el número cambie al escribir.

## Color

Ganancia o margen mayor que 0: `semanticUp`. Menor que 0: `semanticDown`. Cero o desconocido: `muted`.
