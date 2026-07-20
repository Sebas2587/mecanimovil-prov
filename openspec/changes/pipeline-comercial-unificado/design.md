# Design: pipeline-comercial-unificado

## Arquitectura backend

`pipeline_comercial.py` agrega filas de solo lectura desde:

| Fuente | `tipo_entidad` | `origen` |
|---|---|---|
| Solicitud pública sin oferta del proveedor | `solicitud_publica` | `marketplace` |
| OfertaProveedor | `oferta` | `marketplace` / `catalogo` |
| CotizacionCanal | `cotizacion_canal` | `whatsapp` / `instagram` / `messenger` / `canal` |
| CitaAgendaPersonal | `cita_personal` | `manual` |
| SolicitudServicio (carrito directo) | `orden_directa` | `marketplace` |

Cada fila expone `estado_normalizado` (6 estados de negocio), `esperando_respuesta_24h` (cotización enviada ≥24h), y deep links (`solicitud_id`, `conversation_id`, etc.).

## UI

- `PipelineSeguimientoSection`: filtros por estado y origen, banner +24h, navegación a detalle.
- `pipeline-seguimiento`: deep link `?filtro=esperando_24h`, pull-to-refresh vía `refreshKey`.
- Navegación: solicitud sin oferta → `solicitud-detalle/{id}`.

## Query params

- `estado_normalizado`, `origen`, `esperando_24h=true`, `miembro_taller`, `limite`
