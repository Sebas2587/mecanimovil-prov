import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { onboardingAPI, tallerAPI, mecanicoAPI, especialidadesAPI, authAPI, serviciosAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useOnboardingDraft } from '@/context/OnboardingDraftContext';
import OnboardingHeader from '@/components/OnboardingHeader';
import {
  OnboardingScreenLayout,
  OnboardingPrimaryButton,
  OnboardingNotice,
} from '@/components/onboarding';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { COLORS } from '@/app/design-system/tokens';
import { Card } from '@/app/design-system/components';
import { onboardingStyles } from '@/app/design-system/styles/onboarding';
import { showAlert, showAlertButtons } from '@/utils/platformAlert';
import { appendOnboardingParams, finalizarBasicoStep } from '@/utils/onboardingNavigation';
import {
  buildFinalizarDatosFromDraft,
  mergeRouteParamsIntoDraft,
  type FinalizarBasicoDatos,
} from '@/utils/onboardingDraftParams';

const I = COLORS.institutional;

export default function FinalizarBasicoScreen() {
  const rawParams = useLocalSearchParams();
  const { tipo, especialidades, marcas, servicios_seleccionados, es_multimarca, ...otherParams } = rawParams;
  const router = useRouter();
  const { usuario, refrescarEstadoProveedor } = useAuth();
  const { draft, patchDraft, resetDraft } = useOnboardingDraft();

  const draftRef = useRef(draft);
  draftRef.current = draft;

  useFocusEffect(
    useCallback(() => {
      const partial = mergeRouteParamsIntoDraft(
        draftRef.current,
        rawParams as Record<string, string | string[] | undefined>,
      );
      if (Object.keys(partial).length > 0) {
        patchDraft(partial);
      }
    }, [patchDraft, rawParams]),
  );

  const datosCompletos = useMemo(
    () =>
      buildFinalizarDatosFromDraft(
        draft,
        rawParams as Record<string, string | string[] | undefined>,
      ),
    [draft, rawParams],
  );

  const esMultimarca = datosCompletos.es_multimarca;
  const pasoFinalizar = finalizarBasicoStep(esMultimarca);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progresoSubida, setProgresoSubida] = useState<string>('');

  const validarDatos = (datos: FinalizarBasicoDatos) => {
    try {
      if (!datos.tipo || (datos.tipo !== 'taller' && datos.tipo !== 'mecanico')) {
        showAlert('Datos incompletos', 'Tipo de proveedor no válido. Vuelve al paso 1.');
        return false;
      }

      const errores: string[] = [];

      if (!datos.nombre?.trim()) {
        errores.push('Nombre es requerido');
      }
      if (!datos.telefono?.trim()) {
        errores.push('Teléfono es requerido');
      }

      if (datos.tipo === 'taller') {
        if (!datos.rut?.trim()) {
          errores.push('RUT/CUIT es requerido para la identificación fiscal del taller');
        }
        if (!datos.direccion?.trim()) {
          errores.push('Dirección es requerida para ubicar tu taller');
        }
      }

      if (datos.tipo === 'mecanico') {
        if (!datos.dni?.trim()) {
          errores.push('DNI/RUT personal es requerido para tu identificación');
        }
        if (!datos.experiencia_anos?.trim()) {
          errores.push('Años de experiencia son requeridos para validar tu competencia');
        }
      }

      if (datos.servicios_seleccionados.length === 0) {
        errores.push(
          'Debes seleccionar al menos un servicio en el paso de catálogo. Vuelve atrás y marca los servicios que ofreces.',
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

  const guardarEspecialidadesYMarcas = async (datos: FinalizarBasicoDatos) => {
    try {
      console.log('Iniciando guardado de especialidades y marcas:', {
        especialidades: datos.especialidades.length,
        marcas: datos.marcas.length,
        tipo: datos.tipo,
      });

      if (datos.especialidades.length > 0) {
        try {
          setProgresoSubida('Guardando especialidades...');
          await especialidadesAPI.actualizarEspecialidades(datos.especialidades);
        } catch (error: any) {
          throw new Error(`Error al guardar especialidades: ${error.response?.data?.error || error.message || 'Error desconocido'}`);
        }
      }

      const tipoCoberturasMarca = datos.tipo_cobertura_marca;
      const tieneCoberturaMarca = tipoCoberturasMarca === 'multimarca' || datos.marcas.length > 0;

      if (tieneCoberturaMarca) {
        try {
          setProgresoSubida('Guardando cobertura de marcas...');
          const marcasFinal = tipoCoberturasMarca === 'multimarca' ? [] : datos.marcas;

          if (datos.tipo === 'taller') {
            await tallerAPI.actualizarMarcas(marcasFinal, tipoCoberturasMarca);
          } else {
            await mecanicoAPI.actualizarMarcas(marcasFinal, tipoCoberturasMarca);
          }
        } catch (error: any) {
          throw new Error(`Error al guardar marcas: ${error.response?.data?.error || error.message || 'Error desconocido'}`);
        }
      }

      if (datos.servicios_seleccionados.length > 0) {
        try {
          setProgresoSubida('Guardando catálogo de servicios…');
          const payload = datos.servicios_seleccionados.map((item) => ({
            servicio_id: item.servicioId,
            marca_id: item.marcaId === 0 ? null : item.marcaId,
          }));
          await serviciosAPI.crearCatalogoInicial(payload);
        } catch (error: any) {
          console.warn('⚠️ No se pudo guardar el catálogo inicial:', error?.response?.data || error?.message);
        }
      }
    } catch (error: any) {
      console.error('Error en guardarEspecialidadesYMarcas:', error);
      throw error;
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

    if (!validarDatos(datosCompletos) || !usuario) {
      console.error('❌ Validación fallida o usuario no encontrado');
      showAlert('Error', 'Faltan datos requeridos o no se encontró información del usuario');
      return;
    }

    const datos = datosCompletos;

    setIsSubmitting(true);
    let pasoCompletado = 0;
    
    try {
      // 1. Verificar si ya existe un perfil del proveedor
      pasoCompletado = 1;
      setProgresoSubida('Verificando perfil existente...');
      console.log('🔍 Paso 1: Verificando perfil existente...');
      
      let tienePerfilDelTipo = false;
      let estadoActual: { tiene_perfil?: boolean; tipo_proveedor?: string } | null = null;

      try {
        estadoActual = await authAPI.obtenerEstadoProveedor();
        tienePerfilDelTipo =
          !!estadoActual?.tiene_perfil && estadoActual?.tipo_proveedor === datos.tipo;
        console.log('✅ Estado proveedor:', estadoActual?.tipo_proveedor, 'objetivo:', datos.tipo);
      } catch (error: any) {
        if (error.response?.status === 404) {
          tienePerfilDelTipo = false;
        } else {
          throw error;
        }
      }

      let perfilCreado = false;

      if (!tienePerfilDelTipo) {
        // 2. Crear el perfil del proveedor solo si no existe
        pasoCompletado = 2;
        setProgresoSubida('Creando perfil...');
        console.log('🏗️ Paso 2: Creando perfil del proveedor...');
        
        const descripcionInicial = datos.descripcion?.trim() ||
          (datos.tipo === 'taller'
            ? 'Taller mecánico especializado en servicios automotrices'
            : 'Mecánico a domicilio con experiencia en servicios automotrices');

        const datosInicializacion: Record<string, unknown> = {
          tipo_proveedor: datos.tipo,
          nombre: datos.nombre,
          telefono: datos.telefono,
          descripcion: descripcionInicial,
        };

        if (datos.tipo === 'taller') {
          datosInicializacion.rut = datos.rut;
          datosInicializacion.direccion = datos.direccion;
        } else {
          datosInicializacion.dni = datos.dni;
          const experienciaParsed = parseInt(String(datos.experiencia_anos), 10);
          datosInicializacion.experiencia_anos = Number.isFinite(experienciaParsed) ? experienciaParsed : 0;
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
      
      const descripcionValidada = datos.descripcion?.trim() ||
        (datos.tipo === 'taller'
          ? 'Taller mecánico especializado en servicios automotrices'
          : 'Mecánico a domicilio con experiencia en servicios automotrices');
      
      if (!descripcionValidada || descripcionValidada.trim().length === 0) {
        throw new Error('La descripción es requerida para completar el onboarding. Por favor, vuelve a la pantalla de información básica y completa la descripción.');
      }
      
      try {
        const datosActualizacion = {
          nombre: datos.nombre,
          telefono: datos.telefono,
          descripcion: descripcionValidada,
        };

        if (datos.tipo === 'taller') {
          await tallerAPI.actualizarPerfilExistente({
            ...datosActualizacion,
            rut: datos.rut,
            direccion: datos.direccion,
          });

          const lat = datos.direccion_lat;
          const lng = datos.direccion_lng;
          if (typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng)) {
            await tallerAPI.actualizarUbicacionDomicilio({
              direccion: datos.direccion,
              latitud: lat,
              longitud: lng,
            });
          }
        } else {
          const experienciaParsed = parseInt(String(datos.experiencia_anos), 10);
          await mecanicoAPI.actualizarPerfilExistente({
            ...datosActualizacion,
            dni: datos.dni,
            experiencia_anos: Number.isFinite(experienciaParsed) ? experienciaParsed : 0,
          });
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
      await guardarEspecialidadesYMarcas(datos);
      console.log('✅ Especialidades y marcas guardadas exitosamente');

      // 5. Completar el onboarding
      pasoCompletado = 5;
      setProgresoSubida('Finalizando onboarding básico...');
      console.log('🏁 Paso 5: Completando onboarding básico...');
      
      let onboardingCompletado = false;
      let resultadoOnboarding: any = null;
      try {
        resultadoOnboarding = await onboardingAPI.completarOnboarding(datos.tipo);
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
        ? `Tu perfil de ${datos.tipo === 'taller' ? 'taller mecánico' : 'mecánico a domicilio'} ha sido creado exitosamente.`
        : 'Tu información de onboarding ha sido actualizada exitosamente.';
        
      showAlertButtons(
        '🎉 Onboarding Completado',
        `${mensajeExito}\n\nAhora necesitas completar tu documentación para activar tu cuenta y empezar a recibir órdenes de servicio.`,
        [
          {
            text: 'Subir Documentos',
            onPress: () => {
              console.log('🏠 Navegando a subir documentos...');
              resetDraft();
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
          await guardarEspecialidadesYMarcas(datos);
          console.log('🏁 Completando onboarding para perfil existente...');
          await onboardingAPI.completarOnboarding(datos.tipo);
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

  if (!datosCompletos.tipo) {
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
          <Card elevated padding="host" style={styles.seccionResumen}>
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
          </Card>

          <Card elevated padding="host" style={styles.seccionResumen}>
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
          </Card>

          <Card elevated padding="host" style={styles.seccionResumen}>
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
          </Card>

          <Card elevated padding="host" style={styles.seccionResumen}>
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
          </Card>
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