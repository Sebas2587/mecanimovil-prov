# dashboard-home Specification

## Purpose
Pantalla **Hoy** del proveedor (`app/(tabs)/index.tsx`). Dashboard operativo estilo Airbnb Hosts: alertas por prioridad, rendimiento, finanzas, oportunidades y atajos del taller.

## Requirements

### Requirement: Tab Hoy (Today)
The home tab SHALL be labeled "Hoy" in the tab bar and organize content in priority blocks: alerts → KPI/finanzas → oportunidades (radar) → herramientas del taller.

#### Scenario: Dashboard con actividad
- GIVEN un proveedor verificado con solicitudes y órdenes
- WHEN abre la pestaña Hoy
- THEN ve alertas urgentes, widgets de rendimiento/finanzas y solicitudes del radar
- AND los datos se cargan desde el backend en menos de 2 segundos

#### Scenario: Dashboard vacío
- GIVEN un proveedor nuevo sin órdenes ni solicitudes
- WHEN abre Hoy
- THEN ve estados vacíos con CTAs claros

### Requirement: Accesos rápidos
Atajos del taller SHALL NOT duplicate routes available as primary tabs (Agenda lives in tab Agenda).

#### Scenario: Acceso a solicitudes
- GIVEN solicitudes nuevas en el radar
- WHEN toca ver todas
- THEN navega a solicitudes disponibles

### Requirement: Seguimiento comercial unificado
La pestaña Hoy SHALL incluir bloque "Seguimiento comercial" con alertas de cotizaciones sin respuesta >24h y enlace a `pipeline-seguimiento`.

#### Scenario: Alerta 24h
- GIVEN cotizaciones en estado `cotizacion_enviada` hace más de 24h
- WHEN abre Hoy
- THEN ve banner con conteo y puede abrir la bandeja completa

### Requirement: Vista mecánico
WHEN el usuario es mecánico de equipo (`esMecanicoEquipo`), THEN Hoy SHALL renderizar `MecanicoHomeView` en lugar del dashboard mandante.

