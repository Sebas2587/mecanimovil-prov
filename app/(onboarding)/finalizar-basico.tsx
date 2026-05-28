import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { onboardingAPI, tallerAPI, mecanicoAPI, especialidadesAPI, authAPI, serviciosAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import OnboardingHeader from '@/components/OnboardingHeader';
import {
  OnboardingScreenLayout,
  OnboardingPrimaryButton,
  OnboardingNotice,
} from '@/components/onboarding';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { COLORS } from '@/app/design-system/tokens';
import { onboardingStyles } from '@/app/design-system/styles/onboarding';
import { showAlert, showAlertButtons } from '@/utils/platformAlert';
import { appendOnboardingParams, finalizarBasicoStep } from '@/utils/onboardingNavigation';

const I = COLORS.institutional;

export default function FinalizarBasicoScreen() {
  const { tipo, especialidades, marcas, servicios_seleccionados, es_multimarca, ...otherParams } = useLocalSearchParams();
  const router = useRouter();
  const { usuario, refrescarEstadoProveedor } = useAuth();

  const esMultimarca = useMemo(() => {
    const v = Array.isArray(es_multimarca) ? es_multimarca[0] : es_multimarca;
    return v === 'true';
  }, [es_multimarca]);

  const pasoFinalizar = finalizarBasicoStep(esMultimarca);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [datosCompletos, setDatosCompletos] = useState<any>(null);
  const [progresoSubida, setProgresoSubida] = useState<string>('');
  
  // UseRef para evitar re-procesamiento innecesario
  const dataProcessed = useRef(false);

  useEffect(() => {
    // Solo procesar una vez cuando todos los datos estén disponibles
    if (dataProcessed.current) return;
    
    // Crear una clave estable basada en los valores primitivos de los parámetros
    const tipoStr = Array.isArray(tipo) ? tipo[0] : tipo;
    const especialidadesStr = Array.isArray(especialidades) ? especialidades[0] : especialidades;
    const marcasStr = Array.isArray(marcas) ? marcas[0] : marcas;
    const serviciosSeleccionadosStr = Array.isArray(servicios_seleccionados)
      ? servicios_seleccionados[0]
      : servicios_seleccionados;
    
    // Validar que los parámetros necesarios estén presentes
    if (!tipoStr) {
      console.warn('⚠️ Tipo no disponible, esperando...');
      return;
    }
    
    try {
      console.log('Procesando datos del onboarding básico...');
      
      // Consolidar todos los datos del onboarding
      let especialidadesParsed: number[] = [];
      let marcasParsed: number[] = [];
      
      // Parseo seguro de especialidades
      if (especialidadesStr) {
        try {
          if (typeof especialidadesStr === 'string') {
            especialidadesParsed = JSON.parse(especialidadesStr) as number[];
            console.log('Especialidades parseadas:', especialidadesParsed.length);
          } else if (Array.isArray(especialidadesStr)) {
            especialidadesParsed = especialidadesStr as number[];
          } else {
            console.warn('⚠️ especialidadesStr no es string ni array:', typeof especialidadesStr);
            especialidadesParsed = [];
          }
        } catch (error: any) {
          console.error('Error parseando especialidades:', error);
          especialidadesParsed = [];
        }
      }
      
      // Parseo seguro de marcas
      if (marcasStr) {
        try {
          if (typeof marcasStr === 'string') {
            marcasParsed = JSON.parse(marcasStr) as number[];
            console.log('Marcas parseadas:', marcasParsed.length);
          } else if (Array.isArray(marcasStr)) {
            marcasParsed = marcasStr as number[];
          } else {
            console.warn('⚠️ marcasStr no es string ni array:', typeof marcasStr);
            marcasParsed = [];
          }
        } catch (error: any) {
          console.error('Error parseando marcas:', error);
          marcasParsed = [];
        }
      }
      
      // Crear objeto de datos estable con validación segura
      const getParamValue = (key: string) => {
        if (!otherParams) {
          return undefined;
        }
        const value = otherParams[key];
        const result = Array.isArray(value) ? value[0] : value;
        return result;
      };
      
      const nombreValue = getParamValue('nombre');
      const telefonoValue = getParamValue('telefono');
      const descripcionValue = getParamValue('descripcion');
      const rutValue = getParamValue('rut');
      const direccionValue = getParamValue('direccion');
      const direccionLatValue = getParamValue('direccion_lat');
      const direccionLngValue = getParamValue('direccion_lng');
      const comunaValue = getParamValue('comuna');
      const regionValue = getParamValue('region');
      const dniValue = getParamValue('dni');
      const experienciaValue = getParamValue('experiencia_anos');
      
      const esMultimarcaStr = Array.isArray(es_multimarca) ? es_multimarca[0] : es_multimarca;
      const esMultimarcaBool = esMultimarcaStr === 'true';

      const datos = {
        tipo: tipoStr || '',
        nombre: (nombreValue ?? '') as string,
        telefono: (telefonoValue ?? '') as string,
        descripcion: (descripcionValue ?? '') as string,
        rut: (rutValue ?? '') as string,
        direccion: (direccionValue ?? '') as string,
        direccion_lat: direccionLatValue ? parseFloat(String(direccionLatValue)) : undefined,
        direccion_lng: direccionLngValue ? parseFloat(String(direccionLngValue)) : undefined,
        comuna: (comunaValue ?? '') as string,
        region: (regionValue ?? '') as string,
        dni: (dniValue ?? '') as string,
        experiencia_anos: (experienciaValue ?? '') as string,
        especialidades: especialidadesParsed,
        marcas: marcasParsed,
        es_multimarca: esMultimarcaBool,
        tipo_cobertura_marca: esMultimarcaBool ? 'multimarca' : 'especialista' as 'multimarca' | 'especialista',
        servicios_seleccionados: (() => {
          try {
            if (serviciosSeleccionadosStr && typeof serviciosSeleccionadosStr === 'string') {
              const parsed = JSON.parse(serviciosSeleccionadosStr);
              if (Array.isArray(parsed)) return parsed as { marcaId: number; servicioId: number }[];
            }
          } catch { /* ignore */ }
          return [] as { marcaId: number; servicioId: number }[];
        })(),
      };
      
      // Validar que especialidadesParsed y marcasParsed sean arrays antes de crear datos
      if (!Array.isArray(especialidadesParsed)) {
        console.warn('⚠️ especialidadesParsed no es un array, forzando array vacío:', typeof especialidadesParsed);
        especialidadesParsed = [];
      }
      if (!Array.isArray(marcasParsed)) {
        console.warn('⚠️ marcasParsed no es un array, forzando array vacío:', typeof marcasParsed);
        marcasParsed = [];
      }
      
      console.log('Datos consolidados:', {
        tipo: datos.tipo,
        serviciosSeleccionados: Array.isArray(datos.servicios_seleccionados)
          ? datos.servicios_seleccionados.length
          : 0,
        tieneEspecialidades: Array.isArray(datos.especialidades) && datos.especialidades.length > 0,
        tieneMarcas: Array.isArray(datos.marcas) && datos.marcas.length > 0,
        esMultimarca: datos.es_multimarca,
        nombre: !!datos.nombre,
        telefono: !!datos.telefono,
        descripcion: !!datos.descripcion,
        rut: !!datos.rut,
        direccion: !!datos.direccion,
        dni: !!datos.dni,
        experiencia_anos: !!datos.experiencia_anos
      });
      
      setDatosCompletos(datos);
      dataProcessed.current = true;
      } catch (error: any) {
      console.error('Error crítico procesando datos del onboarding:', error);
      showAlertButtons('Error', 'Ocurrió un error al procesar los datos. Por favor, vuelve al inicio del onboarding.', [
        {
          text: 'Volver al inicio',
          onPress: () => router.replace('/(onboarding)/tipo-cuenta'),
        },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo, especialidades, marcas, servicios_seleccionados]);

  const validarDatos = () => {
    try {
      if (!datosCompletos) return false;
      
      // Validar que datosCompletos tenga la estructura esperada
      if (typeof datosCompletos !== 'object') return false;
      
      const errores = [];
      
      // Validaciones básicas para ambos tipos
      if (!datosCompletos.nombre || typeof datosCompletos.nombre !== 'string' || !datosCompletos.nombre.trim()) {
        errores.push('Nombre es requerido');
      }
      if (!datosCompletos.telefono || typeof datosCompletos.telefono !== 'string' || !datosCompletos.telefono.trim()) {
        errores.push('Teléfono es requerido');
      }
      
      // Validaciones específicas para talleres
      if (datosCompletos.tipo === 'taller') {
        if (!datosCompletos.rut || typeof datosCompletos.rut !== 'string' || !datosCompletos.rut.trim()) {
          errores.push('RUT/CUIT es requerido para la identificación fiscal del taller');
        }
        if (!datosCompletos.direccion || typeof datosCompletos.direccion !== 'string' || !datosCompletos.direccion.trim()) {
          errores.push('Dirección es requerida para ubicar tu taller');
        }
      }
      
      // Validaciones específicas para mecánicos
      if (datosCompletos.tipo === 'mecanico') {
        if (!datosCompletos.dni || typeof datosCompletos.dni !== 'string' || !datosCompletos.dni.trim()) {
          errores.push('DNI/RUT personal es requerido para tu identificación');
        }
        if (!datosCompletos.experiencia_anos || typeof datosCompletos.experiencia_anos !== 'string' || !datosCompletos.experiencia_anos.trim()) {
          errores.push('Años de experiencia son requeridos para validar tu competencia');
        }
      }

      const serviciosCount = Array.isArray(datosCompletos.servicios_seleccionados)
        ? datosCompletos.servicios_seleccionados.length
        : 0;
      if (serviciosCount === 0) {
        errores.push(
          'Debes seleccionar al menos un servicio en el paso de catálogo. Vuelve atrás y marca los servicios que ofreces.'
        );
      }
      
      if (errores.length > 0) {
        showAlert('Datos Incompletos', errores.join('\n\n'));
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error en validarDatos:', error);
      showAlert('Error', 'Ocurrió un error al validar los datos.');
      return false;
    }
  };

  const guardarEspecialidadesYMarcas = async () => {
    try {
      if (!datosCompletos) {
        throw new Error('Datos completos no disponibles');
      }
      
      console.log('Iniciando guardado de especialidades y marcas:', {
        especialidades: Array.isArray(datosCompletos.especialidades) ? datosCompletos.especialidades.length : 0,
        marcas: Array.isArray(datosCompletos.marcas) ? datosCompletos.marcas.length : 0,
        tipo: datosCompletos.tipo
      });
      
      // Guardar especialidades
      if (Array.isArray(datosCompletos.especialidades) && datosCompletos.especialidades.length > 0) {
        try {
          setProgresoSubida('Guardando especialidades...');
          console.log('Enviando especialidades:', datosCompletos.especialidades);
          await especialidadesAPI.actualizarEspecialidades(datosCompletos.especialidades);
          console.log('Especialidades guardadas exitosamente');
        } catch (error: any) {
          console.error('Error guardando especialidades:', error);
          console.error('Respuesta del error de especialidades:', error.response?.data);
          throw new Error(`Error al guardar especialidades: ${error.response?.data?.error || error.message || 'Error desconocido'}`);
        }
      } else {
        console.log('No hay especialidades para guardar');
      }
      
      // Guardar marcas atendidas (o tipo multimarca si corresponde)
      const tipoCoberturasMarca = datosCompletos.tipo_cobertura_marca as 'multimarca' | 'especialista' | undefined;
      const tieneCoberturaMarca = tipoCoberturasMarca === 'multimarca' || (Array.isArray(datosCompletos.marcas) && datosCompletos.marcas.length > 0);

      if (tieneCoberturaMarca) {
        try {
          setProgresoSubida('Guardando cobertura de marcas...');
          const marcasFinal = tipoCoberturasMarca === 'multimarca' ? [] : (datosCompletos.marcas || []);
          console.log('Enviando marcas:', marcasFinal, 'tipo_cobertura:', tipoCoberturasMarca, 'para tipo proveedor:', datosCompletos.tipo);
          
          if (datosCompletos.tipo === 'taller') {
            await tallerAPI.actualizarMarcas(marcasFinal, tipoCoberturasMarca);
            console.log('Marcas del taller guardadas exitosamente');
          } else {
            await mecanicoAPI.actualizarMarcas(marcasFinal, tipoCoberturasMarca);
            console.log('Marcas del mecánico guardadas exitosamente');
          }
        } catch (error: any) {
          console.error('Error guardando marcas:', error);
          console.error('Respuesta del error de marcas:', error.response?.data);
          throw new Error(`Error al guardar marcas: ${error.response?.data?.error || error.message || 'Error desconocido'}`);
        }
      } else {
        console.log('No hay marcas para guardar');
      }
      
      console.log('Especialidades y marcas guardadas exitosamente');

      // Guardar catálogo inicial de servicios por marca (si el proveedor seleccionó servicios)
      const serviciosArr = Array.isArray(datosCompletos.servicios_seleccionados)
        ? datosCompletos.servicios_seleccionados
        : [];
      if (serviciosArr.length > 0) {
        try {
          setProgresoSubida('Guardando catálogo de servicios…');
          const payload = serviciosArr.map((item: { marcaId: number; servicioId: number }) => ({
            servicio_id: item.servicioId,
            // Multimarca usa marcaId=0 como señal en UI; backend espera null/ausente (no 0).
            marca_id: item.marcaId === 0 ? null : item.marcaId,
          }));
          await serviciosAPI.crearCatalogoInicial(payload);
          console.log('Catálogo inicial guardado exitosamente:', payload.length, 'servicios');
        } catch (error: any) {
          // No bloquear el onboarding si falla; el proveedor puede configurar servicios después
          console.warn('⚠️ No se pudo guardar el catálogo inicial:', error?.response?.data || error?.message);
        }
      } else {
        console.log('No hay servicios seleccionados para el catálogo inicial');
      }
    } catch (error: any) {
      console.error('Error en guardarEspecialidadesYMarcas:', error);
      throw error; // Re-lanzar para que el caller lo maneje
    }
  };

  const getBackPath = () => {
    const params = new URLSearchParams();
    appendOnboardingParams(params, {
      ...otherParams,
      tipo: Array.isArray(tipo) ? tipo[0] : tipo,
      marcas: Array.isArray(marcas) ? marcas[0] : marcas,
      especialidades: Array.isArray(especialidades) ? especialidades[0] : especialidades,
      servicios_seleccionados: Array.isArray(servicios_seleccionados)
        ? servicios_seleccionados[0]
        : servicios_seleccionados,
      es_multimarca: esMultimarca ? 'true' : 'false',
    });
    return `/(onboarding)/catalogo-servicios-marcas?${params.toString()}`;
  };

  const finalizarOnboardingBasico = async () => {
    console.log('🚀 Iniciando proceso de finalización de onboarding básico...');
    
    if (!validarDatos() || !usuario) {
      console.error('❌ Validación fallida o usuario no encontrado');
      showAlert('Error', 'Faltan datos requeridos o no se encontró información del usuario');
      return;
    }

    console.log('✅ Validación exitosa, datos:', {
      tipo: datosCompletos.tipo,
      nombre: datosCompletos.nombre,
      telefono: datosCompletos.telefono,
      usuarioId: usuario?.id || 'N/A',
      especialidades: Array.isArray(datosCompletos.especialidades) ? datosCompletos.especialidades.length : 0,
      marcas: Array.isArray(datosCompletos.marcas) ? datosCompletos.marcas.length : 0,
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
        
        // Validar que la descripción no esté vacía antes de inicializar
        const descripcionInicial = datosCompletos.descripcion?.trim() || 
          (datosCompletos.tipo === 'taller' 
            ? `Taller mecánico especializado en servicios automotrices`
            : `Mecánico a domicilio con experiencia en servicios automotrices`);
        
        const datosInicializacion: any = {
          tipo_proveedor: datosCompletos.tipo,
          nombre: datosCompletos.nombre,
          telefono: datosCompletos.telefono,
          descripcion: descripcionInicial,
        };

        if (datosCompletos.tipo === 'taller') {
          datosInicializacion.rut = datosCompletos.rut;
          datosInicializacion.direccion = datosCompletos.direccion;
          
          console.log('🏪 Inicializando onboarding de taller:', datosInicializacion);
        } else {
          datosInicializacion.dni = datosCompletos.dni;
          // Parse seguro de experiencia_anos
          const experienciaRaw = datosCompletos.experiencia_anos;
          if (experienciaRaw) {
            const experienciaParsed = parseInt(String(experienciaRaw));
            datosInicializacion.experiencia_anos = isNaN(experienciaParsed) ? 0 : experienciaParsed;
          } else {
            datosInicializacion.experiencia_anos = 0;
          }
          
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
        console.log('✅ Perfil ya existe, continuando con especialidades y marcas');
      }

      // 3. Actualizar perfil con datos del onboarding (CRÍTICO)
      pasoCompletado = 3;
      setProgresoSubida('Actualizando perfil con datos del onboarding...');
      console.log('📝 Paso 3: Actualizando perfil con datos completos del onboarding...');
      
      // Validar que la descripción no esté vacía (requerida por el backend)
      const descripcionValidada = datosCompletos.descripcion?.trim() || 
        (datosCompletos.tipo === 'taller' 
          ? `Taller mecánico especializado en servicios automotrices`
          : `Mecánico a domicilio con experiencia en servicios automotrices`);
      
      if (!descripcionValidada || descripcionValidada.trim().length === 0) {
        throw new Error('La descripción es requerida para completar el onboarding. Por favor, vuelve a la pantalla de información básica y completa la descripción.');
      }
      
      try {
        const datosActualizacion = {
          nombre: datosCompletos.nombre,
          telefono: datosCompletos.telefono,
          descripcion: descripcionValidada,
        };

        if (datosCompletos.tipo === 'taller') {
          const datosTaller = {
            ...datosActualizacion,
            rut: datosCompletos.rut,
            direccion: datosCompletos.direccion,
          };
          
          console.log('🏪 Actualizando datos del taller:', datosTaller);
          await tallerAPI.actualizarPerfilExistente(datosTaller);

          const lat = datosCompletos.direccion_lat;
          const lng = datosCompletos.direccion_lng;
          if (
            typeof lat === 'number' &&
            typeof lng === 'number' &&
            Number.isFinite(lat) &&
            Number.isFinite(lng)
          ) {
            await tallerAPI.actualizarUbicacionDomicilio({
              direccion: datosCompletos.direccion,
              latitud: lat,
              longitud: lng,
            });
          }
          
        } else {
          // Parse seguro de experiencia_anos
          const experienciaRaw = datosCompletos.experiencia_anos;
          let experienciaParsed = 0;
          if (experienciaRaw) {
            const parsed = parseInt(String(experienciaRaw));
            experienciaParsed = isNaN(parsed) ? 0 : parsed;
          }
          
          const datosMecanico = {
            ...datosActualizacion,
            dni: datosCompletos.dni,
            experiencia_anos: experienciaParsed,
          };
          
          console.log('🔧 Actualizando datos del mecánico:', datosMecanico);
          await mecanicoAPI.actualizarPerfilExistente(datosMecanico);
        }
        
        console.log('✅ Perfil actualizado con datos del onboarding');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error: any) {
        console.error('❌ Error actualizando perfil:', error);
        console.error('❌ Detalles del error:', error.response?.data);
        
        // Si falla la actualización, es un error crítico porque los datos deben estar correctos
        throw new Error(`Error crítico actualizando perfil: ${error.response?.data?.error || error.message}`);
      }

      // 4. Guardar especialidades y marcas
      pasoCompletado = 4;
      console.log('🎯 Paso 4: Guardando especialidades y marcas...');
      await guardarEspecialidadesYMarcas();
      console.log('✅ Especialidades y marcas guardadas exitosamente');

      // 5. Completar el onboarding
      pasoCompletado = 5;
      setProgresoSubida('Finalizando onboarding básico...');
      console.log('🏁 Paso 5: Completando onboarding básico...');
      
      let onboardingCompletado = false;
      let resultadoOnboarding: any = null;
      try {
        resultadoOnboarding = await onboardingAPI.completarOnboarding();
        console.log('✅ Onboarding básico completado exitosamente:', resultadoOnboarding);
        onboardingCompletado = true;
      } catch (error: any) {
        console.error('❌ Error crítico al completar onboarding:', error.response?.data);
        
        // Si falla completar onboarding, es un error crítico
        const errores = error.response?.data?.errores || [error.response?.data?.error || 'Error desconocido'];
        throw new Error(`No se pudo completar el onboarding básico:\n${errores.join('\n')}`);
      }

      // 6. Refrescar estado del proveedor
      pasoCompletado = 6;
      console.log('🔄 Paso 6: Refrescando estado final...');
      await refrescarEstadoProveedor();

      // 7. Mostrar mensaje de éxito y redirigir a documentos
      console.log('🎉 Onboarding básico completado exitosamente');
      
      const mensajeExito = perfilCreado 
        ? `Tu perfil de ${datosCompletos.tipo === 'taller' ? 'taller mecánico' : 'mecánico a domicilio'} ha sido creado exitosamente.`
        : `Tu información de onboarding ha sido actualizada exitosamente.`;
        
      showAlertButtons(
        '🎉 Onboarding Completado',
        `${mensajeExito}\n\nAhora necesitas completar tu documentación para activar tu cuenta y empezar a recibir órdenes de servicio.`,
        [
          {
            text: 'Subir Documentos',
            onPress: () => {
              console.log('🏠 Navegando a subir documentos...');
              router.replace('/(onboarding)/subir-documentos');
            },
          },
        ],
      );

    } catch (error: any) {
      console.error(`❌ Error en paso ${pasoCompletado} de finalización:`, error);
      console.error('📋 Detalles del error:', {
        message: error?.message || 'Error desconocido',
        status: error?.response?.status,
        data: error?.response?.data,
        stack: error?.stack ? error.stack.split('\n').slice(0, 3) : undefined // Solo las primeras líneas del stack
      });
      
      let mensajeError = 'No se pudo completar el onboarding básico. Por favor, intenta nuevamente.';
      let tituloError = 'Error al Finalizar Onboarding';
      
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
          mensajeError = 'Error guardando especialidades y marcas. Verifica tu conexión e intenta nuevamente.';
          break;
        case 5:
          mensajeError = 'Error completando el onboarding. Tu perfil se creó pero faltó completar el proceso.';
          break;
      }
      
      if (error.response?.data?.codigo === 'MECANICO_DUPLICADO' || 
          error.response?.data?.codigo === 'TALLER_DUPLICADO') {
        console.log('🔄 Perfil duplicado detectado, intentando actualización...');
        tituloError = 'Perfil Existente';
        mensajeError = 'Ya tienes un perfil registrado. Continuaremos con la actualización de tus especialidades y marcas.';
        
        // Si el perfil ya existe, intentar solo especialidades y marcas
        try {
          console.log('🎯 Guardando especialidades para perfil existente...');
          await guardarEspecialidadesYMarcas();
          console.log('🏁 Completando onboarding para perfil existente...');
          await onboardingAPI.completarOnboarding();
          console.log('🔄 Refrescando estado para perfil existente...');
          await refrescarEstadoProveedor();
          
          showAlertButtons(
            '✅ Información Actualizada',
            'Tu información de onboarding ha sido actualizada exitosamente. Ahora puedes proceder a subir tus documentos.',
            [{ text: 'Subir Documentos', onPress: () => router.replace('/(onboarding)/subir-documentos') }],
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
      
      showAlert(tituloError, `${mensajeError}\n\n(Paso fallido: ${pasoCompletado}/6)`);
    } finally {
      setIsSubmitting(false);
      setProgresoSubida('');
      console.log('🔚 Proceso de finalización de onboarding básico terminado');
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

  const serviciosCount = Array.isArray(datosCompletos.servicios_seleccionados)
    ? datosCompletos.servicios_seleccionados.length
    : 0;
  const especialidadesCount = Array.isArray(datosCompletos.especialidades)
    ? datosCompletos.especialidades.length
    : 0;

  return (
    <OnboardingScreenLayout
      footer={
        <OnboardingPrimaryButton
          label={isSubmitting ? 'Procesando…' : 'Completar onboarding básico'}
          onPress={finalizarOnboardingBasico}
          disabled={isSubmitting}
          loading={isSubmitting}
        />
      }
    >
      <OnboardingHeader
          title="Finalizar Onboarding Básico"
          subtitle="Revisa tu información y completa el registro de tu perfil"
          currentStep={pasoFinalizar.current}
          totalSteps={pasoFinalizar.total}
          icon="checkmark-circle"
          backPath={getBackPath()}
        />

        <View style={styles.resumenContainer}>
          <View style={styles.seccionResumen}>
            <View style={styles.seccionHeader}>
              <InstitutionalIcon 
                name={datosCompletos.tipo === 'taller' ? 'business' : 'person'} 
                size={24} 
                color={I.primary}
               strokeWidth={ICON_STROKE_WIDTH} />
              <Text style={styles.seccionTitulo}>
                {datosCompletos.tipo === 'taller' ? 'Información del Taller' : 'Información del Mecánico'}
              </Text>
            </View>
            
            <View style={styles.datoContainer}>
              <Text style={styles.datoLabel}>Nombre:</Text>
              <Text style={styles.datoValor}>{datosCompletos.nombre}</Text>
            </View>
            
            <View style={styles.datoContainer}>
              <Text style={styles.datoLabel}>Teléfono:</Text>
              <Text style={styles.datoValor}>{datosCompletos.telefono}</Text>
            </View>
            
            {datosCompletos.descripcion && (
              <View style={styles.datoContainer}>
                <Text style={styles.datoLabel}>Descripción:</Text>
                <Text style={styles.datoValor}>{datosCompletos.descripcion}</Text>
              </View>
            )}
            
            {datosCompletos.tipo === 'taller' && (
              <>
                <View style={styles.datoContainer}>
                  <Text style={styles.datoLabel}>RUT/CUIT:</Text>
                  <Text style={styles.datoValor}>{datosCompletos.rut}</Text>
                </View>
                <View style={styles.datoContainer}>
                  <Text style={styles.datoLabel}>Dirección:</Text>
                  <Text style={styles.datoValor}>{datosCompletos.direccion}</Text>
                </View>
              </>
            )}
            
            {datosCompletos.tipo === 'mecanico' && (
              <>
                <View style={styles.datoContainer}>
                  <Text style={styles.datoLabel}>DNI/RUT:</Text>
                  <Text style={styles.datoValor}>{datosCompletos.dni}</Text>
                </View>
                <View style={styles.datoContainer}>
                  <Text style={styles.datoLabel}>Experiencia:</Text>
                  <Text style={styles.datoValor}>{datosCompletos.experiencia_anos} años</Text>
                </View>
              </>
            )}
          </View>

          <View style={styles.seccionResumen}>
            <View style={styles.seccionHeader}>
              <InstitutionalIcon name="construct" size={24} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
              <Text style={styles.seccionTitulo}>Servicios del catálogo</Text>
            </View>
            {serviciosCount > 0 ? (
              <>
                <Text style={[styles.estadisticaValor, { color: I.semanticUp }]}>
                  {serviciosCount} servicio{serviciosCount !== 1 ? 's' : ''} seleccionado{serviciosCount !== 1 ? 's' : ''}
                </Text>
                <Text style={styles.estadisticaHint}>
                  Aparecerán en Mis servicios al completar el registro (podrás configurar precios después).
                </Text>
              </>
            ) : (
              <>
                <Text style={[styles.estadisticaValor, { color: I.semanticDown }]}>
                  Ningún servicio detectado
                </Text>
                <Text style={styles.estadisticaHint}>
                  Vuelve al paso anterior y selecciona al menos un servicio antes de finalizar.
                </Text>
              </>
            )}
          </View>

          <View style={styles.seccionResumen}>
            <View style={styles.seccionHeader}>
              <InstitutionalIcon name="car" size={24} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
              <Text style={styles.seccionTitulo}>Cobertura de Marcas</Text>
            </View>
            {datosCompletos.tipo_cobertura_marca === 'multimarca' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <InstitutionalIcon name="globe-outline" size={18} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                <Text style={[styles.estadisticaValor, { color: I.primary }]}>Multimarca — todas las marcas</Text>
              </View>
            ) : (
              <Text style={styles.estadisticaValor}>
                {Array.isArray(datosCompletos.marcas) ? datosCompletos.marcas.length : 0} marcas seleccionadas
              </Text>
            )}
          </View>

          <View style={styles.seccionResumen}>
            <View style={styles.seccionHeader}>
              <InstitutionalIcon name="build" size={24} color={I.semanticUp} strokeWidth={ICON_STROKE_WIDTH} />
              <Text style={styles.seccionTitulo}>Especialidades</Text>
            </View>
            {datosCompletos.tipo_cobertura_marca === 'multimarca' ? (
              <>
                <Text style={styles.estadisticaValor}>
                  {especialidadesCount > 0
                    ? `${especialidadesCount} especialidad${especialidadesCount !== 1 ? 'es' : ''} en el formulario`
                    : 'Se asignan al guardar'}
                </Text>
                <Text style={styles.estadisticaHint}>
                  {serviciosCount > 0
                    ? `Según tus ${serviciosCount} servicio${serviciosCount !== 1 ? 's' : ''}, el sistema registrará las especialidades (categorías) correspondientes.`
                    : 'Sin servicios seleccionados no se pueden derivar especialidades.'}
                </Text>
              </>
            ) : (
              <Text style={styles.estadisticaValor}>
                {especialidadesCount > 0
                  ? `${especialidadesCount} especialidad${especialidadesCount !== 1 ? 'es' : ''} en el formulario`
                  : serviciosCount > 0
                    ? 'Se asignan al guardar según tus servicios'
                    : '0 — selecciona servicios en el paso anterior'}
              </Text>
            )}
          </View>
        </View>

      <OnboardingNotice>
        Completaremos tu registro básico y luego te guiaremos para subir documentos. Nuestro equipo revisará tu información para activar tu cuenta.
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
  resumenContainer: {
    marginBottom: 20,
  },
  seccionResumen: {
    ...onboardingStyles.panel,
    marginBottom: 15,
  },
  seccionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  seccionTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: I.ink,
    marginLeft: 10,
  },
  datoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  datoLabel: {
    fontSize: 14,
    color: I.muted,
    fontWeight: '500',
  },
  datoValor: {
    fontSize: 14,
    color: I.ink,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'right',
  },
  estadisticaHint: {
    fontSize: 13,
    color: I.muted,
    marginTop: 8,
    lineHeight: 18,
  },
  estadisticaValor: {
    fontSize: 16,
    color: I.ink,
    fontWeight: 'bold',
  },
  progresoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: I.surfaceSoft,
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
  },
  progresoTexto: {
    marginLeft: 10,
    fontSize: 14,
    color: I.primary,
    fontWeight: '500',
  },
}); 