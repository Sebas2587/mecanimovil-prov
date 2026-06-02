# oferta-multimarca-por-marca (proveedores)

## Purpose
UX institucional para que multimarca configure precio base y/o precios por marca sin flujo de especialista.

## Requirements

### REQ-PROV-MIS-MARCAS
`GET mis_marcas` SHALL devolver `{ es_multimarca, marcas }`; la app SHALL parsear ambos formatos (legacy array).

### REQ-PROV-CREAR-SERVICIO
Pantalla crear/editar servicio SHALL mostrar tabs «Precio base (todas las marcas)» y «Por marca» para multimarca, reutilizando tokens institucionales.

### REQ-PROV-ONBOARDING
Onboarding multimarca SHALL permitir catálogo inicial genérico y copy que indique configuración por marca en Mis servicios.

### REQ-PROV-MIS-SERVICIOS
Lista agrupada por servicio de catálogo + tipo SHALL mostrar chips por marca o «Precio base» cuando `marca_vehiculo_seleccionada` es null.

### REQ-PROV-MIS-SERVICIOS-RANGO
WHEN el mismo servicio de catálogo tiene ≥2 precios publicados distintos, la fila en Mis servicios SHALL mostrar el rango (ej. `$40.000 – $58.000`); si todos coinciden, un solo monto.
