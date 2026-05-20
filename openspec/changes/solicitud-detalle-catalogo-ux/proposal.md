# Propuesta: UX detalle solicitud — asignación catálogo

## Why
El pie fijo de `solicitud-detalle/[id]` concentraba demasiadas acciones (Rechazar, Otra fecha, Chat, Aceptar) más un banner largo, duplicaba el acceso al chat y saturaba la zona primaria de decisión en pantallas estrechas.

## What Changes
- **Pie fijo (sticky):** solo decisión binaria — `Rechazar` (outline) + `Aceptar asignación` (primary).
- **Chat:** un único CTA en la tarjeta «Asignación desde catálogo» / «Mi oferta» (scroll), nunca en el pie.
- **Proponer otra fecha:** enlace contextual bajo la sección «Fecha y hora preferida», no en el pie.
- **Contexto:** texto breve en la tarjeta de oferta; sin banner en el sticky.
- **Estado `en_chat`:** sin pie de decisión; chat y mensaje de espera solo en contenido scrolleable.

## Pantallas / rutas
- `app/solicitud-detalle/[id].tsx`

## Design tokens
- `COLORS.institutional` (primary, semanticDown, canvas, body, muted)
- `SPACING`, `TYPOGRAPHY`, `BORDERS`, `SHADOWS.editorial`
- Iconos Lucide vía `InstitutionalIcon`

## Non-goals
- No cambiar endpoints ni reglas de créditos/adjudicación en backend.
- No rediseñar flujo marketplace «Crear oferta» (solicitudes sin catálogo).
