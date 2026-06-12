## ADDED Requirements

### Requirement: Subida de fotos de checklist compatible con web
La app proveedor SHALL enviar las fotos de evidencia del checklist como archivo binario real tanto en nativo como en web, de modo que el backend reciba el archivo y el cliente pueda visualizar las imágenes.

#### Scenario: Subir foto desde la web
- GIVEN un proveedor usando la app en navegador web
- AND captura o selecciona una foto para un ítem PHOTO del checklist
- WHEN la app envía la foto al backend
- THEN el backend recibe el archivo en `FILES` (no vacío)
- AND la foto queda persistida con `imagen_url` accesible para el cliente

#### Scenario: Eliminar foto que falló en el servidor
- GIVEN una foto mostrada que no tiene registro válido en el backend
- WHEN el proveedor pulsa eliminar
- THEN la foto se quita de la lista local aunque el backend responda error
