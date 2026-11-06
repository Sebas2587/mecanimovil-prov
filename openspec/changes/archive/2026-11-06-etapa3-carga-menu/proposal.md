## Why

Hoy pinta ceros y «Nada pendiente» mientras las listas todavía cargan, el menú repite Rendimiento y mezcla la caja con los créditos, y borrar o limpiar queda al lado de acciones normales. Una cita abierta por URL puede quedarse en «Cargando…» cerca de un minuto.

## What Changes

- Las listas y resúmenes de Hoy, cotizaciones y la actividad reciente muestran un estado de carga y solo después el vacío real. Un cero ya confirmado del libro de caja sigue siendo $0.
- El número «por agendar» sale de las cotizaciones ya pedidas para la lista. Hoy no pide 100 filas del pipeline solo para ese número.
- El menú deja un solo acceso a Rendimiento y separa la caja del mes de Plan, Saldo e Historial de créditos. Finanzas del mes sigue en `/caja-taller`. Recargar y el plan siguen en `/creditos`.
- Eliminar, limpiar y el ícono de basura piden confirmación. Cancelar no ejecuta la acción.
- Las cotizaciones cuyo título trae TEST se pueden ocultar y volver a mostrar, sin borrarlas.
- La ficha de cita muestra el dato en cuanto llega y no espera un segundo intento ni el detalle del técnico para salir de «Cargando…».
- «1 pago de fuente no entra al libro» concuerda en número. El contrato de dinero no cambia.

## Capabilities

### New Capabilities

- `acciones-destructivas`: confirmación antes de borrar o limpiar, y cancelar no ejecuta la acción.

### Modified Capabilities

- `dashboard-home`: carga honesta de Hoy y de la lista de cotizaciones, y filtro reversible de títulos TEST.
- `perfil-proveedor`: menú sin Rendimiento duplicado y con la caja separada de los créditos.
- `caja-taller`: concordancia «1 pago» / «N pagos». Un 0 del resumen confirmado sigue siendo $0.
- `agenda-calendario`: la ficha por URL no permanece en «Cargando…» por un reintento o por el enriquecimiento del técnico.

## Impact

- `components/home/HomeAttentionFeed.tsx`, `components/taller/CotizacionesVista.tsx`, `app/(tabs)/perfil.tsx`.
- `components/caja/CajaLibro.tsx` y el texto del legado. No cambia el cálculo del neto.
- `components/chats/ChatSwipeableRow.tsx`, alertas, y el basurero de líneas del editor (solo la confirmación).
- `hooks/useCitaPersonalQuery.ts` y `app/cita-agenda-personal/[id].tsx`. El deep link y los permisos se mantienen.
- Sin pantallas nuevas, sin merge y sin deploy.
