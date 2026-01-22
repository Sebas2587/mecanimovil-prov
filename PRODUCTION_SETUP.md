# Configuración para Producción - App de Proveedores

## 📋 Resumen de Cambios Implementados

### ✅ Problemas Solucionados:
1. **WebSocket no se conectaba** - Ahora usa la IP correcta del servidor
2. **Configuración de red inconsistente** - API y WebSocket usan la misma configuración
3. **Heartbeats no funcionaban** - Mejorado manejo de errores y reconexión
4. **Detección de IP fallaba** - Prioriza IP específica del servidor

### 🔧 Mejoras Implementadas:
- Configuración automática robusta
- Manejo de errores mejorado
- Sistema de configuración para producción
- Logging mejorado
- Reconexión automática

## 🚀 Cambio a Producción

### Opción 1: Variables de Entorno (Recomendado)

1. **Configurar variables de entorno:**
```bash
# En tu archivo .env o configuración de Expo
EXPO_PUBLIC_ENVIRONMENT=production
EXPO_PUBLIC_PRODUCTION_API_URL=https://api.mecanimovil.com
EXPO_PUBLIC_PRODUCTION_WS_URL=wss://api.mecanimovil.com
```

2. **Reconstruir la app:**
```bash
npx expo build:android
# o
npx expo build:ios
```

### Opción 2: Modificar Configuración Directamente

1. **Editar `config/production.ts`:**
```typescript
export const PRODUCTION_CONFIG = {
  API_BASE_URL: 'https://api.mecanimovil.com',
  WS_BASE_URL: 'wss://api.mecanimovil.com',
  // ... resto de configuración
};
```

2. **Reconstruir la app**

## 🔍 Verificación

### Script de Verificación:
```bash
# Ejecutar script de verificación
node test-production-readiness.js
```

### Verificaciones Manuales:
1. ✅ API se conecta correctamente
2. ✅ WebSocket se conecta y mantiene conexión
3. ✅ Heartbeats funcionan
4. ✅ Reconexión automática funciona
5. ✅ No usa localhost en producción

## 📊 Configuración Actual

### Desarrollo:
- **API URL:** `http://192.168.100.40:8000`
- **WebSocket URL:** `ws://192.168.100.40:8000`
- **Detección automática:** Activada
- **Logs de debug:** Activados

### Producción:
- **API URL:** `https://api.mecanimovil.com`
- **WebSocket URL:** `wss://api.mecanimovil.com`
- **Detección automática:** Desactivada
- **Logs de debug:** Desactivados

## 🛠️ Troubleshooting

### Problema: WebSocket no se conecta
**Solución:** Verificar que la URL del WebSocket use `wss://` en producción

### Problema: API no responde
**Solución:** Verificar que la URL de la API use `https://` en producción

### Problema: Heartbeats fallan
**Solución:** Verificar timeouts y configuración de reconexión

## 📝 Notas Importantes

1. **Seguridad:** En producción, todas las conexiones deben usar HTTPS/WSS
2. **Performance:** Los logs de debug están desactivados en producción
3. **Confiabilidad:** El sistema de reconexión automática está activado
4. **Monitoreo:** Los logs de red están activados para monitoreo

## 🔄 Rollback

Si necesitas volver a desarrollo:
1. Cambiar `EXPO_PUBLIC_ENVIRONMENT` a `development`
2. O eliminar las variables de entorno de producción
3. Reconstruir la app

## 📞 Soporte

Para problemas en producción:
1. Revisar logs de la app
2. Verificar conectividad de red
3. Probar con el script de verificación
4. Contactar al equipo de desarrollo 