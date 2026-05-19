# Propuesta: Confirmación solicitud catálogo (app proveedores)

## Why
Con ofertas precargadas desde catálogo, el proveedor no debe usar «Crear oferta» para solicitudes primarias.

## What Changes
- Detalle solicitud: confirmar / rechazar / proponer fecha cuando `origen=catalogo`.
- Ocultar CTA crear-oferta primaria bajo flag.
- Mantener ofertas secundarias sin cambios.

## Non-goals
- No alterar consumo de créditos fuera del flujo documentado en backend.
