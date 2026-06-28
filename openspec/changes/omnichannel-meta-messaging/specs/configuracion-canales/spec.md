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

#### Scenario: Conectar WhatsApp
- GIVEN canal sin configurar
- WHEN toca Conectar y completa Embedded Signup
- THEN estado muestra Conectado con identificador (teléfono)

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
