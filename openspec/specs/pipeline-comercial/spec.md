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
- THEN ve una sola etiqueta de estado: “Confirmar horario”
- AND no muestra “IA coordinando horario” ni “Listo agendar”
- AND el CTA del detalle sigue siendo Confirmar horario

### Requirement: Cotización enviada sin respuesta
Bandeja SHALL mostrar una sola etiqueta operativa “Sin respuesta” (o “Sin respuesta +48h”). SHALL hide “Curioso”. If the lead later upgrades to interesado/listo_agendar, SHALL show that category next to Sin respuesta.
Tapping the row SHALL open the action sheet (Ver conversación, Cerrar caso, Marcar aceptada) instead of the quote editor. Quote editor remains a secondary action.

#### Scenario: Curioso que no respondió
- GIVEN cotización `enviada` ≥24h and lead `curioso`
- WHEN the taller opens Bandeja Esperando
- THEN the row says Sin respuesta and “pregunta qué pasó o cierra el caso”
- AND primary actions are Ver conversación and Cerrar caso

#### Scenario: Lead que subió de intención
- GIVEN the same conversation later classified as `interesado_calificado`
- WHEN the row is shown
- THEN it may show Calificado plus Sin respuesta
- AND copy indicates that the client already showed interest

#### Scenario: Tap en cotización enviada
- GIVEN a `cotizacion_canal` in Esperando
- WHEN the taller taps the row
- THEN the sheet offers Ver conversación (primary), Marcar aceptada and Cerrar caso
- AND Abrir cotización is secondary
