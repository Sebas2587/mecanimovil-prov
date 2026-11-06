## ADDED Requirements

### Requirement: Cliente y dirección tipados en la ficha
La ficha de la orden SHALL leer el cliente completo cuando el objeto trae nombre, y el nombre y teléfono ofuscados cuando el cliente está protegido. La dirección MUST salir de `ubicacion_servicio_segura`. Un mensaje de éxito MUST leerse solo si la respuesta trae datos.

#### Scenario: Cliente protegido
- **WHEN** el cliente no trae nombre completo
- **THEN** la ficha muestra el nombre y el teléfono ofuscados y no exige email

#### Scenario: Dirección de domicilio
- **WHEN** la orden es a domicilio y trae dirección segura
- **THEN** la ficha muestra esa dirección y el mapa usa el mismo texto
