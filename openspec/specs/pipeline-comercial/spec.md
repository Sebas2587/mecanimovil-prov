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

### Requirement: Vista Por agendar
La Bandeja SHALL exponer el filtro `por_agendar` (deep link `/(tabs)/bandeja?filtro=por_agendar`) con filas `horario_por_confirmar`. Negociando SHALL excluir esas filas. Abiertos las incluye.

#### Scenario: Cliente aceptó y falta horario
- GIVEN una cita con `horario_por_confirmar=true`
- WHEN el taller abre Bandeja → Por agendar
- THEN ve la fila con tag Por agendar y CTA Confirmar horario
- AND si hay `conversation_id` ve “IA coordinando horario”; si no, “Confirma día y hora”
