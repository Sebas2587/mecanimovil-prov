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
5. **Requiere tu atención** — fila corta (máx. 5): citas con `horario_por_confirmar` y cotizaciones `esperando_respuesta_24h`. Tap: detalle de cita o chat. “Ver todas” → Bandeja (filtro según el mix). Copy: confirmar horario, o preguntar qué pasó / cerrar el caso. Si el lead subió de curioso a interesado, el copy lo dice. No atribuir la coordinación a la IA solo por existir un chat.

Agenda, órdenes y pipeline detallado viven en sus tabs (`Agenda`, `Servicios`, `bandeja`). Hoy SHALL NOT listar citas con horario por confirmar como servicios del día ni como órdenes activas.

### Requirement: Accesos rápidos
Atajos SHALL NOT duplicate primary tabs (Agenda vive en tab Agenda). Solicitudes B2C marketplace SHALL be reachable via `/solicitudes-disponibles` when radar is on.

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
- AND esa cita NO aparece en Servicios Activas ni en Agenda

#### Scenario: Cotización sin respuesta y lead que subió de curioso
- GIVEN una cotización enviada hace más de 24h cuyo lead es `interesado_calificado` o `listo_agendar`
- WHEN abre Hoy o Bandeja
- THEN ve “Sin respuesta” y el copy indica que ya mostró interés (escribe o cierra)
- AND no muestra la etiqueta “Curioso”

### Requirement: Vista mecánico
WHEN el usuario es mecánico de equipo (`esMecanicoEquipo`), THEN Hoy SHALL renderizar `MecanicoHomeView` en lugar del dashboard mandante.

### Requirement: Finanzas desacopladas
KPI, saldo, rendimiento y suscripción SHALL NOT appear as bloques principales en Hoy; SHALL estar en Menú → Dinero.
