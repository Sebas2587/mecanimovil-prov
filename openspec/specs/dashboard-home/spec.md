# dashboard-home Specification

## Purpose
Pantalla **Hoy** del proveedor (`app/(tabs)/index.tsx`). Cola de atención estilo Airbnb Hosts: qué hacer ahora (IA activa, HITL, seguimiento comercial, citas del día). Pipeline completo en **Bandeja** (`/(tabs)/bandeja`), accesible en 1 tap desde Hoy.

## Requirements

### Requirement: Tab Hoy (Today)
The home tab SHALL be labeled "Hoy" and follow this architecture:

1. Header compacto (avatar, saludo/nombre, notificaciones)
2. **Grid 2 columnas** (responsive): Cotizar con IA · Bandeja (badges desde React Query)
3. **Cotizaciones pendientes de revisión** — lista Host (filas hairline, no cards anidadas). Tap abre modal fullscreen con `CotizacionIaEditor`. Al aprobar/enviar, la cotización pasa a Bandeja (`cotizacion_enviada` / abiertos).
4. **Alertas flotantes descartables** — no fijas en el feed. Operativas (horarios/suscripción) con X; leads vía WebSocket (`agente_ia_*`) como toast flotante solo cuando ocurre la acción.
5. **Requiere tu atención** — fila corta (máx. 5): citas con `horario_por_confirmar` y cotizaciones `esperando_respuesta_24h`. Tap: detalle de cita o chat. “Ver todas” → Bandeja (filtro según el mix). Cada fila muestra **nombre del cliente** y, si existe, un **tag de `vehiculo_resumen`**. Copy: confirmar horario, o preguntar qué pasó / cerrar el caso. Si el lead subió de curioso a interesado, el copy lo dice. No atribuir la coordinación a la IA solo por existir un chat.

Agenda, órdenes y pipeline detallado viven en sus tabs (`Agenda`, `Servicios`, `bandeja`). Hoy SHALL NOT listar citas con horario por confirmar como servicios del día ni como órdenes activas.

#### Scenario: Hoy no mezcla la agenda operativa
- GIVEN una cita con horario por confirmar
- WHEN se abre Hoy
- THEN no se lista como servicio del día ni como orden activa

### Requirement: Accesos rápidos
Atajos SHALL NOT duplicate primary tabs (Agenda vive en tab Agenda). Solicitudes B2C marketplace SHALL be reachable via `/solicitudes-disponibles` when radar is on.

#### Scenario: Agenda no se duplica
- GIVEN el tab Agenda
- WHEN se mira Hoy
- THEN no hay un atajo que repita ese tab

### Requirement: Seguimiento comercial unificado
Hoy SHALL surface follow-up counts from `pipeline-comercial` and link to `/(tabs)/bandeja` with optional `?filtro=` (estado, `esperando_24h` o `por_agendar`).

#### Scenario: Seguimiento visible
- GIVEN cotizaciones en estado enviado o negociación
- WHEN abre Hoy
- THEN ve el bloque Seguimiento comercial con enlace al embudo

#### Scenario: Aceptado sin horario
- GIVEN una cotización aceptada con cita `horario_por_confirmar`
- WHEN abre Hoy
- THEN ve la fila Requiere tu atención con etiqueta “Confirmar horario”
- AND si hay `vehiculo_resumen`, aparece como tag junto al nombre
- AND esa cita NO aparece en Servicios Activas ni en Agenda

#### Scenario: Cotización sin respuesta y lead que subió de curioso
- GIVEN una cotización enviada hace más de 24h cuyo lead es `interesado_calificado` o `listo_agendar`
- WHEN abre Hoy o Bandeja
- THEN ve “Sin respuesta” y el copy indica que ya mostró interés (escribe o cierra)
- AND no muestra la etiqueta “Curioso”
- AND si hay `vehiculo_resumen`, la fila muestra un tag del vehículo (no solo el nombre en el copy)

### Requirement: Vista mecánico
WHEN el usuario es mecánico de equipo (`esMecanicoEquipo`), THEN Hoy SHALL renderizar `MecanicoHomeView` en lugar del dashboard mandante.

#### Scenario: El mecánico ve su inicio
- GIVEN un mecánico de equipo
- WHEN abre Hoy
- THEN ve `MecanicoHomeView`
- AND no ve el dashboard del mandante

### Requirement: Finanzas desacopladas
KPI, saldo, rendimiento y suscripción SHALL NOT appear as bloques principales en Hoy; viven en el menú.

#### Scenario: Hoy no muestra el bloque de dinero
- GIVEN el mandante abre Hoy
- WHEN mira la pantalla
- THEN no ve KPI, saldo, rendimiento ni suscripción como bloque principal
- AND esas entradas siguen en el menú

### Requirement: Carga honesta de Hoy

Mientras Hoy no tiene respuesta, la pantalla MUST mostrar carga y MUST NOT pintar contadores en 0 ni un vacío. El vacío solo aparece con la respuesta. Un 0 ya respondido MUST verse como 0. «Por agendar» MUST contarse desde las cotizaciones de esa lista. El pipeline de Hoy MUST limitarse a las acciones visibles y MUST NOT pedir 100 filas para ese número.

#### Scenario: Hoy todavía carga

- GIVEN las cotizaciones del día aún no respondieron
- WHEN se abre Hoy
- THEN los contadores no muestran 0
- AND no aparece «Nada pendiente»

#### Scenario: Hoy vacío de verdad

- GIVEN las consultas de Hoy ya respondieron y no hay acciones
- WHEN se mira «Siguiente acción»
- THEN aparece el vacío «Nada pendiente»

#### Scenario: Por agendar sin barrer el pipeline

- GIVEN hay cotizaciones aceptadas en la lista del taller
- WHEN Hoy calcula «Por agendar»
- THEN el número sale de esas cotizaciones
- AND no depende de traer 100 filas del pipeline

### Requirement: Lista de cotizaciones con carga y pruebas

La lista de cotizaciones MUST distinguir «Cargando cotizaciones» de «Sin resultados». Mientras carga, MUST NOT mostrar la suma de dinero como $0. Un total 0 explícito, ya cargado, sigue siendo $0. Un total null sigue «Incompleto».

La lista MUST ocultar por defecto una cotización si la palabra TEST, con límite de palabra, aparece en `cliente_nombre`, `cliente_display` o `servicio_nombre`. «contestado» MUST NOT contar como prueba. Ocultarlas MUST NOT borrar el registro. Volver a mostrarlas MUST devolverlas a la lista.

#### Scenario: Suma mientras carga

- GIVEN la lista de cotizaciones todavía no respondió
- WHEN se abre la lista
- THEN no se muestra un total $0 como si no hubiera dinero
- AND el texto dice que está cargando

#### Scenario: Ocultar y mostrar una prueba

- GIVEN una cotización titulada «TEST pastillas» y otra titulada «Cambio de aceite»
- WHEN el filtro de pruebas está activo
- THEN solo se ve «Cambio de aceite»
- AND el registro TEST sigue existiendo
- WHEN se desactiva el filtro
- THEN «TEST pastillas» vuelve a la lista

#### Scenario: TEST en el nombre del cliente

- GIVEN una ficha con `cliente_nombre` «TEST Cotización IA 12» y servicio «Cambio de aceite»
- WHEN el filtro de pruebas está activo
- THEN esa ficha no se ve
- AND el registro sigue existiendo
- WHEN se desactiva el filtro
- THEN la ficha vuelve a la lista

#### Scenario: TEST en el servicio

- GIVEN una cotización con servicio «TEST pastillas»
- WHEN el filtro de pruebas está activo
- THEN no se ve
- AND un título «contestado» no se trata como prueba
