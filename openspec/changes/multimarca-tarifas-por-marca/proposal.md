# Change: multimarca-tarifas-por-marca

## Why
Talleres multimarca necesitan precios distintos por marca sin duplicar servicios en catálogo.

## What
- Backend: ofertas por marca en `OfertaServicio` + endpoints `mis_marcas`
- Frontend: tabs precio base / por marca en crear-editar servicio
- Mis servicios: una fila por marca con precio publicado
- Spec delta en `oferta-multimarca-por-marca`

## Estado
Implementación parcial en app de proveedores y backend de servicios; pendiente QA en flujos de edición masiva «mismo precio varias marcas».
