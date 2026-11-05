## Context

`CotizacionCanalSerializer` ya devuelve `validacion_estado`, `validacion_motivo` y `alertas` en cada repuesto, y `alertas_validacion` en la cotización. `casa_sugerida` llega siempre. El editor y el desglose no leen esos campos.

## Goals / Non-Goals

**Goals:**

- Badge por línea con el color del estado y las etiquetas pedidas.
- Motivo y alertas visibles, colapsados cuando el texto es largo.
- Bloque «Revisión del cotizador» arriba, con la lista de la cotización.
- Cotizaciones viejas, sin esos campos, se ven igual que hoy.

**Non-Goals:**

- No recalcular la validación en el cliente.
- No mostrar estos campos en la vista pública del cliente.
- No cambiar el margen ni el enlace de tienda.

## Decisions

1. La vista pura vive en `utils/validacionCotizacion.ts`. Un estado desconocido o ausente no produce badge. `alertas` que no sea un arreglo se trata como vacío.
2. El detalle es largo si hay más de dos alertas o si motivo más alertas superan 180 caracteres. Empieza cerrado y el taller lo abre con «Ver detalle».
3. El bloque de arriba solo se arma con `alertas_validacion`. No se deduce de las líneas, para no duplicar una lista que el backend ya filtró.
4. Los colores salen de `InstitutionalTag`: `success`, `neutral`, `warning`, `error`.

## Risks / Trade-offs

- [Una cotización guardada antes de este backend no trae estado] → No se muestra badge ni bloque.
- [Una línea `ok` puede traer alertas de un pack] → El badge sigue siendo «Verificado» y las alertas se leen debajo. Esa línea también puede estar en `alertas_validacion`.
