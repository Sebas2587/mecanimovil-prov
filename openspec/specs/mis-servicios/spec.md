# mis-servicios Specification

## Purpose
Catálogo de servicios del proveedor: crear/editar ofertas, precios multimarca y publicación al marketplace.

## Requirements

### Requirement: Listado agrupado por servicio
Mis servicios SHALL agrupar ofertas por servicio de catálogo mostrando marca y precio al público por fila.

#### Scenario: Proveedor multimarca
- GIVEN un taller con dos marcas configuradas
- WHEN abre Mis servicios
- THEN ve una card por marca con precio publicado, no un rango ambiguo

### Requirement: Creación con verificación de créditos
Crear servicio/oferta SHALL respetar reglas de créditos y Mercado Pago conectado cuando aplique cobro en plataforma.

#### Scenario: Publicar servicio nuevo
- GIVEN MP conectado y créditos suficientes
- WHEN guarda un servicio en catálogo
- THEN queda disponible para solicitudes compatibles con marcas atendidas
