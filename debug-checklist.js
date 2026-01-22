// Debug script para el problema del checklist
// Ejecutar en la consola de React Native Debugger o Metro

// 1. Debug estado completo de checklist para una orden específica
const debugChecklist = async (ordenId) => {
  console.log('🔍 Iniciando debug para orden:', ordenId);
  
  try {
    // Acceder al servicio desde el contexto global (si está disponible)
    if (typeof checklistService !== 'undefined') {
      await checklistService.debugChecklistStatus(ordenId);
    } else {
      console.log('⚠️ checklistService no está disponible en el contexto global');
      console.log('📝 Ejecutar desde un componente que importe checklistService');
    }
  } catch (error) {
    console.error('❌ Error en debug:', error);
  }
};

// 2. Limpiar datos offline corruptos
const clearOfflineData = async () => {
  console.log('🧹 Limpiando datos offline...');
  
  try {
    if (typeof checklistService !== 'undefined') {
      await checklistService.clearOfflineData();
      console.log('✅ Datos limpiados. Reinicia la app.');
    } else {
      console.log('⚠️ checklistService no está disponible');
    }
  } catch (error) {
    console.error('❌ Error limpiando datos:', error);
  }
};

// 3. Verificar AsyncStorage directamente
const checkAsyncStorage = async () => {
  console.log('📱 Verificando AsyncStorage...');
  
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    
    const instances = await AsyncStorage.getItem('checklist_instances');
    const responses = await AsyncStorage.getItem('checklist_responses');
    
    console.log('💾 Instancias guardadas:', instances ? JSON.parse(instances).length : 0);
    console.log('💬 Respuestas guardadas:', responses ? JSON.parse(responses).length : 0);
    
    if (instances) {
      const parsedInstances = JSON.parse(instances);
      parsedInstances.forEach(instance => {
        console.log(`📋 Instancia ${instance.id}: orden ${instance.orden}, estado ${instance.estado}`);
      });
    }
  } catch (error) {
    console.error('❌ Error verificando AsyncStorage:', error);
  }
};

// 4. Función para copiar y pegar en la consola
const copyPasteDebug = `
// === COMANDOS PARA COPIAR Y PEGAR ===

// Debug checklist para orden específica (cambiar 62 por tu orden ID)
const ordenId = 62;
console.log('🔍 Debug orden:', ordenId);

// Verificar AsyncStorage
(async () => {
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  const instances = await AsyncStorage.getItem('checklist_instances');
  console.log('💾 Instancias:', instances ? JSON.parse(instances) : 'Ninguna');
})();

// Limpiar AsyncStorage de checklist
(async () => {
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  await AsyncStorage.removeItem('checklist_instances');
  await AsyncStorage.removeItem('checklist_responses');
  console.log('✅ AsyncStorage limpiado');
})();
`;

console.log('📋 Debug del Checklist - Funciones disponibles:');
console.log('- debugChecklist(ordenId)');
console.log('- clearOfflineData()');
console.log('- checkAsyncStorage()');
console.log('\n📝 Para comandos copy-paste:');
console.log(copyPasteDebug);

// Exportar funciones para uso
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    debugChecklist,
    clearOfflineData,
    checkAsyncStorage
  };
} 