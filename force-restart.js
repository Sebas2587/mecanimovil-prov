import { WebSocketService } from './services/websocketService';

async function forceRestart() {
  console.log('🔄 FORZANDO REINICIO DEL WEBSOCKET...');
  
  try {
    // Crear nueva instancia del WebSocket
    const wsService = new WebSocketService();
    
    // Conectar
    await wsService.connect();
    
    console.log('✅ WebSocket iniciado correctamente');
    console.log('📝 Verifica en los logs:');
    console.log('   - "INICIANDO CONEXIÓN WEBSOCKET - VERSIÓN CORREGIDA"');
    console.log('   - "CONECTANDO A WEBSOCKET CON IP FORZADA"');
    console.log('   - "USANDO IP CORRECTA: 192.168.100.40"');
    console.log('   - "INICIANDO HEARTBEAT - VERSIÓN CORREGIDA"');
    console.log('   - "ENVIANDO HEARTBEAT"');
    console.log('   - "ESTADO DEL PROVEEDOR ACTUALIZADO EN BACKEND"');
    
  } catch (error) {
    console.error('❌ Error en force restart:', error);
  }
}

// Ejecutar reinicio forzado
forceRestart(); 