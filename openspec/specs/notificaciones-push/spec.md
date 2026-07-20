# notificaciones-push Specification

## Purpose
Push unificado para proveedores (Expo + web push): registro de token, routing por tipo y refresh de datos en foreground.

## Requirements

### Requirement: Registro de token
La app SHALL registrar `PushToken` al iniciar sesión y refrescarlo cuando cambie.

#### Scenario: Primer login en dispositivo
- GIVEN un proveedor autenticado
- WHEN concede permisos de notificación
- THEN el backend almacena el token asociado al usuario

### Requirement: Navegación por tipo
`navigateByPushNotification` SHALL enrutar según `tipo`/`data` (solicitud, chat, orden, créditos, etc.).

#### Scenario: Push de nueva solicitud
- GIVEN push con tipo solicitud marketplace
- WHEN el usuario toca la notificación
- THEN abre `solicitud-detalle/{id}` o listado correspondiente

### Requirement: Web push proveedor
En web, el change `web-push-proveedor` SHALL usar service worker y mismos tipos de evento que mobile cuando esté habilitado.
