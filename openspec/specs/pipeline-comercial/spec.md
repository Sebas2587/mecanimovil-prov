# pipeline-comercial Specification

## Purpose
Vista unificada de seguimiento comercial multi-origen para el taller: marketplace, catálogo, canales omnicanal y citas personales. En Bandeja, cada **cotización de canal es un caso** identificable por folio `MM-…`, no un hilo de chat.

## Requirements

### Requirement: Agregador backend
El sistema SHALL exponer `GET /api/ordenes/pipeline-comercial/` con filas normalizadas (`estado_normalizado`, `origen`, `cliente_nombre`, `esperando_respuesta_24h`, `numero_publico` cuando aplica).

#### Scenario: Cotización WhatsApp en espera
- **WHEN** existe `CotizacionCanal` en estado `enviada` hace más de 24h
- **THEN** la fila aparece con `estado_normalizado=cotizacion_enviada` y `esperando_respuesta_24h=true`

#### Scenario: Una fila por folio
- GIVEN dos `CotizacionCanal` enviadas en la misma conversación
- WHEN el taller abre Bandeja
- THEN ve **dos** filas, cada una con su `numero_publico`
- AND una cita del mismo chat NO reemplaza esas filas

#### Scenario: Reabierta para editar
- GIVEN una cotización enviada con folio `MM-000098`
- WHEN el taller pulsa “Actualizar cotización” (`enviada` → `borrador`, mismo token)
- THEN la fila sigue en Bandeja (Abiertos) con `en_edicion=true` y el mismo folio
- AND un borrador de IA **sin** folio no aparece en esa lista

#### Scenario: Búsqueda por código
- GIVEN existe `MM-000098`
- WHEN el taller busca `MM-000098` o `98` (`?q=`)
- THEN el pipeline devuelve esa fila aunque no esté entre las más recientes

#### Scenario: Chat inactivo o link público
- GIVEN una cotización `es_libre` o entregada por `link_publico` (ventana 24 h cerrada)
- WHEN el taller abre Bandeja
- THEN la fila aparece con folio y origen `directo` o el canal
- AND no depende de que el chat esté abierto

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

La fila de `cotizacion_canal` SHALL mostrar **nombre del cliente**, tag de folio `MM-…` y tag de vehículo. Tap SHALL abrir `/cotizacion-canal/{id}`. “Ver conversación” es secundario y solo si hay `conversation_id`.

#### Scenario: Curioso que no respondió
- GIVEN cotización `enviada` ≥24h and lead `curioso`
- WHEN the taller opens Bandeja Esperando
- THEN the row says Sin respuesta and copy invita a abrir la cotización o cerrar el caso
- AND the folio MM is visible on the row

#### Scenario: Lead que subió de intención
- GIVEN the same conversation later classified as `interesado_calificado`
- WHEN the row is shown
- THEN it may show Calificado plus Sin respuesta
- AND copy indicates that the client already showed interest

#### Scenario: Tap en cotización enviada
- GIVEN a `cotizacion_canal` in Esperando
- WHEN the taller taps the row
- THEN abre el detalle de la cotización (mismo folio)
- AND puede actualizarla, compartir el link o cerrar el caso
- AND Ver conversación no es el destino primario
