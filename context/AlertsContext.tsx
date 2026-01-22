import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { obtenerEstadoCuenta } from '@/services/mercadoPagoProveedorService';
import serviceAreasApi from '@/services/serviceAreasApi';

export type TipoAlerta = 
  | 'mercado_pago_no_configurado'
  | 'zonas_cobertura_no_configuradas'
  | 'creditos_bajos'
  | 'pago_expirado';

export interface Alerta {
  id: string;
  tipo: TipoAlerta;
  titulo: string;
  mensaje: string;
  accion?: {
    texto: string;
    ruta: string;
  };
  fecha: Date;
  leida: boolean;
  prioridad: 'alta' | 'media' | 'baja';
}

interface AlertsContextType {
  alertas: Alerta[];
  alertasNoLeidas: number;
  agregarAlerta: (alerta: Omit<Alerta, 'id' | 'fecha' | 'leida'>) => void;
  marcarComoLeida: (id: string) => void;
  eliminarAlerta: (id: string) => void;
  verificarYGenerarAlertas: () => Promise<void>;
  limpiarAlertas: () => void;
}

const AlertsContext = createContext<AlertsContextType | undefined>(undefined);

export const AlertsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const { estadoProveedor, usuario } = useAuth();

  // Calcular alertas no leídas
  const alertasNoLeidas = alertas.filter(a => !a.leida).length;

  // Agregar nueva alerta
  const agregarAlerta = (alertaData: Omit<Alerta, 'id' | 'fecha' | 'leida'>) => {
    const nuevaAlerta: Alerta = {
      ...alertaData,
      id: `${alertaData.tipo}_${Date.now()}`,
      fecha: new Date(),
      leida: false,
    };

    setAlertas(prev => {
      // Evitar duplicados del mismo tipo
      const existe = prev.some(a => a.tipo === nuevaAlerta.tipo && !a.leida);
      if (existe) {
        return prev;
      }
      return [nuevaAlerta, ...prev];
    });
  };

  // Marcar alerta como leída
  const marcarComoLeida = (id: string) => {
    setAlertas(prev =>
      prev.map(alerta =>
        alerta.id === id ? { ...alerta, leida: true } : alerta
      )
    );
  };

  // Eliminar alerta
  const eliminarAlerta = (id: string) => {
    setAlertas(prev => prev.filter(alerta => alerta.id !== id));
  };

  // Limpiar todas las alertas
  const limpiarAlertas = () => {
    setAlertas([]);
  };

  // Eliminar alertas de configuración específicas
  const eliminarAlertasDeConfiguracion = (tipos: TipoAlerta[]) => {
    setAlertas(prev => prev.filter(alerta => !tipos.includes(alerta.tipo)));
  };

  // Verificar y generar alertas automáticamente
  const verificarYGenerarAlertas = async () => {
    if (!estadoProveedor || !usuario) {
      // Si no hay proveedor o usuario, limpiar todas las alertas de configuración
      eliminarAlertasDeConfiguracion(['mercado_pago_no_configurado', 'zonas_cobertura_no_configuradas']);
      return;
    }

    try {
      // Primero, eliminar alertas de configuración existentes para regenerarlas
      const alertasConfiguracion: TipoAlerta[] = [];
      let necesitaMercadoPago = false;
      let necesitaZonas = false;

      // Verificar cuenta de Mercado Pago
      try {
        const estadoMP = await obtenerEstadoCuenta();
        if (estadoMP.success && estadoMP.data) {
          const puedeRecibirPagos = estadoMP.data.puede_recibir_pagos;
          const estado = estadoMP.data.estado;

          if (!puedeRecibirPagos || estado !== 'conectada') {
            necesitaMercadoPago = true;
            alertasConfiguracion.push('mercado_pago_no_configurado');
          }
        } else {
          // Si no se puede obtener el estado, asumir que no está configurado
          necesitaMercadoPago = true;
          alertasConfiguracion.push('mercado_pago_no_configurado');
        }
      } catch (error) {
        console.error('Error verificando Mercado Pago:', error);
        // En caso de error, asumir que no está configurado
        necesitaMercadoPago = true;
        alertasConfiguracion.push('mercado_pago_no_configurado');
      }

      // Verificar zonas de cobertura (solo para mecánicos a domicilio)
      if (estadoProveedor.tipo_proveedor === 'mecanico') {
        try {
          // Verificar que serviceAreasApi esté disponible
          if (!serviceAreasApi || typeof serviceAreasApi.getServiceAreas !== 'function') {
            console.warn('⚠️ serviceAreasApi no está disponible');
            necesitaZonas = true;
            alertasConfiguracion.push('zonas_cobertura_no_configuradas');
          } else {
            const zonas = await serviceAreasApi.getServiceAreas();
            
            // Validar que zonas sea un array
            if (!Array.isArray(zonas)) {
              console.warn('⚠️ Respuesta de zonas no es un array:', typeof zonas);
              necesitaZonas = true;
              alertasConfiguracion.push('zonas_cobertura_no_configuradas');
            } else {
              const zonasActivas = zonas.filter(z => z && z.is_active === true);

              if (zonasActivas.length === 0) {
                necesitaZonas = true;
                alertasConfiguracion.push('zonas_cobertura_no_configuradas');
              }
            }
          }
        } catch (error: any) {
          // Si es un error 404, significa que no hay zonas configuradas
          if (error.response?.status === 404 || error.message?.includes('404')) {
            console.log('ℹ️ No hay zonas de cobertura configuradas (404)');
            necesitaZonas = true;
            alertasConfiguracion.push('zonas_cobertura_no_configuradas');
          } else {
            // Solo loguear otros errores, no mostrar alerta para errores de red o servidor
            console.error('Error verificando zonas de cobertura:', error);
          }
        }
      }

      // Eliminar todas las alertas de configuración existentes
      eliminarAlertasDeConfiguracion(['mercado_pago_no_configurado', 'zonas_cobertura_no_configuradas']);

      // Agregar solo las alertas que realmente se necesitan
      if (necesitaMercadoPago) {
        agregarAlerta({
          tipo: 'mercado_pago_no_configurado',
          titulo: 'Cuenta de Mercado Pago no configurada',
          mensaje: 'Para realizar ofertas a solicitudes, necesitas conectar tu cuenta de Mercado Pago. Configúrala ahora para recibir pagos directos de los clientes.',
          accion: {
            texto: 'Configurar Mercado Pago',
            ruta: '/(tabs)/configuracion-mercadopago',
          },
          prioridad: 'alta',
        });
      }

      if (necesitaZonas) {
        agregarAlerta({
          tipo: 'zonas_cobertura_no_configuradas',
          titulo: 'Zonas de cobertura no configuradas',
          mensaje: 'Como mecánico a domicilio, necesitas definir al menos una zona de cobertura activa para estar disponible para los clientes. Configura tus zonas de servicio ahora.',
          accion: {
            texto: 'Configurar Zonas',
            ruta: '/(tabs)/zonas-servicio',
          },
          prioridad: 'alta',
        });
      }
    } catch (error) {
      console.error('Error verificando alertas:', error);
    }
  };

  // Verificar alertas cuando cambia el estado del proveedor
  useEffect(() => {
    if (estadoProveedor && usuario) {
      verificarYGenerarAlertas();
    }
  }, [estadoProveedor, usuario]);

  return (
    <AlertsContext.Provider
      value={{
        alertas,
        alertasNoLeidas,
        agregarAlerta,
        marcarComoLeida,
        eliminarAlerta,
        verificarYGenerarAlertas,
        limpiarAlertas,
      }}
    >
      {children}
    </AlertsContext.Provider>
  );
};

export const useAlerts = (): AlertsContextType => {
  const context = useContext(AlertsContext);
  if (!context) {
    throw new Error('useAlerts debe usarse dentro de AlertsProvider');
  }
  return context;
};

