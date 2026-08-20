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
5. **Por agendar** — fila corta (máx. 5) de cotizaciones aceptadas con `horario_por_confirmar`. Tap abre el detalle de la cita. “Ver todas” → `/(tabs)/bandeja?filtro=por_agendar`. Copy: IA coordinando vs confirmar día y hora.

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
- THEN ve la fila Por agendar con la acción de confirmar horario o esperar a la IA
- AND esa cita NO aparece en Servicios Activas ni en Agenda

### Requirement: Vista mecánico
WHEN el usuario es mecánico de equipo (`esMecanicoEquipo`), THEN Hoy SHALL renderizar `MecanicoHomeView` en lugar del dashboard mandante.

### Requirement: Finanzas desacopladas
KPI, saldo, rendimiento y suscripción SHALL NOT appear as bloques principales en Hoy; SHALL estar en Menú → Dinero.
