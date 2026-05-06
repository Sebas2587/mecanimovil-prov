# auth-login Specification

## Purpose
Flujo de autenticación en la app del proveedor: login, logout, registro y recuperación
de contraseña. El token JWT se almacena de forma segura y se refresca automáticamente.

## Requirements

### Requirement: Login del proveedor
El proveedor ingresa con email y password desde la pantalla de login.

#### Scenario: Login exitoso
- GIVEN un proveedor verificado con email y password válidos
- WHEN completa el formulario en app/(auth)/login.tsx y confirma
- THEN recibe access_token y refresh_token del backend
- AND es redirigido al dashboard principal (app/(tabs)/index)

#### Scenario: Login con credenciales incorrectas
- GIVEN email o password inválidos
- WHEN envía el formulario
- THEN se muestra un toast/alert de error con mensaje claro
- AND el formulario permanece editable sin hacer logout

#### Scenario: Proveedor no verificado intenta login
- GIVEN un proveedor con cuenta pendiente de verificación
- WHEN hace login con credenciales correctas
- THEN recibe un mensaje informativo explicando que debe esperar aprobación
- AND no accede al dashboard

### Requirement: Persistencia de sesión
La sesión persiste al cerrar y reabrir la app usando el refresh token.

#### Scenario: App reabierta con token válido
- GIVEN el proveedor cerró la app con sesión activa
- WHEN reabre la app
- THEN se restaura la sesión automáticamente sin solicitar login
- AND se redirige directo al dashboard

#### Scenario: Token expirado al reabrir app
- GIVEN el refresh token venció
- WHEN la app intenta restaurar sesión
- THEN redirige a la pantalla de login

### Requirement: Logout
El proveedor puede cerrar sesión desde el perfil.

#### Scenario: Logout exitoso
- GIVEN un proveedor con sesión activa
- WHEN toca "Cerrar sesión" en app/(tabs)/perfil.tsx
- THEN los tokens se eliminan del almacenamiento local
- AND se redirige a la pantalla de login
