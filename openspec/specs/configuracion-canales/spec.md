# configuracion-canales Specification

## Purpose
Pantalla de configuración de canales Meta del proveedor (WhatsApp, Messenger, Instagram).

## Requirements

### Requirement: Acceso desde perfil
Proveedor SHALL acceder desde Perfil → Canales de mensajería.

#### Scenario: Entrada en perfil
- GIVEN proveedor mandante (no supervisor)
- WHEN abre Perfil
- THEN ve fila "Canales de mensajería" junto a Mercado Pago

### Requirement: Conectar canal
Patrón OAuth igual a Mercado Pago.

### Requirement: Validadores WhatsApp al conectar
La conexión de WhatsApp SHALL validar Facebook administrador y WhatsApp Business, con mensajes claros en web y nativo.

#### Scenario: Precheck antes de Facebook
- GIVEN el proveedor toca Conectar WhatsApp
- WHEN aún no abrió Facebook
- THEN ve un diálogo que exige Facebook administrador del taller y WhatsApp Business (no personal)
- AND puede cancelar o continuar

#### Scenario: Facebook personal o sin negocio
- GIVEN completa el login de Meta
- WHEN esa cuenta no administra un Business Manager
- THEN el estado del canal es error
- AND ve la alerta "Facebook incorrecto"

#### Scenario: Sin WhatsApp Business
- GIVEN entra con un Facebook de negocio
- WHEN no hay WhatsApp Business asociado
- THEN ve la alerta "Falta WhatsApp Business" indicando que un número personal no sirve


### Requirement: Toggle habilitar
Proveedor SHALL activar/desactivar recepción por canal.

#### Scenario: Deshabilitar WhatsApp
- GIVEN WhatsApp conectado
- WHEN apaga toggle
- THEN backend enabled=false y UI muestra "Pausado"

### Requirement: Desconectar
Proveedor SHALL desvincular cuenta con confirmación.

#### Scenario: Desconexión
- GIVEN canal conectado
- WHEN confirma Desconectar
- THEN estado vuelve a Sin configurar
