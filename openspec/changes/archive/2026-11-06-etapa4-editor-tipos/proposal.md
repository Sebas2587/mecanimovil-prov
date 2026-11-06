# Proposal

## Why

El editor de cotización concentra encabezado, repuestos, mano de obra y resumen en un solo archivo, y la ficha de la orden y la agenda comercial no cierran sus tipos. En cotización y caja no hay un aviso cuando el dispositivo se queda sin señal, y varios textos de dinero o de estado quedan por debajo de 13 px.

## What Changes

- Extraer encabezado, repuestos, mano de obra y resumen del editor a componentes con las mismas props y el mismo cálculo de margen, envío y reapertura de folio.
- Cerrar los errores de TypeScript de la ficha de orden y de AgendaComercial, sin limpiar el resto del baseline.
- Mostrar un aviso cuando no hay señal en la cotización y en la caja. No hay cotización offline ni se toca el checklist.
- Subir a 13 px los textos de dinero y de estado que estaban en 10 u 11 px en créditos, perfil y las pestañas. El kanban sin uso no se reincorpora.

## Capabilities

### New Capabilities

- `senal-red`: aviso visible cuando el dispositivo no tiene señal, en la cotización y en la caja.

### Modified Capabilities

- `asistente-ia`: el editor se parte en encabezado, repuestos, mano de obra y resumen sin cambiar margen, envío ni reapertura.
- `ordenes-gestion`: la ficha lee cliente protegido o completo y la dirección segura del contrato.
- `agenda-calendario`: la agenda comercial no trata un evento descartado como cita.
- `caja-taller`: la caja muestra el aviso de sin señal y recupera el pie al cerrar el teclado.
- `design-system`: textos de dinero y de estado a 13 px o más en créditos, perfil y pestañas.

## Impact

- `components/chats/CotizacionIaEditor.tsx` y `components/cotizacion/editor/`.
- `app/orden-detalle/[id].tsx`, `components/taller/AgendaComercial.tsx`.
- `app/caja-taller.tsx`, `hooks/useSenalRed.ts`, `components/ui/AvisoSinSenal.tsx`.
- Créditos, configuración de perfil y etiquetas de pestaña.
- No cambia el contrato de caja, el envío de un folio ni el checklist offline.
