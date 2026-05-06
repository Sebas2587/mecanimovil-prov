# dashboard-home Specification

## Purpose
Pantalla principal del proveedor (app/(tabs)/index.tsx). Muestra resumen del estado
operativo: solicitudes pendientes, órdenes activas, alertas y accesos rápidos.

## Requirements

### Requirement: Resumen de actividad del proveedor
El dashboard muestra los indicadores más importantes al abrir la app.

#### Scenario: Dashboard con actividad
- GIVEN un proveedor verificado con solicitudes y órdenes
- WHEN abre la app en la pestaña Home
- THEN ve: número de solicitudes pendientes, órdenes activas, ingresos del día
- AND los datos se cargan desde el backend en menos de 2 segundos

#### Scenario: Dashboard vacío (sin actividad)
- GIVEN un proveedor nuevo sin órdenes ni solicitudes
- WHEN abre el dashboard
- THEN ve un estado vacío con mensaje motivacional y CTA para completar su perfil

#### Scenario: Error de red al cargar
- GIVEN el proveedor sin conexión o backend no disponible
- WHEN el dashboard intenta cargar datos
- THEN muestra un estado de error con botón "Reintentar"
- AND los datos previos en caché se muestran si existen

### Requirement: Accesos rápidos
El dashboard incluye accesos directos a las acciones más frecuentes.

#### Scenario: Acceso rápido a solicitudes pendientes
- GIVEN solicitudes nuevas disponibles para el proveedor
- WHEN toca el card de solicitudes
- THEN navega a la lista de solicitudes pendientes

### Requirement: Modo activo/inactivo del proveedor
El proveedor puede activarse o desactivarse para recibir solicitudes.

#### Scenario: Proveedor activa su disponibilidad
- GIVEN el proveedor está inactivo
- WHEN toca el toggle de disponibilidad en el dashboard
- THEN su estado cambia a activo en el backend
- AND empieza a recibir notificaciones de nuevas solicitudes
