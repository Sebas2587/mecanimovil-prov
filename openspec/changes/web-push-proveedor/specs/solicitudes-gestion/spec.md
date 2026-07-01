# solicitudes-gestion — delta web-push-proveedor

## ADDED Requirements

### Requirement: Web Push al publicarse solicitud compatible
Además de Expo nativo, la versión web SHALL recibir la misma alerta vía Web Push.

#### Scenario: Web push nueva solicitud
- GIVEN proveedor verificado con suscripción Web Push activa (`app_origen=proveedor`)
- WHEN un cliente publica solicitud compatible
- THEN recibe notificación «Nueva solicitud disponible» (tipo `nueva_solicitud`)
- AND al tocar abre `solicitud-detalle/{id}`

### Requirement: Web Push solicitud por vencer
El proveedor SHALL recibir recordatorio antes de que expire una solicitud abierta o pendiente de confirmación catálogo.

#### Scenario: Recordatorio vencimiento
- GIVEN solicitud compatible sin oferta del proveedor y `fecha_expiracion` en ventana de alerta
- WHEN corre tarea Celery `recordar_solicitudes_por_vencer_proveedor`
- THEN proveedor recibe push `solicitud_por_vencer` con `solicitud_id` y `minutos_restantes`
