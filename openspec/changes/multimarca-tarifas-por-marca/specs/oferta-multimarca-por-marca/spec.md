# oferta-multimarca-por-marca (proveedores)

## Purpose
UX institucional para que multimarca configure precio base y/o precios por marca sin flujo de especialista.

## Requirements

### REQ-PROV-MIS-MARCAS
`GET mis_marcas` SHALL devolver `{ es_multimarca, marcas }`; la app SHALL parsear ambos formatos (legacy array).

### REQ-PROV-CREAR-SERVICIO
Pantalla crear/editar servicio SHALL mostrar tabs «Precio base (todas las marcas)» y «Por marca» para multimarca, reutilizando tokens institucionales.

WHEN el proveedor edita una oferta de **una sola marca**, la pantalla SHALL bloquear la selección múltiple implícita y ofrecer:
- **Actualizar** solo esa marca;
- **Agregar tarifa para otra marca** (navegación a creación con servicio y marca precargados);
- **Mismo precio, varias marcas** (modo sincronizado explícito).

WHEN guarda con ≥2 marcas o agrega marcas nuevas en edición, SHALL mostrar confirmación indicando que el **mismo precio** se aplicará a la lista de marcas antes de persistir.

### REQ-PROV-ONBOARDING
Onboarding multimarca SHALL permitir catálogo inicial genérico y copy que indique configuración por marca en Mis servicios.

### REQ-PROV-MIS-SERVICIOS
Lista agrupada por servicio de catálogo + tipo SHALL mostrar, por cada oferta/marca configurada, una celda institucional con **marca identificada** (logo o «Precio base») y **precio al público** asociado. No SHALL mostrarse un monto agregado sin indicar la marca.

### REQ-PROV-MIS-SERVICIOS-RANGO
WHEN el mismo servicio tiene ≥2 precios por marcas distintas, Mis servicios SHALL listar una fila destacada por marca (no un rango ambiguo tipo `$40.000 – $58.000` sin contexto).

### REQ-PROV-RESUMEN-TARIFAS
WHEN el resumen recibe varias ofertas del mismo servicio (`ofertasCatalogo`), cada configuración por marca SHALL renderizarse en una **card editorial separada** con encabezado de marca, estado, tipo de servicio y desglose de precios propio.
