import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { onboardingAPI, tallerAPI, mecanicoAPI, especialidadesAPI, authAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import OnboardingHeader from '@/components/OnboardingHeader';

export default function FinalizarBasicoScreen() {
  const { tipo, especialidades, marcas, ...otherParams } = useLocalSearchParams();
  const router = useRouter();
  const { usuario, refrescarEstadoProveedor } = useAuth();
  
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
      const dniValue = getParamValue('dni');
      const experienciaValue = getParamValue('experiencia_anos');
      
      const datos = {
        tipo: tipoStr || '',
        nombre: (nombreValue ?? '') as string,
        telefono: (telefonoValue ?? '') as string,
        descripcion: (descripcionValue ?? '') as string,
        rut: (rutValue ?? '') as string,
        direccion: (direccionValue ?? '') as string,
        dni: (dniValue ?? '') as string,
        experiencia_anos: (experienciaValue ?? '') as string,
        especialidades: especialidadesParsed,
        marcas: marcasParsed,
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
        tieneEspecialidades: Array.isArray(datos.especialidades) && datos.especialidades.length > 0,
        tieneMarcas: Array.isArray(datos.marcas) && datos.marcas.length > 0,
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
      Alert.alert(
        'Error',
        'Ocurrió un error al procesar los datos. Por favor, vuelve al inicio del onboarding.',
        [
          {
            text: 'Volver al inicio',
            onPress: () => {
              router.replace('/(onboarding)/tipo-cuenta');
            }
          }
        ]
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo, especialidades, marcas]); // Dependencias primitivas desde useLocalSearchParams

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
      
      if (errores.length > 0) {
        Alert.alert('Datos Incompletos', errores.join('\n\n'));
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error en validarDatos:', error);
      Alert.alert('Error', 'Ocurrió un error al validar los datos.');
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
      
      // Guardar marcas atendidas
      if (Array.isArray(datosCompletos.marcas) && datosCompletos.marcas.length > 0) {
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
          throw new Error(`Error al guardar marcas: ${error.response?.data?.error || error.message || 'Error desconocido'}`);
        }
      } else {
        console.log('No hay marcas para guardar');
      }
      
      console.log('Especialidades y marcas guardadas exitosamente');
    } catch (error: any) {
      console.error('Error en guardarEspecialidadesYMarcas:', error);
      throw error; // Re-lanzar para que el caller lo maneje
    }
  };

  const getBackPath = () => {
    const params = new URLSearchParams();
    Object.entries(otherParams).forEach(([key, value]) => {
      if (value) params.append(key, value as string);
    });
    params.append('tipo', tipo as string);
    return `/(onboarding)/marcas?${params.toString()}`;
  };

  const finalizarOnboardingBasico = async () => {
    console.log('🚀 Iniciando proceso de finalización de onboarding básico...');
    
    if (!validarDatos() || !usuario) {
      console.error('❌ Validación fallida o usuario no encontrado');
      Alert.alert('Error', 'Faltan datos requeridos o no se encontró información del usuario');
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
        
      Alert.alert(
        '🎉 Onboarding Completado',
        `${mensajeExito}\n\nAhora necesitas completar tu documentación para activar tu cuenta y empezar a recibir órdenes de servicio.`,
        [
          {
            text: 'Subir Documentos',
            onPress: () => {
              console.log('🏠 Navegando a subir documentos...');
              router.replace('/(onboarding)/subir-documentos');
            }
          }
        ]
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
          
          Alert.alert(
            '✅ Información Actualizada',
            'Tu información de onboarding ha sido actualizada exitosamente. Ahora puedes proceder a subir tus documentos.',
            [{ text: 'Subir Documentos', onPress: () => router.replace('/(onboarding)/subir-documentos') }]
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
      
      Alert.alert(tituloError, `${mensajeError}\n\n(Paso fallido: ${pasoCompletado}/6)`);
    } finally {
      setIsSubmitting(false);
      setProgresoSubida('');
      console.log('🔚 Proceso de finalización de onboarding básico terminado');
    }
  };

  if (!datosCompletos) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Preparando datos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <OnboardingHeader
          title="Finalizar Onboarding Básico"
          subtitle="Revisa tu información y completa el registro de tu perfil"
          currentStep={5}
          totalSteps={5}
          icon="checkmark-circle"
          backPath={getBackPath()}
        />

        <View style={styles.resumenContainer}>
          <View style={styles.seccionResumen}>
            <View style={styles.seccionHeader}>
              <Ionicons 
                name={datosCompletos.tipo === 'taller' ? 'business' : 'person'} 
                size={24} 
                color="#3498db" 
              />
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
              <Ionicons name="build" size={24} color="#27ae60" />
              <Text style={styles.seccionTitulo}>Especialidades</Text>
            </View>
            <Text style={styles.estadisticaValor}>
              {Array.isArray(datosCompletos.especialidades) ? datosCompletos.especialidades.length : 0} especialidades seleccionadas
            </Text>
          </View>

          <View style={styles.seccionResumen}>
            <View style={styles.seccionHeader}>
              <Ionicons name="car" size={24} color="#e74c3c" />
              <Text style={styles.seccionTitulo}>Marcas de Vehículos</Text>
            </View>
            <Text style={styles.estadisticaValor}>
              {Array.isArray(datosCompletos.marcas) ? datosCompletos.marcas.length : 0} marcas seleccionadas
            </Text>
          </View>
        </View>

        <View style={styles.infoContainer}>
          <Ionicons name="information-circle" size={24} color="#3498db" />
          <View style={styles.infoTexto}>
            <Text style={styles.infoTitle}>¿Qué sigue?</Text>
            <Text style={styles.infoDescription}>
              Completaremos tu registro básico y luego te guiaremos para subir tus documentos. 
              Una vez completado, nuestro equipo revisará tu información para activar tu cuenta.
            </Text>
          </View>
        </View>

        {isSubmitting && progresoSubida && (
          <View style={styles.progresoContainer}>
            <ActivityIndicator size="small" color="#3498db" />
            <Text style={styles.progresoTexto}>{progresoSubida}</Text>
          </View>
        )}

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.finalizarButton, isSubmitting && styles.buttonDisabled]}
            onPress={finalizarOnboardingBasico}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting && (
              <ActivityIndicator 
                size="small" 
                color="white" 
                style={styles.buttonLoader}
              />
            )}
            <Text style={styles.finalizarButtonText}>
              {isSubmitting ? 'Procesando...' : 'Completar Onboarding Básico'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#5d6d7e',
  },
  scrollContainer: {
    padding: 20,
  },
  resumenContainer: {
    marginBottom: 20,
  },
  seccionResumen: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  seccionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  seccionTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
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
    color: '#5d6d7e',
    fontWeight: '500',
  },
  datoValor: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'right',
  },
  estadisticaValor: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: 'bold',
  },
  infoContainer: {
    flexDirection: 'row',
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    padding: 15,
    marginBottom: 25,
    alignItems: 'flex-start',
  },
  infoTexto: {
    flex: 1,
    marginLeft: 15,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  infoDescription: {
    fontSize: 14,
    color: '#5d6d7e',
    lineHeight: 20,
  },
  progresoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  progresoTexto: {
    marginLeft: 10,
    fontSize: 14,
    color: '#3498db',
    fontWeight: '500',
  },
  buttonContainer: {
    marginTop: 10,
  },
  finalizarButton: {
    backgroundColor: '#3498db',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  buttonDisabled: {
    backgroundColor: '#bdc3c7',
  },
  buttonLoader: {
    marginRight: 10,
  },
  finalizarButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 