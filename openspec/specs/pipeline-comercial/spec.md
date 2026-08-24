# pipeline-comercial Specification

## Purpose
Vista unificada de seguimiento comercial multi-origen para el taller: marketplace, catálogo, canales omnicanal y citas personales.

- **Bandeja** (`/(tabs)/bandeja`) lista **personas** (`GET /api/ordenes/pipeline-comercial/clientes/`). Tap abre la ficha `/cliente-comercial/{clienteKey}` con casos agrupados por vehículo.
- **Hoy / Necesita atención** siguen leyendo **folios** (`GET /api/ordenes/pipeline-comercial/`: una fila por caso, folio `MM-…`).

## Requirements

### Requirement: Agregador backend
El sistema SHALL exponer `GET /api/ordenes/pipeline-comercial/` con filas normalizadas (`estado_normalizado`, `origen`, `cliente_nombre`, `esperando_respuesta_24h`, `numero_publico` cuando aplica).

#### Scenario: Cotización WhatsApp en espera
- **WHEN** existe `CotizacionCanal` en estado `enviada` hace más de 24h
- **THEN** la fila aparece con `estado_normalizado=cotizacion_enviada` y `esperando_respuesta_24h=true`

#### Scenario: Una fila por folio
- GIVEN dos `CotizacionCanal` enviadas en la misma conversación
- WHEN el taller consulta `GET /pipeline-comercial/`
- THEN ve **dos** filas, cada una con su `numero_publico`
- AND una cita ligada a esa cotización se fusiona en la misma fila (folio MM + `cita_id` + `horario_por_confirmar` si aplica)
- AND una cita manual sin cotización sigue siendo una fila propia

#### Scenario: Reabierta para editar
- GIVEN una cotización enviada con folio `MM-000098`
- WHEN el taller pulsa “Actualizar cotización” (`enviada` → `borrador`, mismo token)
- THEN la fila de folio sigue visible con `en_edicion=true` y el mismo folio
- AND un borrador de IA **sin** folio no aparece en esa lista
- AND al reenviar (`borrador` → `enviada`) `en_edicion` pasa a false y el tag operativo vuelve al estado real (Esperando / Confirmar horario / etc.)

#### Scenario: Búsqueda por código
- GIVEN existe `MM-000098`
- WHEN el taller busca `MM-000098` o `98` (`?q=`)
- THEN el pipeline de folios y el de clientes devuelven ese caso / cliente aunque no esté entre los más recientes

#### Scenario: Orden cronológico
- GIVEN varias filas o clientes con distinta fecha
- WHEN el taller abre Bandeja o Hoy
- THEN aparecen de **más reciente a más antigua**
- AND `listo_para_enviar` / `lead_score` solo desempatan la misma fecha (folios)

#### Scenario: Búsqueda por patente
- GIVEN una cotización con patente `KGGR-22`
- WHEN el taller busca `KGGR22`, `kggr-22` o `kggr 22`
- THEN el pipeline de folios y el de clientes devuelven esa fila / cliente
- AND no interpreta los dígitos de la patente como id de cotización

#### Scenario: Chat inactivo o link público
- GIVEN una cotización `es_libre` o entregada por `link_publico` (ventana 24 h cerrada)
- WHEN el taller abre Bandeja
- THEN el cliente aparece con folio y origen `directo` o el canal
- AND no depende de que el chat esté abierto

### Requirement: Bandeja por cliente
Bandeja SHALL listar **un cliente por fila** (`GET /api/ordenes/pipeline-comercial/clientes/`). Agrupa por teléfono normalizado, si no `conversation_id`, si no `cliente_user_id`. Homónimos sin teléfono no se fusionan.

La fila SHALL mostrar nombre, tiempo relativo, N cotizaciones, tags de aceptadas/rechazadas y chips de vehículo (máx. 2 + “+k”). Tap SHALL abrir `/cliente-comercial/{clienteKey}`, no el detalle de un folio.

Filtros de lista: búsqueda + `Todos` / `Con acción` / `Cerrados` + origen. Los tabs Abiertos/Esperando/Negociando/Por agendar/Agendados/Perdidos no viven en esta lista.

#### Scenario: Dos cotizaciones misma persona
- GIVEN Jennifer con dos `CotizacionCanal` (Kicks `KGGR22` y Sail)
- WHEN el taller abre Bandeja
- THEN ve **una** fila Jennifer con 2 cotizaciones y chips de ambos vehículos
- AND al entrar, la ficha agrupa los casos por patente

#### Scenario: Homónimos
- GIVEN dos cotizaciones `es_libre` a nombre “Juan” sin teléfono ni conversación
- WHEN el taller abre Bandeja
- THEN ve dos filas distintas (`caso-…`)

### Requirement: Ficha de cliente
`GET /api/ordenes/pipeline-comercial/clientes/{cliente_key}/` SHALL devolver métricas y `vehiculos[].casos[]`. Tap en un caso SHALL abrir el detalle existente (`/cotizacion-canal/{id}`, cita, solicitud u orden).

#### Scenario: Tap en caso de cotización
- GIVEN un caso `cotizacion_canal` en la ficha
- WHEN the taller taps the row
- THEN abre el detalle de la cotización (mismo folio)
- AND si `horario_por_confirmar` y hay `cita_id`, abre la cita para confirmar horario

### Requirement: Sección en Hoy
La pestaña Hoy SHALL mostrar un bloque "Seguimiento comercial" con alertas +5 ítems y enlace a pantalla completa.

#### Scenario: Ver todo
- **WHEN** el usuario pulsa "Ver todo"
- **THEN** navega a `app/pipeline-seguimiento.tsx` (redirige a Bandeja)

### Requirement: Vista Por agendar
La Bandeja SHALL honrar el deep link `/(tabs)/bandeja?filtro=por_agendar` abriendo la lista de clientes en **Con acción**, con hint de horario pendiente. `esperando_24h` hace lo mismo con hint de sin respuesta.

#### Scenario: Cliente aceptó y falta horario
- GIVEN una cita con `horario_por_confirmar=true`
- WHEN the taller abre Bandeja con `?filtro=por_agendar`
- THEN ve al cliente en Con acción
- AND en la ficha el caso muestra “Confirmar horario”
- AND el CTA del detalle sigue siendo Confirmar horario

### Requirement: Cotización enviada sin respuesta
En la ficha, un caso `cotizacion_canal` enviado sin respuesta SHALL mostrar la etiqueta operativa “Sin respuesta” (o “Sin respuesta +48h”) al abrir el detalle. La lista de clientes no usa tabs Esperando.

#### Scenario: Tap en cotización enviada
- GIVEN un cliente con `cotizacion_canal` enviada
- WHEN the taller taps the client then the case
- THEN abre el detalle de la cotización (mismo folio)
- AND puede actualizarla, compartir el link o cerrar el caso
- AND Ver conversación no es el destino primario
