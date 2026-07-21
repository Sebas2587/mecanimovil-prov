import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { onboardingAPI, tallerAPI, mecanicoAPI, documentosAPI, especialidadesAPI, authAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import OnboardingHeader from '@/components/OnboardingHeader';
import {
  OnboardingScreenLayout,
  OnboardingPrimaryButton,
  OnboardingNotice,
} from '@/components/onboarding';
import { Buffer } from 'buffer';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { COLORS, withOpacity } from '@/app/design-system/tokens';
import { Card } from '@/app/design-system/components';
import { onboardingStyles } from '@/app/design-system/styles/onboarding';
import { showAlert, showAlertButtons } from '@/utils/platformAlert';

const I = COLORS.institutional;

export default function FinalizarOnboardingScreen() {
  const { tipo, modalidad_atencion, especialidades, marcas, documentos, ...otherParams } = useLocalSearchParams();
  const router = useRouter();
  const { usuario, refrescarEstadoProveedor } = useAuth();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [datosCompletos, setDatosCompletos] = useState<any>(null);
  const [progresoSubida, setProgresoSubida] = useState<string>('');
  
  // UseRef para evitar re-procesamiento innecesario
  const dataProcessed = useRef(false);

  useEffect(() => {
    // Solo procesar una vez
    if (dataProcessed.current) return;
    
    console.log('Procesando datos del onboarding...');
    
    // Consolidar todos los datos del onboarding
    let especialidadesParsed = [];
    let marcasParsed = [];
    let documentosParsed = {};
    
    // Parseo seguro de especialidades
    if (especialidades) {
      try {
        especialidadesParsed = JSON.parse(especialidades as string);
        console.log('Especialidades parseadas:', especialidadesParsed.length);
      } catch (error) {
        console.error('Error parseando especialidades:', error);
        especialidadesParsed = [];
      }
    }
    
    // Parseo seguro de marcas
    if (marcas) {
      try {
        marcasParsed = JSON.parse(marcas as string);
        console.log('Marcas parseadas:', marcasParsed.length);
      } catch (error) {
        console.error('Error parseando marcas:', error);
        marcasParsed = [];
      }
    }
    
    // Parseo MÁS seguro de documentos con múltiples intentos
    if (documentos) {
      try {
        // Intentar decodificar desde base64 primero
        const documentosDecoded = Buffer.from(documentos as string, 'base64').toString('utf-8');
        documentosParsed = JSON.parse(documentosDecoded);
        console.log('Documentos parseados exitosamente desde base64:', Object.keys(documentosParsed).length);
      } catch (error) {
        console.error('Error parseando documentos desde base64:', error);
        
        // Segundo intento: decodificar URL
        try {
          const documentosDecoded = decodeURIComponent(documentos as string);
          documentosParsed = JSON.parse(documentosDecoded);
          console.log('Documentos parseados (URL decoded):', Object.keys(documentosParsed).length);
        } catch (error2) {
          console.error('Error parseando documentos (URL decoded):', error2);
          
          // Tercer intento: JSON directo
          try {
            documentosParsed = JSON.parse(documentos as string);
            console.log('Documentos parseados (JSON directo):', Object.keys(documentosParsed).length);
          } catch (error3) {
            console.error('Error parseando documentos (JSON directo):', error3);
            
            // Cuarto intento: limpiar caracteres problemáticos
            try {
              let documentosLimpio = (documentos as string)
                .replace(/[\u0000-\u001f\u007f-\u009f]/g, '') // Eliminar caracteres de control
                .replace(/,\s*}/g, '}') // Eliminar comas finales
                .replace(/,\s*]/g, ']'); // Eliminar comas finales en arrays
              
              documentosParsed = JSON.parse(documentosLimpio);
              console.log('Documentos parseados (limpio):', Object.keys(documentosParsed).length);
            } catch (error4) {
              console.error('Error parseando documentos (todos los intentos fallaron):', error4);
              console.error('JSON original longitud:', (documentos as string).length);
              console.error('JSON muestra (primeros 200 chars):', (documentos as string).substring(0, 200));
              documentosParsed = {};
              
              // CRÍTICO: Mostrar alerta al usuario
              showAlert(
                'Error de Documentos',
                'Hubo un problema cargando tus documentos. Por favor, regresa a la pantalla anterior y vuelve a seleccionar tus documentos.',
              );
            }
          }
        }
      }
    }
    
    // Crear objeto de datos estable
    const datos = {
      tipo: tipo as string,
      modalidad_atencion: (modalidad_atencion as string) || null,
      nombre: otherParams.nombre,
      telefono: otherParams.telefono,
      descripcion: otherParams.descripcion,
      rut: otherParams.rut,
      direccion: otherParams.direccion,
      dni: otherParams.dni,
      experiencia_anos: otherParams.experiencia_anos,
      especialidades: especialidadesParsed,
      marcas: marcasParsed,
      documentos: documentosParsed,
    };
    
    console.log('Datos consolidados:', {
      tipo: datos.tipo,
      tieneEspecialidades: datos.especialidades?.length > 0,
      tieneMarcas: datos.marcas?.length > 0,
      tieneDocumentos: Object.keys(datos.documentos || {}).length > 0,
      nombre: !!datos.nombre,
      telefono: !!datos.telefono,
      descripcion: !!datos.descripcion,
      rut: !!datos.rut,
      direccion: !!datos.direccion,
      dni: !!datos.dni,
      experiencia_anos: !!datos.experiencia_anos
    });
    
    console.log('📋 Datos completos recibidos:', {
      nombre: datos.nombre,
      telefono: datos.telefono, 
      rut: datos.rut,
      direccion: datos.direccion,
      dni: datos.dni,
      experiencia_anos: datos.experiencia_anos,
      tipo: datos.tipo
    });
    
    setDatosCompletos(datos);
    dataProcessed.current = true;
  }, []); // Array de dependencias vacío, solo ejecutar una vez

  const validarDatos = () => {
    if (!datosCompletos) return false;
    
    const errores = [];
    
    // Validaciones básicas para ambos tipos
    if (!datosCompletos.nombre) errores.push('Nombre es requerido');
    if (!datosCompletos.telefono) errores.push('Teléfono es requerido');
    
    // Validaciones del taller (todos los proveedores son talleres)
    if (!datosCompletos.rut) errores.push('RUT/CUIT es requerido para la identificación fiscal del taller');
    const soloDomicilio = datosCompletos.modalidad_atencion === 'a_domicilio';
    if (!soloDomicilio && !datosCompletos.direccion) {
      errores.push('Dirección es requerida cuando atiendes en tu taller o en ambas modalidades');
    }
    
    // CRÍTICO: Validar documentos obligatorios
    const documentosObligatorios = ['dni_frontal', 'dni_trasero', 'rut_fiscal', 'licencia_conducir'];
    const documentosDisponibles = Object.keys(datosCompletos.documentos || {});
    const documentosObligatoriosFaltantes = documentosObligatorios.filter(doc => !documentosDisponibles.includes(doc));
    
    if (documentosObligatoriosFaltantes.length > 0) {
      errores.push(`Faltan documentos obligatorios: ${documentosObligatoriosFaltantes.join(', ')}`);
    }
    
    if (errores.length > 0) {
      showAlert('Datos Incompletos', errores.join('\n\n'));
      return false;
    }
    
    return true;
  };

  const subirDocumentos = async () => {
    const documentosLocal = datosCompletos.documentos || {};
    const documentosKeys = Object.keys(documentosLocal);
    
    if (documentosKeys.length === 0) {
      console.log('No hay documentos para subir');
      return { 
        documentosSubidos: 0, 
        documentosFallidos: 0,
        documentosObligatoriosFallidos: 0,
        documentosOpcionalesFallidos: 0 
      };
    }

    setProgresoSubida('Subiendo documentos...');
    console.log('Iniciando subida de documentos:', documentosKeys);
    
    // Definir cuáles documentos son obligatorios vs opcionales
    const documentosObligatorios = ['dni_frontal', 'dni_trasero', 'rut_fiscal', 'licencia_conducir'];
    const documentosOpcionales = ['foto_fachada', 'foto_interior', 'foto_equipos', 'foto_herramientas', 'foto_vehiculo'];
    
    let documentosSubidos = 0;
    let documentosFallidos = 0;
    let documentosObligatoriosFallidos = 0;
    let documentosOpcionalesFallidos = 0;
    
    for (let i = 0; i < documentosKeys.length; i++) {
      const key = documentosKeys[i];
      const doc = documentosLocal[key];
      const esObligatorio = documentosObligatorios.includes(key);
      const esOpcional = documentosOpcionales.includes(key);
      
      setProgresoSubida(`Subiendo documento ${i + 1} de ${documentosKeys.length}...`);
      console.log(`Preparando documento ${i + 1}:`, {
        key,
        tipo: doc.tipo,
        uri: doc.uri,
        fileName: doc.fileName,
        fileType: doc.fileType,
        esObligatorio,
        esOpcional
      });
      
      try {
        const archivo = {
          uri: doc.uri,
          type: doc.fileType || 'image/jpeg',
          name: doc.fileName || `${doc.tipo}_${Date.now()}.jpg`,
        };

        console.log(`Enviando documento ${doc.tipo} al servidor...`);
        const resultado = await documentosAPI.subirDocumento(archivo, doc.tipo);
        console.log(`✅ Documento ${doc.tipo} subido exitosamente:`, resultado);
        documentosSubidos++;
        
      } catch (error: any) {
        console.error(`❌ Error subiendo documento ${doc.tipo}:`, error);
        console.error('Error response:', error.response?.data);
        console.error('Error status:', error.response?.status);
        console.error('Error message:', error.message);
        
        documentosFallidos++;
        
        // Diferenciar entre documentos obligatorios y opcionales
        if (esObligatorio) {
          documentosObligatoriosFallidos++;
          console.error(`⚠️ ERROR CRÍTICO: Documento obligatorio ${doc.tipo} falló al subir`);
        } else if (esOpcional) {
          documentosOpcionalesFallidos++;
          console.warn(`⚠️ Documento opcional ${doc.tipo} no se pudo subir, pero continuando con el proceso`);
        } else {
          console.warn(`⚠️ Documento ${doc.tipo} no se pudo subir, pero continuando con el proceso`);
        }
      }
    }
    
    console.log(`📊 Resumen de subida: ${documentosSubidos} exitosos, ${documentosFallidos} fallidos`);
    console.log(`📊 Desglose: ${documentosObligatoriosFallidos} obligatorios fallidos, ${documentosOpcionalesFallidos} opcionales fallidos`);
    
    // Solo mostrar warnings para documentos obligatorios
    if (documentosObligatoriosFallidos > 0) {
      console.warn(`⚠️ ${documentosObligatoriosFallidos} documentos obligatorios fallaron. Esto puede afectar la verificación.`);
    }
    
    // Para documentos opcionales, solo log informativo
    if (documentosOpcionalesFallidos > 0) {
      console.log(`ℹ️ ${documentosOpcionalesFallidos} documentos opcionales no se pudieron subir. Esto es normal y no afecta el proceso.`);
    }
    
    if (documentosObligatoriosFallidos === 0 && documentosOpcionalesFallidos > 0) {
      console.log('✅ Todos los documentos obligatorios subidos exitosamente. Documentos opcionales pueden subirse más tarde.');
    } else if (documentosObligatoriosFallidos === 0) {
      console.log('✅ Todos los documentos subidos exitosamente');
    }
    
    return { 
      documentosSubidos, 
      documentosFallidos,
      documentosObligatoriosFallidos,
      documentosOpcionalesFallidos 
    };
  };

  const guardarEspecialidadesYMarcas = async () => {
    console.log('Iniciando guardado de especialidades y marcas:', {
      especialidades: datosCompletos.especialidades?.length || 0,
      marcas: datosCompletos.marcas?.length || 0,
      tipo: datosCompletos.tipo
    });
    
    // Guardar especialidades
    if (datosCompletos.especialidades?.length > 0) {
      try {
        setProgresoSubida('Guardando especialidades...');
        console.log('Enviando especialidades:', datosCompletos.especialidades);
        await especialidadesAPI.actualizarEspecialidades(datosCompletos.especialidades);
        console.log('Especialidades guardadas exitosamente');
      } catch (error: any) {
        console.error('Error guardando especialidades:', error);
        console.error('Respuesta del error de especialidades:', error.response?.data);
        throw new Error(`Error al guardar especialidades: ${error.response?.data?.error || error.message}`);
      }
    } else {
      console.log('No hay especialidades para guardar');
    }
    
    // Guardar marcas atendidas
    if (datosCompletos.marcas?.length > 0) {
      try {
        setProgresoSubida('Guardando marcas atendidas...');
        console.log('Enviando marcas:', datosCompletos.marcas, 'para tipo:', datosCompletos.tipo);
        
        if (datosCompletos.tipo === 'taller') {
          await tallerAPI.actualizarMarcas(datosCompletos.marcas);
          console.log('Marcas del taller guardadas exitosamente');
        } else {
          await mecanicoAPI.actualizarMarcas(datosCompletos.marcas);
          console.log('Marcas del mecánico guardadas exitosamente');
        }
      } catch (error: any) {
        console.error('Error guardando marcas:', error);
        console.error('Respuesta del error de marcas:', error.response?.data);
        throw new Error(`Error al guardar marcas: ${error.response?.data?.error || error.message}`);
      }
    } else {
      console.log('No hay marcas para guardar');
    }
    
    console.log('Especialidades y marcas guardadas exitosamente');
  };

  const getBackPath = () => {
    const params = new URLSearchParams();
    Object.entries(otherParams).forEach(([key, value]) => {
      if (value) params.append(key, value as string);
    });
    params.append('tipo', tipo as string);
    if (documentos) params.append('documentos', documentos as string);
    return `/(onboarding)/especialidades?${params.toString()}`;
  };

  const finalizarRegistro = async () => {
    console.log('🚀 Iniciando proceso de finalización de registro...');
    
    if (!validarDatos() || !usuario) {
      console.error('❌ Validación fallida o usuario no encontrado');
      showAlert('Error', 'Faltan datos requeridos o no se encontró información del usuario');
      return;
    }

    console.log('✅ Validación exitosa, datos:', {
      tipo: datosCompletos.tipo,
      nombre: datosCompletos.nombre,
      telefono: datosCompletos.telefono,
      usuarioId: usuario.id,
      especialidades: datosCompletos.especialidades?.length || 0,
      marcas: datosCompletos.marcas?.length || 0,
      documentos: Object.keys(datosCompletos.documentos || {}).length
    });

    setIsSubmitting(true);
    let pasoCompletado = 0;
    
    try {
      // 1. Verificar si ya existe un perfil del proveedor
      pasoCompletado = 1;
      setProgresoSubida('Verificando perfil existente...');
      console.log('🔍 Paso 1: Verificando perfil existente...');
      
      let tienePerfilExistente = false;
      
      try {
        const estadoActual = await authAPI.obtenerEstadoProveedor();
        tienePerfilExistente = estadoActual.tiene_perfil;
        console.log('✅ Perfil existente encontrado:', tienePerfilExistente);
      } catch (error: any) {
        console.log('🔍 Error consultando estado:', error.response?.status);
        // Si es 404, significa que no tiene perfil (caso normal para nuevos usuarios)
        if (error.response?.status === 404) {
          console.log('✅ Usuario nuevo sin perfil - esto es normal');
          tienePerfilExistente = false;
        } else {
          console.error('❌ Error inesperado verificando perfil:', error);
          throw error;
        }
      }
      
      let perfilCreado = false;
      
      if (!tienePerfilExistente) {
        // 2. Crear el perfil del proveedor solo si no existe
        pasoCompletado = 2;
        setProgresoSubida('Creando perfil...');
        console.log('🏗️ Paso 2: Creando perfil del proveedor...');
        
        const datosInicializacion: any = {
          tipo_proveedor: datosCompletos.tipo,
          nombre: datosCompletos.nombre,
          telefono: datosCompletos.telefono,
          descripcion: datosCompletos.descripcion,
        };

        if (datosCompletos.modalidad_atencion) {
          datosInicializacion.modalidad_atencion = datosCompletos.modalidad_atencion;
        }

        if (datosCompletos.tipo === 'taller') {
          datosInicializacion.rut = datosCompletos.rut;
          datosInicializacion.direccion = datosCompletos.direccion;
          
          console.log('🏪 Inicializando onboarding de taller:', datosInicializacion);
        } else {
          datosInicializacion.dni = datosCompletos.dni;
          datosInicializacion.experiencia_anos = parseInt(datosCompletos.experiencia_anos);
          
          console.log('🔧 Inicializando onboarding de mecánico:', datosInicializacion);
        }
        
        // Usar el método directo del API
        const resultadoInicializacion = await onboardingAPI.inicializarOnboarding(datosInicializacion);
        console.log('✅ Onboarding inicializado exitosamente:', resultadoInicializacion);
        
        perfilCreado = true;
        console.log('✅ Perfil creado exitosamente');
        
        // Esperar un momento para que el backend actualice las relaciones
        setProgresoSubida('Sincronizando perfil...');
        console.log('⏳ Esperando sincronización del backend...');
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Refrescar el estado del proveedor para asegurar que el backend reconoce el nuevo perfil
        console.log('🔄 Refrescando estado del proveedor...');
        await refrescarEstadoProveedor();
      } else {
        console.log('✅ Perfil ya existe, continuando con documentos y especialidades');
      }

      // 3. Actualizar perfil con datos del onboarding (CRÍTICO)
      pasoCompletado = 3;
      setProgresoSubida('Actualizando perfil con datos del onboarding...');
      console.log('📝 Paso 3: Actualizando perfil con datos completos del onboarding...');
      
      try {
        const datosActualizacion = {
          nombre: datosCompletos.nombre,
          telefono: datosCompletos.telefono,
          descripcion: datosCompletos.descripcion,
        };

        if (datosCompletos.tipo === 'taller') {
          const datosTaller = {
            ...datosActualizacion,
            rut: datosCompletos.rut,
            direccion: datosCompletos.direccion,
          };
          
          console.log('🏪 Actualizando datos del taller:', datosTaller);
          
          // Usar método de actualización específico para perfil existente
          console.log('🔄 Actualizando perfil de taller existente usando método específico...');
          await tallerAPI.actualizarPerfilExistente(datosTaller);
          
        } else {
          const datosMecanico = {
            ...datosActualizacion,
            dni: datosCompletos.dni,
            experiencia_anos: parseInt(datosCompletos.experiencia_anos),
          };
          
          console.log('🔧 Actualizando datos del mecánico:', datosMecanico);
          
          // Usar método de actualización específico para perfil existente
          console.log('🔄 Actualizando perfil de mecánico existente usando método específico...');
          await mecanicoAPI.actualizarPerfilExistente(datosMecanico);
        }
        
        console.log('✅ Perfil actualizado con datos del onboarding');
        
        // Esperar sincronización
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error: any) {
        console.error('❌ Error actualizando perfil:', error);
        console.error('❌ Detalles del error:', error.response?.data);
        
        // Si falla la actualización, es un error crítico porque los datos deben estar correctos
        throw new Error(`Error crítico actualizando perfil: ${error.response?.data?.error || error.message}`);
      }

      // 4. Subir documentos (CRÍTICO - documentos obligatorios deben subirse)
      pasoCompletado = 4;
      console.log('📄 Paso 4: Subiendo documentos...');
      const resultadoDocumentos = await subirDocumentos();
      
      // CRÍTICO: Si fallan documentos obligatorios, el onboarding no puede completarse
      if (resultadoDocumentos.documentosObligatoriosFallidos && resultadoDocumentos.documentosObligatoriosFallidos > 0) {
        console.error(`❌ ERROR CRÍTICO: ${resultadoDocumentos.documentosObligatoriosFallidos} documentos obligatorios fallaron`);
        throw new Error(`No se pudieron subir ${resultadoDocumentos.documentosObligatoriosFallidos} documentos obligatorios. Verifica tu conexión a internet e intenta nuevamente.`);
      }
      
      // Solo mostrar mensaje informativo para documentos opcionales
      if (resultadoDocumentos.documentosOpcionalesFallidos && resultadoDocumentos.documentosOpcionalesFallidos > 0) {
        console.log(`ℹ️ ${resultadoDocumentos.documentosOpcionalesFallidos} documentos opcionales no se pudieron subir. Esto es normal y no afecta el proceso.`);
      }

      // 5. Guardar especialidades y marcas
      pasoCompletado = 5;
      console.log('🎯 Paso 5: Guardando especialidades y marcas...');
      await guardarEspecialidadesYMarcas();
      console.log('✅ Especialidades y marcas guardadas exitosamente');

      // 6. Completar el onboarding
      pasoCompletado = 6;
      setProgresoSubida('Finalizando registro...');
      console.log('🏁 Paso 6: Completando onboarding...');
      
      let onboardingCompletado = false;
      let resultadoOnboarding: any = null;
      try {
        resultadoOnboarding = await onboardingAPI.completarOnboarding();
        console.log('✅ Onboarding completado exitosamente:', resultadoOnboarding);
        onboardingCompletado = true;
      } catch (error: any) {
        console.error('❌ Error crítico al completar onboarding:', error.response?.data);
        
        // Si falla completar onboarding, es un error crítico
        const errores = error.response?.data?.errores || [error.response?.data?.error || 'Error desconocido'];
        throw new Error(`No se pudo completar el registro:\n${errores.join('\n')}`);
      }

      // 7. Refrescar estado del proveedor
      pasoCompletado = 7;
      console.log('🔄 Paso 7: Refrescando estado final...');
      await refrescarEstadoProveedor();

      // 8. Verificar que todo esté correcto antes de mostrar éxito
      const totalDocumentos = resultadoDocumentos.documentosSubidos + resultadoDocumentos.documentosFallidos;
      
      // Verificar criterios de éxito
      if (!onboardingCompletado) {
        throw new Error('No se pudo completar el onboarding en el servidor');
      }
      
      // Solo considerar críticos los documentos obligatorios
      // Los documentos opcionales no deben impedir el éxito del onboarding
      
      // 9. Mostrar mensaje de éxito (solo si todo está bien)
      console.log('🎉 Registro completado exitosamente');
      const mensajeExito = perfilCreado 
        ? 'Tu taller mecánico ha sido registrado exitosamente.'
        : `Tu información de onboarding ha sido actualizada exitosamente.`;
        
      let mensajeCompleto = mensajeExito;
      
      // Agregar información sobre el proceso de revisión
      if (resultadoOnboarding && resultadoOnboarding.mensaje_verificacion) {
        mensajeCompleto += '\n\n' + resultadoOnboarding.mensaje_verificacion;
      } else {
        // Mensaje por defecto si no viene del backend
        mensajeCompleto += '\n\nTu registro está completo y será revisado por nuestro equipo. Te notificaremos cuando esté aprobado para recibir órdenes de servicio.';
      }
      
      // Agregar información sobre documentos
      if (resultadoDocumentos.documentosObligatoriosFallidos && resultadoDocumentos.documentosObligatoriosFallidos > 0) {
        mensajeCompleto += `\n\nNota: ${resultadoDocumentos.documentosObligatoriosFallidos} documentos obligatorios no se pudieron subir. Esto puede afectar el tiempo de verificación.`;
      } else if (resultadoDocumentos.documentosOpcionalesFallidos && resultadoDocumentos.documentosOpcionalesFallidos > 0) {
        mensajeCompleto += `\n\nPerfecto: Todos los documentos obligatorios fueron subidos correctamente. Los documentos opcionales pueden subirse más tarde desde tu perfil.`;
      }
        
      showAlertButtons(
        '¡Registro Completado! 🎉',
        `${mensajeCompleto}\n\n📋 Estado: Pendiente de revisión\n👥 Nuestro equipo revisará tu información y documentos.\n📧 Te contactaremos cuando tu perfil esté aprobado.`,
        [
          {
            text: 'Entendido',
            onPress: () => {
              console.log('🏠 Navegando al home...');
              // Navegar al index que manejará la lógica de navegación según el estado
              router.replace('/');
            }
          }
        ]
      );

    } catch (error: any) {
      console.error(`❌ Error en paso ${pasoCompletado} de finalización:`, error);
      console.error('📋 Detalles del error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        stack: error.stack?.split('\n').slice(0, 3) // Solo las primeras líneas del stack
      });
      
      let mensajeError = 'No se pudo completar el registro. Por favor, intenta nuevamente.';
      let tituloError = 'Error al Finalizar Registro';
      
      // Mensajes específicos según el paso donde falló
      switch (pasoCompletado) {
        case 1:
          mensajeError = 'Error verificando el estado de tu perfil. Intenta nuevamente.';
          break;
        case 2:
          mensajeError = 'Error creando tu perfil. Verifica tus datos e intenta nuevamente.';
          break;
        case 3:
          mensajeError = 'Error actualizando tu perfil. Verifica tus datos e intenta nuevamente.';
          break;
        case 4:
          mensajeError = 'Error subiendo documentos. Verifica tu conexión e intenta nuevamente.';
          break;
        case 5:
        case 6:
          mensajeError = 'Error finalizando el registro. Tu perfil se creó pero faltó completar el proceso.';
          break;
      }
      
      if (error.response?.data?.codigo === 'MECANICO_DUPLICADO' || 
          error.response?.data?.codigo === 'TALLER_DUPLICADO') {
        console.log('🔄 Perfil duplicado detectado, intentando actualización...');
        tituloError = 'Perfil Existente';
        mensajeError = 'Ya tienes un perfil registrado. Continuaremos con la actualización de tus documentos y especialidades.';
        
        // Si el perfil ya existe, intentar solo subir documentos y especialidades
        try {
          console.log('📄 Subiendo documentos para perfil existente...');
          const { documentosSubidos: subidos, documentosFallidos: fallidos } = await subirDocumentos();
          console.log('🎯 Guardando especialidades para perfil existente...');
          await guardarEspecialidadesYMarcas();
          console.log('🏁 Completando onboarding para perfil existente...');
          await onboardingAPI.completarOnboarding();
          console.log('🔄 Refrescando estado para perfil existente...');
          await refrescarEstadoProveedor();
          
          showAlertButtons(
            '¡Información Actualizada! ✅',
            'Tu información de onboarding ha sido actualizada exitosamente.',
            [{ text: 'Entendido', onPress: () => router.replace('/') }],
          );
          return;
        } catch (updateError: any) {
          console.error('❌ Error actualizando información:', updateError);
          mensajeError = 'Error actualizando tu información. Por favor, intenta nuevamente.';
        }
      } else if (error.message) {
        mensajeError = error.message;
      } else if (error.response?.data?.error) {
        mensajeError = error.response.data.error;
      } else if (error.response?.data?.detail) {
        mensajeError = error.response.data.detail;
      } else if (error.response?.data?.errores) {
        mensajeError = error.response.data.errores.join('\n');
      }
      
      showAlert(tituloError, `${mensajeError}\n\n(Paso fallido: ${pasoCompletado}/7)`);
    } finally {
      setIsSubmitting(false);
      setProgresoSubida('');
      console.log('🔚 Proceso de finalización terminado');
    }
  };

  if (!datosCompletos) {
    return (
      <OnboardingScreenLayout>
        <View style={onboardingStyles.loadingCenter}>
          <ActivityIndicator size="large" color={I.primary} />
          <Text style={onboardingStyles.loadingText}>Preparando datos…</Text>
        </View>
      </OnboardingScreenLayout>
    );
  }

  const documentosCount = Object.keys(datosCompletos.documentos || {}).length;

  return (
    <OnboardingScreenLayout
      footer={
        <OnboardingPrimaryButton
          label={isSubmitting ? 'Procesando…' : 'Finalizar registro'}
          onPress={finalizarRegistro}
          disabled={isSubmitting}
          loading={isSubmitting}
        />
      }
    >
      <OnboardingHeader
          title="Finalizar Registro"
          subtitle="Revisa tu información y completa el registro"
          currentStep={7}
          totalSteps={7}
          icon="checkmark-circle"
          backPath={getBackPath()}
        />

        <Card elevated padding="host" style={styles.resumenContainer}>
          <Text style={styles.resumenTitle}>Resumen de tu perfil</Text>
          
          <View style={styles.datoContainer}>
            <Text style={styles.datoLabel}>Perfil:</Text>
            <Text style={styles.datoValor}>Taller mecánico</Text>
          </View>

          {datosCompletos.modalidad_atencion && (
            <View style={styles.datoContainer}>
              <Text style={styles.datoLabel}>Dónde atiendes:</Text>
              <Text style={styles.datoValor}>
                {datosCompletos.modalidad_atencion === 'en_taller'
                  ? 'Solo en mi taller (lugar físico)'
                  : datosCompletos.modalidad_atencion === 'a_domicilio'
                  ? 'Solo a domicilio'
                  : 'En taller y a domicilio'}
              </Text>
            </View>
          )}

          <View style={styles.datoContainer}>
            <Text style={styles.datoLabel}>Nombre:</Text>
            <Text style={styles.datoValor}>{datosCompletos.nombre}</Text>
          </View>

          <View style={styles.datoContainer}>
            <Text style={styles.datoLabel}>Teléfono:</Text>
            <Text style={styles.datoValor}>{datosCompletos.telefono}</Text>
          </View>

          <View style={styles.datoContainer}>
            <Text style={styles.datoLabel}>RUT/CUIT:</Text>
            <Text style={styles.datoValor}>{datosCompletos.rut}</Text>
          </View>
          {datosCompletos.direccion ? (
            <View style={styles.datoContainer}>
              <Text style={styles.datoLabel}>Dirección:</Text>
              <Text style={styles.datoValor}>{datosCompletos.direccion}</Text>
            </View>
          ) : null}
          {datosCompletos.especialidades && datosCompletos.especialidades.length > 0 && (
            <View style={styles.datoContainer}>
              <Text style={styles.datoLabel}>Especialidades:</Text>
              <Text style={styles.datoValor}>
                {datosCompletos.especialidades.length} especialidad(es) seleccionada(s)
              </Text>
            </View>
          )}
          {datosCompletos.marcas && datosCompletos.marcas.length > 0 && (
            <View style={styles.datoContainer}>
              <Text style={styles.datoLabel}>Marcas Atendidas:</Text>
              <Text style={styles.datoValor}>
                {datosCompletos.marcas.length} marca(s) de vehículos
              </Text>
            </View>
          )}

          {datosCompletos.descripcion && (
            <View style={styles.datoContainer}>
              <Text style={styles.datoLabel}>Descripción:</Text>
              <Text style={styles.datoValor}>{datosCompletos.descripcion}</Text>
            </View>
          )}

          {documentosCount > 0 && (
            <View style={styles.datoContainer}>
              <Text style={styles.datoLabel}>Documentos:</Text>
              <Text style={styles.datoValor}>
                {documentosCount} documento(s) seleccionado(s)
              </Text>
            </View>
          )}
        </Card>

      <OnboardingNotice>
        Al finalizar crearemos tu perfil, subiremos tus documentos y nuestro equipo revisará tu información. Te avisaremos por correo cuando tu cuenta esté verificada.
      </OnboardingNotice>

      {isSubmitting && progresoSubida ? (
        <View style={styles.progresoContainer}>
          <ActivityIndicator size="small" color={I.primary} />
          <Text style={styles.progresoTexto}>{progresoSubida}</Text>
        </View>
      ) : null}
    </OnboardingScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: I.surfaceSoft,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: I.muted,
  },
  resumenContainer: {
    marginBottom: 20,
  },
  resumenTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: I.ink,
    marginBottom: 16,
  },
  resumenSection: {
    marginBottom: 16,
  },
  resumenSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: I.body,
    marginBottom: 8,
  },
  resumenText: {
    fontSize: 14,
    color: I.muted,
    lineHeight: 20,
    marginBottom: 4,
  },
  resumenBadge: {
    backgroundColor: withOpacity(I.primary, 0.08),
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  resumenBadgeText: {
    fontSize: 12,
    color: I.primaryActive,
    fontWeight: '600',
  },
  especialidadesList: {
    gap: 6,
  },
  especialidadItem: {
    backgroundColor: I.surfaceSoft,
    borderRadius: 8,
    padding: 8,
    marginBottom: 4,
  },
  especialidadText: {
    fontSize: 13,
    color: I.ink,
    fontWeight: '500',
  },
  marcasList: {
    gap: 6,
  },
  marcaItem: {
    backgroundColor: I.surfaceSoft,
    borderRadius: 8,
    padding: 8,
    marginBottom: 4,
  },
  marcaText: {
    fontSize: 13,
    color: I.ink,
    fontWeight: '500',
  },
  documentosSection: {
    marginBottom: 12,
  },
  documentoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: I.surfaceSoft,
    borderRadius: 8,
    padding: 8,
    marginBottom: 4,
  },
  documentoText: {
    flex: 1,
    fontSize: 13,
    color: I.ink,
    marginLeft: 8,
  },
  estadoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withOpacity(I.semanticUp, 0.12),
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  estadoText: {
    marginLeft: 12,
    fontSize: 16,
    color: I.semanticUp,
    fontWeight: '600',
  },
  finalizarButton: {
    backgroundColor: I.semanticUp,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: I.primaryDisabled,
  },
  finalizarButtonText: {
    color: I.onPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonLoader: {
    marginRight: 8,
  },
  infoContainer: {
    flexDirection: 'row',
    backgroundColor: withOpacity(I.primary, 0.08),
    borderRadius: 12,
    padding: 16,
    marginBottom: 30,
  },
  infoTexto: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: I.primaryActive,
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 14,
    color: I.primaryActive,
    lineHeight: 20,
  },
  progresoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    backgroundColor: I.surfaceSoft,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: I.hairline,
  },
  progresoTexto: {
    marginLeft: 8,
    fontSize: 14,
    color: I.primary,
    fontWeight: '500',
  },
  buttonContainer: {
    marginTop: 20,
    paddingHorizontal: 0,
  },
  datoContainer: {
    marginBottom: 12,
  },
  datoLabel: {
    fontSize: 14,
    color: I.muted,
    marginBottom: 4,
  },
  datoValor: {
    fontSize: 16,
    color: I.ink,
    fontWeight: '500',
  },
  loadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
}); 