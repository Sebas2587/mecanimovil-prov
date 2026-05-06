# perfil-proveedor Specification

## Purpose
Pantalla de perfil del proveedor (app/(tabs)/perfil.tsx). Permite editar datos
personales, foto, información del negocio, y acceder a configuraciones de la cuenta.

## Requirements

### Requirement: Ver y editar perfil
El proveedor puede ver y modificar su información profesional.

#### Scenario: Perfil cargado correctamente
- GIVEN un proveedor autenticado
- CUANDO abre la pestaña Perfil
- THEN ve su foto, nombre, especialidades, estado de verificación y datos de contacto

#### Scenario: Editar datos del perfil
- GIVEN el proveedor en su pantalla de perfil
- CUANDO edita un campo y confirma
- THEN los datos se guardan en el backend
- AND se muestra confirmación visual (toast o estado del botón)

### Requirement: Foto de perfil
El proveedor puede cambiar su foto desde la cámara o galería.

#### Scenario: Cambiar foto desde galería
- GIVEN el proveedor en su perfil
- CUANDO toca la foto y selecciona "Galería"
- THEN el picker de imágenes se abre
- AND al seleccionar, la imagen se sube a Cloudinary y se actualiza en el perfil

### Requirement: Estado de verificación visible
El proveedor ve claramente su estado de verificación en la plataforma.

#### Scenario: Estado pendiente de verificación
- GIVEN un proveedor con documentos en revisión
- CUANDO abre el perfil
- THEN ve un banner "Cuenta en revisión — te notificaremos cuando sea aprobada"

#### Scenario: Estado verificado
- GIVEN un proveedor verificado
- CUANDO abre el perfil
- THEN ve un badge/sello de "Proveedor Verificado"

### Requirement: Accesos a configuración desde perfil
El perfil incluye links a configuraciones importantes.

#### Scenario: Acceso a configurar MercadoPago
- GIVEN el proveedor en su perfil
- CUANDO toca "Configurar MercadoPago"
- THEN navega a app/configuracion-mercadopago.tsx
