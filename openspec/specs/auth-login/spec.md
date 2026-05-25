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

### Requirement: Login con Google
El proveedor puede iniciar sesión o registrarse con Google (id_token) desde la pantalla de login.

#### Scenario: Login Google exitoso — proveedor existente
- GIVEN un usuario con perfil Taller o Mecánico a domicilio
- WHEN completa Google Sign-In en app/(auth)/login.tsx
- THEN el backend valida id_token contra GOOGLE_OAUTH_CLIENT_IDS
- AND devuelve { token, user } con tipo_proveedor si aplica
- AND la app navega según estadoProveedor (tabs u onboarding)

#### Scenario: Login Google — usuario nuevo
- GIVEN un email de Google no registrado en el backend
- WHEN completa Google Sign-In
- THEN se crea Usuario con es_mecanico=True y contraseña unusable
- AND NO se crea perfil Cliente
- AND se redirige a onboarding tipo-cuenta

#### Scenario: Login Google — es_mecanico sin perfil aún
- GIVEN un usuario con es_mecanico=True pero sin Taller/Mecánico
- WHEN inicia sesión con Google
- THEN recibe token válido
- AND onboarding continúa normalmente

#### Scenario: Cuenta solo cliente rechazada
- GIVEN un usuario registrado solo como cliente (es_mecanico=false, sin perfil proveedor)
- WHEN intenta Google Sign-In en app proveedores
- THEN el backend responde 403 con mensaje de usar app usuarios
- AND la app muestra alerta CLIENT_ACCOUNT

#### Scenario: Selector de cuentas Google (UX Canva)
- GIVEN cuentas Google usadas previamente en este dispositivo
- WHEN abre login
- THEN muestra paso "accounts" con lista y login rápido (login_hint)
- WHEN elige "Usar otra cuenta"
- THEN muestra paso "methods" con Google y correo
- WHEN elige correo
- THEN muestra formulario email/password (paso "email")

#### Scenario: Registro manual con prefill Google
- GIVEN flujo que redirige a registro con datos Google
- WHEN navega a app/(auth)/registro.tsx con params email, firstName, lastName
- THEN el formulario se prellena para completar registro manual
