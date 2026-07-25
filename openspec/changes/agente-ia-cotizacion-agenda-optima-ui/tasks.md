# Tasks — agente-ia-cotizacion-agenda-optima-ui

## Bandeja
- [x] Mostrar badge verde "Lista para enviar" cuando `listo_para_enviar=true` y `estado_raw=borrador`
- [x] Mostrar chips de `pendientes_revision` cuando `listo_para_enviar=false`
- [x] Respetar orden del API (listas primero)

## Cotizar con IA
- [x] Leer `listo_para_enviar` / `pendientes_revision` del serializer
- [x] Banner checklist arriba del editor (informativo; no deshabilitar envío)

## Verificación
- [ ] Push a borrador listo abre chat/cotizar con banner verde
- [ ] Borrador con pendientes muestra lista en bandeja y editor
