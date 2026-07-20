# pipeline-comercial Specification

## Purpose
Vista unificada de seguimiento comercial multi-origen para el taller: marketplace, catálogo, canales omnicanal y citas personales.

## Requirements

### Requirement: Agregador backend
El sistema SHALL exponer `GET /api/ordenes/pipeline-comercial/` con filas normalizadas (`estado_normalizado`, `origen`, `cliente_nombre`, `esperando_respuesta_24h`).

#### Scenario: Cotización WhatsApp en espera
- **WHEN** existe `CotizacionCanal` en estado `enviada` hace más de 24h
- **THEN** la fila aparece con `estado_normalizado=cotizacion_enviada` y `esperando_respuesta_24h=true`

### Requirement: Sección en Hoy
La pestaña Hoy SHALL mostrar un bloque "Seguimiento comercial" con alertas +5 ítems y enlace a pantalla completa.

#### Scenario: Ver todo
- **WHEN** el usuario pulsa "Ver todo"
- **THEN** navega a `app/pipeline-seguimiento.tsx`
