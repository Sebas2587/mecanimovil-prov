## Context

`/servicio-detalle/:id` y `/orden-detalle/:id` cargan la misma orden con acciones distintas. `/oferta-detalle/:id` redirige a la solicitud. La cita usa otro id. `mapOrdenEstadoToOperativo` mete `pagada` y `pendiente_pago` en Agendado. El detalle de servicio aproximaba una ganancia con IVA y 20 % cuando faltaba el desglose.

## Goals / Non-Goals

**Goals:**

- Misma lectura de avance y cobro al entrar desde Hoy, Agenda, Clientes y Servicios.
- Conservar checklist, fotos, asignación, firma y el resto de acciones.
- No prometer un beneficio neto ni tratar la cotización aceptada como caja.

**Non-Goals:**

- No fusionar las tres pantallas en una.
- No reordenar tabs ni el menú.
- No sumar la caja del mes. Eso queda para la etapa 2.
- No cambiar enums del API.

## Decisions

1. `resolverCobroTrabajo` es puro. Cita y cotización devuelven Sin registro siempre. En orden y oferta, un campo `pendiente` gana sobre el estado `pagada`. `pago_validado` no es evidencia de cobro.
2. `EstadoTrabajoCobro` se monta en orden, servicio, cita y ejecución de solicitud. Las listas agregan el mismo tag.
3. `resumenPreciosOrden` solo suma comisión y «después de comisión» si todas las líneas traen desglose. Si falta una, muestra el total y lo dice.
4. Los inputs compartidos suben a 16 px solo en web. No se toca el viewport ni el zoom del usuario.

## Risks / Trade-offs

- [El estado `pagada` sin campos de pago se muestra Pagado] → Es la evidencia que ya guarda la orden. Si el backend miente, la ficha también.
- [Quitar la ganancia aproximada baja información] → Esa cifra no venía del backend. Se documenta en la pantalla en vez de mostrarla.
