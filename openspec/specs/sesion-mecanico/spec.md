# sesion-mecanico Specification

## Purpose
Sesión reducida para miembros del equipo con rol `mecanico`: home propio, tabs limitados y órdenes asignadas.

## Requirements

### Requirement: Tabs reducidos
Un mecánico de equipo SHALL ver solo Inicio y Configuración en la barra de tabs.

#### Scenario: Login como mecánico
- GIVEN credenciales de `MiembroTaller` con rol mecánico
- WHEN inicia sesión
- THEN no ve tabs Órdenes, Chats ni Agenda global del taller

### Requirement: Home de mecánico
`MecanicoHomeView` SHALL listar órdenes/citas asignadas al `miembro_id` del usuario.

#### Scenario: Orden asignada por push
- GIVEN notificación `orden_asignada_mecanico`
- WHEN el mecánico abre la push
- THEN navega al detalle de la orden asignada
