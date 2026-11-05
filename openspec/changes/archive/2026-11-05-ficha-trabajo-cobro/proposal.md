# Proposal

## Why

El dueño ve el mismo trabajo por dos o tres pantallas y el pago desaparece dentro de «Agendado». Una cotización aceptada o una cita cerrada no dicen si el dinero entró.

## What Changes

- Una ficha compartida separa el avance del trabajo y el cobro: Pagado, Por cobrar o Sin registro.
- Pagado y Por cobrar solo aparecen con un estado o un campo de pago. Cita y cotización quedan en Sin registro.
- Las rutas de orden, servicio y cita siguen siendo distintas. No se mezclan sus ids ni sus acciones.
- El resumen de precios de la orden deja de inventar comisión y ganancia cuando falta el desglose del backend.
- En web, los campos compartidos usan 16 px para no disparar el zoom automático.

## Capabilities

### New Capabilities

### Modified Capabilities

- `ordenes-gestion`: la orden y el servicio muestran avance y cobro por separado, sin cifras inventadas.

## Impact

- Pantallas: detalle de orden, detalle de servicio, cita de agenda, solicitud, lista de Servicios, ficha de cliente y seguimiento.
- Tokens y tags existentes. Sin pantalla nueva y sin reordenar el menú.
- Backend: no. Los enums de la API no cambian.
