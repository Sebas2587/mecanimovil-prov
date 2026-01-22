# Debug del Problema del Checklist

## Problema
Cuando el técnico inicia el checklist, la instancia se pierde y aparece como `undefined`, causando errores.

## Solución Implementada

### 1. Validaciones Mejoradas
- Se agregaron validaciones más robustas en `useChecklist` hook
- Se mejoró el manejo de errores en `ChecklistOfflineManager`
- Se agregaron logs detallados para tracking del problema

### 2. Monitoreo de Estado
- Se agregó un efecto de monitoreo en el hook para detectar cuando la instancia se vuelve undefined
- Se agregaron logs de debug en `startInstance` y `saveResponse`

### 3. Funciones de Debug
Para debugging, se pueden usar estas funciones en la consola:

```javascript
// Debug estado completo del checklist
await checklistService.debugChecklistStatus(ordenId);

// Limpiar datos offline corruptos
await checklistService.clearOfflineData();
```

## Pasos para Resolver el Problema

1. **Verificar logs**: Buscar en la consola:
   - `🚀 startInstance llamado para ID:`
   - `✅ Respuesta del backend startInstance:`
   - `💾 saveChecklistInstance llamado con:`

2. **Si el problema persiste**:
   - Ejecutar `await checklistService.clearOfflineData()`
   - Reiniciar la app
   - Intentar nuevamente

3. **Verificar backend**: Asegurar que el endpoint `/checklists/instances/{id}/start/` devuelve:
   ```json
   {
     "id": number,
     "estado": "EN_PROGRESO",
     "orden": number,
     // ... otros campos
   }
   ```

## Logs a Monitorear

### Logs Normales (funcionando)
```
🚀 startInstance llamado para ID: 4
✅ Respuesta del backend startInstance: {id: 4, estado: "EN_PROGRESO", orden: 62}
💾 saveChecklistInstance llamado con: {instanceId: 4, instanceEstado: "EN_PROGRESO"}
✅ Instancia válida, procediendo a guardar: {id: 4, estado: "EN_PROGRESO", orden: 62}
```

### Logs de Error (problema)
```
❌ saveChecklistInstance: instance.id es inválido: undefined
❌ ALERTA CRÍTICA: La instancia existe pero no tiene ID válido
```

## Contacto
Si el problema persiste después de estos pasos, contactar al equipo de desarrollo con los logs completos. 