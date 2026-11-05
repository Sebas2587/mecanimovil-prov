## Why

En el HEAD `5790559` un 502 o 504 borra el intento y permite otra clave, así que un cobro ya guardado puede duplicarse. El rótulo de carga sigue el borrador de fechas aunque no se haya consultado. La devolución precarga el timestamp del backend y el formulario lo rechaza. El intento incierto vive en una clave global y reaparece en otra cuenta.

## What Changes

- Un resultado ambiguo (sin estado, 408 o 5xx) conserva clave y cuerpo. Un 4xx definitivo sí permite editar.
- Los filtros son borrador hasta Consultar. La carga y el dinero muestran el período pedido o el del libro.
- La devolución precarga el día de Santiago de hoy, no la fecha de la entrada.
- El intento se guarda y se lee por usuario y taller. Cambiar de cuenta no lo borra ni lo muestra.

## Capabilities

### New Capabilities

- Ninguna. Ajusta `caja-taller`.

### Modified Capabilities

- `caja-taller`: resultado ambiguo, período del libro, día del reembolso e identidad del intento.

## Impact

- `app/caja-taller.tsx`, `utils/cajaTaller.ts`, `components/caja/CajaLibro.tsx` y tests de montaje.
- Sigue en el PR 15. No entra al PR 16. No hay merge ni deploy.
