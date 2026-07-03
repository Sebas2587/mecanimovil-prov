# cotizacion-ia-chat-canal-ui

## Why

El mandante necesita generar cotizaciones con IA desde el modal de agendamiento/chat omnicanal, editar precios y enviarlas al cliente.

## What Changes

- `services/cotizacionCanalService.ts`
- `components/chats/CotizacionIaEditor.tsx`
- `components/chats/CotizacionCanalBubble.tsx`
- Integración en `AgendarDesdeCanalModal.tsx` y `chat-omnicanal.tsx`
- `app/cotizaciones-plantillas.tsx`

## Requirements

- REQ-UI-COT-GENERAR: botón generar IA con loading y fallback manual.
- REQ-UI-COT-EDITAR: repuestos y mano de obra editables con total calculado.
- REQ-UI-COT-ENVIAR: enviar cotización al chat.
- REQ-UI-COT-BUBBLE: bubble especial con estado en chat.
- REQ-UI-COT-AGENDAR: CTA post-aceptación con prefill.
