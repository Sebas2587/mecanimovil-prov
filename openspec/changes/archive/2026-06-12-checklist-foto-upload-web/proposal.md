# Propuesta: Subida de fotos de checklist funcional en web

## Why
En la app proveedor sobre web, las fotos del checklist no llegaban al backend. El log de Render mostraba `FILES recibidos: []` y error `imagen: La información enviada no era un archivo`. Causa: en web `FormData.append('imagen', { uri, type, name })` (patrón solo válido en React Native nativo) se serializa como `[object Object]`, por lo que el archivo nunca se envía y el cliente nunca ve las fotos. Además, las fotos fallidas quedaban "en blanco" y no se podían borrar porque el delete abortaba si el backend respondía error.

## What Changes
- `useChecklist.uploadPhoto`: en web convertir el URI (`blob:`/`data:`/`http`) a `Blob`/`File` real antes de adjuntar al `FormData`. En nativo se mantiene el patrón `{ uri, type, name }`.
- `ChecklistItemRenderer.handleDeletePhoto`: borrado tolerante — si el backend falla (p. ej. 404), igual se quita localmente para no dejar fotos atascadas en blanco.

## Non-goals
- No se cambia el almacenamiento R2 ni el serializer del backend.
- No se cambia el flujo de subida en nativo (ya funcionaba).
