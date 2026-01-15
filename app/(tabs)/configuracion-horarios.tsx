import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
  Modal,
  TextInput,
  Dimensions,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { Stack, router } from 'expo-router';
import { horariosAPI, type HorarioProveedor, type ConfiguracionSemanal } from '@/services/api';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';
import { useTheme } from '@/app/design-system/theme/useTheme';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, BORDERS } from '@/app/design-system/tokens';
import Header from '@/components/Header';

const { width: screenWidth } = Dimensions.get('window');

interface HorarioDia extends HorarioProveedor {
  editado?: boolean;
}

interface ModalEditarDia {
  visible: boolean;
  diaIndex: number;
  horario: HorarioDia | null;
}

// Componente TimePicker moderno - Igual diseño que FormularioOferta
const TimePicker = ({ value, onTimeChange, label, primaryColor = '#003459' }: { 
  value: string; 
  onTimeChange: (time: string) => void; 
  label: string;
  primaryColor?: string;
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const theme = useTheme();
  
  // Obtener valores del sistema de diseño
  const bgDefault = (theme?.colors?.background as any)?.default || COLORS?.background?.default || '#F5F7F8';
  const textPrimary = theme?.colors?.text?.primary || COLORS?.text?.primary || '#00171F';
  const borderLight = (theme?.colors?.border as any)?.light || COLORS?.border?.light || '#D7DFE3';
  const spacingMd = theme?.spacing?.md || SPACING?.md || 16;
  const spacingSm = theme?.spacing?.sm || SPACING?.sm || 8;
  const cardRadius = (theme?.borders?.radius as any)?.lg || BORDERS?.radius?.lg || 12;
  const fontSizeBase = theme?.typography?.fontSize?.base || TYPOGRAPHY?.fontSize?.base || 14;
  const fontWeightSemibold = theme?.typography?.fontWeight?.semibold || TYPOGRAPHY?.fontWeight?.semibold || '600';
  
  const timeToDate = (timeString: string): Date => {
    // Si el valor está vacío o es inválido, usar hora por defecto
    if (!timeString || timeString.trim() === '' || !timeString.includes(':')) {
      const date = new Date();
      date.setHours(8, 0, 0, 0);
      return date;
    }
    
    try {
      const parts = timeString.split(':');
      const hours = parseInt(parts[0] || '8', 10);
      const minutes = parseInt(parts[1] || '0', 10);
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      return date;
    } catch (error) {
      console.error('Error convirtiendo hora a Date:', error, 'timeString:', timeString);
      const date = new Date();
      date.setHours(8, 0, 0, 0);
      return date;
    }
  };
  
  const dateToTime = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };
  
  const handleTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    
    if (selectedTime) {
      const timeString = dateToTime(selectedTime);
      onTimeChange(timeString);
    }
  };
  
  const formatDisplayTime = (time: string) => {
    if (!time || time.trim() === '') {
      return '--:--';
    }
    
    try {
      // Asegurar que el formato sea HH:MM
      const parts = time.split(':');
      if (parts.length !== 2) {
        return time; // Si no tiene formato correcto, devolver tal cual
      }
      
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      
      // Validar que sean números válidos
      if (isNaN(hours) || isNaN(minutes)) {
        return time;
      }
      
      // Formatear con padding para asegurar 2 dígitos
      const hoursStr = hours.toString().padStart(2, '0');
      const minutesStr = minutes.toString().padStart(2, '0');
      
      return `${hoursStr}:${minutesStr}`;
    } catch (error) {
      console.error('Error formateando hora:', error, 'time:', time);
      return time || '--:--';
    }
  };

  return (
    <View style={{ marginBottom: spacingMd }}>
      <TouchableOpacity 
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: bgDefault,
          borderRadius: cardRadius / 2,
          padding: spacingMd - 2,
          borderWidth: 1,
          borderColor: borderLight,
        }}
        onPress={() => setShowPicker(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="time" size={20} color={primaryColor} />
        <Text 
          style={{
            fontSize: fontSizeBase,
            fontWeight: fontWeightSemibold,
            color: textPrimary,
            flex: 1,
            marginHorizontal: spacingMd,
            textAlign: 'left',
            minWidth: 60,
          }}
          numberOfLines={1}
        >
          {formatDisplayTime(value || '08:00')}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#666E7A" />
      </TouchableOpacity>
      
      {showPicker && (
        <DateTimePicker
          value={timeToDate(value || '08:00')}
          mode="time"
          is24Hour={true}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleTimeChange}
          style={Platform.OS === 'ios' ? { width: '100%', marginTop: spacingSm } : undefined}
        />
      )}
      
      {Platform.OS === 'ios' && showPicker && (
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: spacingMd }}>
          <TouchableOpacity
            style={{
              paddingVertical: spacingSm,
              paddingHorizontal: 24,
              borderRadius: cardRadius,
              backgroundColor: primaryColor,
            }}
            onPress={() => setShowPicker(false)}
            activeOpacity={0.8}
          >
            <Text style={{ color: '#FFFFFF', fontSize: fontSizeBase, fontWeight: fontWeightSemibold }}>
              Confirmar
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

// Componente NumberPicker moderno - Usando sistema de diseño
const NumberPicker = ({ value, onValueChange, label, unit, options, primaryColor = '#003459' }: {
  value: number;
  onValueChange: (value: number) => void;
  label: string;
  unit: string;
  options: number[];
  primaryColor?: string;
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const theme = useTheme();
  
  // Obtener valores del sistema de diseño
  const bgDefault = (theme?.colors?.background as any)?.default || COLORS?.background?.default || '#F5F7F8';
  const textPrimary = theme?.colors?.text?.primary || COLORS?.text?.primary || '#00171F';
  const borderLight = (theme?.colors?.border as any)?.light || COLORS?.border?.light || '#D7DFE3';
  const spacingMd = theme?.spacing?.md || SPACING?.md || 16;
  const spacingSm = theme?.spacing?.sm || SPACING?.sm || 8;
  const cardRadius = (theme?.borders?.radius as any)?.lg || BORDERS?.radius?.lg || 12;
  const fontSizeBase = theme?.typography?.fontSize?.base || TYPOGRAPHY?.fontSize?.base || 14;
  const fontWeightSemibold = theme?.typography?.fontWeight?.semibold || TYPOGRAPHY?.fontWeight?.semibold || '600';
  const fontWeightMedium = theme?.typography?.fontWeight?.medium || TYPOGRAPHY?.fontWeight?.medium || '500';
  
  return (
    <View style={{ marginBottom: spacingMd }}>
      <TouchableOpacity 
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: bgDefault,
          borderRadius: cardRadius / 2,
          padding: spacingMd - 2,
          borderWidth: 1,
          borderColor: borderLight,
        }}
        onPress={() => setShowPicker(!showPicker)}
        activeOpacity={0.8}
      >
        <Ionicons name="timer" size={20} color={primaryColor} />
        <Text style={{
          fontSize: fontSizeBase,
          fontWeight: fontWeightSemibold,
          color: textPrimary,
          flex: 1,
          marginHorizontal: spacingMd,
        }}>
          {value} {unit}
        </Text>
        <Ionicons 
          name={showPicker ? "chevron-up" : "chevron-down"} 
          size={20} 
          color="#666E7A" 
        />
      </TouchableOpacity>
      
      {showPicker && (
        <View style={{
          backgroundColor: bgDefault,
          borderRadius: cardRadius / 2,
          borderWidth: 1,
          borderColor: borderLight,
          marginTop: spacingSm,
          padding: spacingSm,
          maxHeight: 200,
        }}>
          {options.map((option) => (
            <TouchableOpacity
              key={option}
              style={{
                paddingVertical: spacingMd - 2,
                paddingHorizontal: spacingMd,
                borderRadius: cardRadius / 2,
                marginVertical: 2,
                backgroundColor: option === value ? primaryColor : 'transparent',
              }}
              onPress={() => {
                onValueChange(option);
                setShowPicker(false);
              }}
              activeOpacity={0.8}
            >
              <Text style={{
                fontSize: fontSizeBase,
                fontWeight: option === value ? fontWeightSemibold : fontWeightMedium,
                color: option === value ? '#FFFFFF' : textPrimary,
                textAlign: 'center',
              }}>
                {option} {unit}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

export default function ConfiguracionHorariosScreen() {
  const { estadoProveedor, usuario, obtenerNombreProveedor } = useAuth();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  
  // Obtener valores seguros del tema con fallbacks
  const safeColors = useMemo(() => {
    return theme?.colors || COLORS || {};
  }, [theme]);

  const safeSpacing = useMemo(() => {
    return theme?.spacing || SPACING || {};
  }, [theme]);

  const safeTypography = useMemo(() => {
    return theme?.typography || TYPOGRAPHY || {};
  }, [theme]);

  const safeShadows = useMemo(() => {
    return theme?.shadows || SHADOWS || {};
  }, [theme]);

  const safeBorders = useMemo(() => {
    return theme?.borders || BORDERS || {};
  }, [theme]);
  
  // Estados principales
  const [horarios, setHorarios] = useState<HorarioDia[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Estados para modal de edición
  const [modalEditarDia, setModalEditarDia] = useState<ModalEditarDia>({
    visible: false,
    diaIndex: -1,
    horario: null,
  });
  const [horariosTemp, setHorariosTemp] = useState({
    hora_inicio: '',
    hora_fin: '',
    duracion_slot: 60,
    tiempo_descanso: 0,
  });

  const diasSemana = [
    { id: 0, nombre: 'Lunes', corto: 'Lun', emoji: '📅' },
    { id: 1, nombre: 'Martes', corto: 'Mar', emoji: '📅' },
    { id: 2, nombre: 'Miércoles', corto: 'Mié', emoji: '📅' },
    { id: 3, nombre: 'Jueves', corto: 'Jue', emoji: '📅' },
    { id: 4, nombre: 'Viernes', corto: 'Vie', emoji: '📅' },
    { id: 5, nombre: 'Sábado', corto: 'Sáb', emoji: '📅' },
    { id: 6, nombre: 'Domingo', corto: 'Dom', emoji: '📅' },
  ];

  const horariosPreset = {
    comercial: {
      hora_inicio: '08:00',
      hora_fin: '18:00',
      dias: [0, 1, 2, 3, 4], // Lunes a Viernes
      duracion_slot: 60,
      tiempo_descanso: 0,
    },
    extendido: {
      hora_inicio: '07:00',
      hora_fin: '19:00',
      dias: [0, 1, 2, 3, 4, 5], // Lunes a Sábado
      duracion_slot: 60,
      tiempo_descanso: 0,
    },
    completo: {
      hora_inicio: '08:00',
      hora_fin: '17:00',
      dias: [0, 1, 2, 3, 4, 5, 6], // Todos los días
      duracion_slot: 60,
      tiempo_descanso: 0,
    },
  };

  useEffect(() => {
    if (!estadoProveedor?.verificado) {
      Alert.alert(
        'Acceso Restringido',
        'Solo los proveedores verificados pueden configurar sus horarios.',
        [{ text: 'Entendido', onPress: () => router.back() }]
      );
      return;
    }
    
    cargarHorarios();
  }, [estadoProveedor]);

  const cargarHorarios = async () => {
    try {
      setLoading(true);
      const horariosData = await horariosAPI.obtenerMisHorarios();
      
      // Si no hay horarios configurados, crear estructura por defecto
      if (horariosData.length === 0) {
        const horariosDefault = diasSemana.map(dia => ({
          dia_semana: dia.id,
          dia_nombre: dia.nombre,
          activo: dia.id < 5, // Lunes a Viernes activos por defecto
          hora_inicio: '08:00',
          hora_fin: '18:00',
          duracion_slot: 60,
          tiempo_descanso: 0,
          editado: false,
        }));
        setHorarios(horariosDefault);
      } else {
        // Asegurar que todos los días estén presentes
        const horariosCompletos = diasSemana.map(dia => {
          const horarioExistente = horariosData.find(h => h.dia_semana === dia.id);
          return horarioExistente || {
            dia_semana: dia.id,
            dia_nombre: dia.nombre,
            activo: false,
            hora_inicio: '08:00',
            hora_fin: '18:00',
            duracion_slot: 60,
            tiempo_descanso: 0,
            editado: false,
          };
        });
        setHorarios(horariosCompletos);
      }
    } catch (error) {
      console.error('Error cargando horarios:', error);
      Alert.alert('Error', 'No se pudieron cargar los horarios configurados.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    cargarHorarios();
  };


  const toggleDiaActivo = (diaIndex: number) => {
    const nuevosHorarios = [...horarios];
    nuevosHorarios[diaIndex] = {
      ...nuevosHorarios[diaIndex],
      activo: !nuevosHorarios[diaIndex].activo,
      editado: true,
    };
    setHorarios(nuevosHorarios);
    setHasChanges(true);
  };

  const abrirModalEditarDia = (diaIndex: number) => {
    const horario = horarios[diaIndex];
    // Asegurar que las horas tengan formato válido
    const horaInicio = horario.hora_inicio && horario.hora_inicio.trim() !== '' 
      ? horario.hora_inicio 
      : '08:00';
    const horaFin = horario.hora_fin && horario.hora_fin.trim() !== '' 
      ? horario.hora_fin 
      : '18:00';
    
    setHorariosTemp({
      hora_inicio: horaInicio,
      hora_fin: horaFin,
      duracion_slot: horario.duracion_slot || 60,
      tiempo_descanso: horario.tiempo_descanso || 0,
    });
    setModalEditarDia({
      visible: true,
      diaIndex,
      horario,
    });
  };

  const cerrarModalEditarDia = () => {
    setModalEditarDia({
      visible: false,
      diaIndex: -1,
      horario: null,
    });
  };

  const guardarCambiosDia = () => {
    if (modalEditarDia.diaIndex === -1) return;

    // Validar horarios
    if (horariosTemp.hora_inicio >= horariosTemp.hora_fin) {
      Alert.alert('Error', 'La hora de inicio debe ser menor que la hora de fin.');
      return;
    }

    const nuevosHorarios = [...horarios];
    nuevosHorarios[modalEditarDia.diaIndex] = {
      ...nuevosHorarios[modalEditarDia.diaIndex],
      hora_inicio: horariosTemp.hora_inicio,
      hora_fin: horariosTemp.hora_fin,
      duracion_slot: horariosTemp.duracion_slot,
      tiempo_descanso: horariosTemp.tiempo_descanso,
      editado: true,
    };
    
    setHorarios(nuevosHorarios);
    setHasChanges(true);
    cerrarModalEditarDia();
  };

  const aplicarPreset = (presetName: keyof typeof horariosPreset) => {
    const preset = horariosPreset[presetName];
    
    Alert.alert(
      'Aplicar Configuración Predefinida',
      `¿Deseas aplicar la configuración "${presetName}"? Esto reemplazará tu configuración actual.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aplicar',
          onPress: () => {
            const nuevosHorarios = horarios.map(horario => ({
              ...horario,
              activo: preset.dias.includes(horario.dia_semana),
              hora_inicio: preset.hora_inicio,
              hora_fin: preset.hora_fin,
              duracion_slot: preset.duracion_slot,
              tiempo_descanso: preset.tiempo_descanso,
              editado: true,
            }));
            setHorarios(nuevosHorarios);
            setHasChanges(true);
          },
        },
      ]
    );
  };

  const formatearHora = (hora: string) => {
    try {
      return new Date(`2023-01-01T${hora}`).toLocaleTimeString('es-CL', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    } catch {
      return hora;
    }
  };

  const guardarCambios = async () => {
    try {
      setSaving(true);
      
      const configuracion: ConfiguracionSemanal = {
        hora_inicio_global: horarios[0]?.hora_inicio || '08:00',
        hora_fin_global: horarios[0]?.hora_fin || '18:00',
        duracion_slot_global: horarios[0]?.duracion_slot || 60,
        tiempo_descanso_global: horarios[0]?.tiempo_descanso || 0,
        dias_habilitados: horarios.filter(h => h.activo).map(h => h.dia_semana),
        eliminar_existente: true,
      };

      // Si hay configuraciones específicas por día, agregarlas
      const configuracionPorDia: { [key: string]: any } = {};
      horarios.forEach(horario => {
        if (horario.activo) {
          configuracionPorDia[horario.dia_semana.toString()] = {
            hora_inicio: horario.hora_inicio,
            hora_fin: horario.hora_fin,
            duracion_slot: horario.duracion_slot,
            tiempo_descanso: horario.tiempo_descanso,
          };
        }
      });
      
      if (Object.keys(configuracionPorDia).length > 0) {
        configuracion.configuracion_por_dia = configuracionPorDia;
      }

      const resultado = await horariosAPI.configurarSemanaCompleta(configuracion);
      
      Alert.alert(
        '✅ Horarios Guardados',
        `Tus horarios han sido actualizados correctamente. ${resultado.dias_activos} días activos configurados.`,
        [{ text: 'Perfecto', style: 'default' }]
      );
      
      setHasChanges(false);
      await cargarHorarios(); // Recargar para obtener los IDs actualizados
      
    } catch (error: any) {
      console.error('Error guardando horarios:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'No se pudieron guardar los horarios. Intenta nuevamente.'
      );
    } finally {
      setSaving(false);
    }
  };

  // Obtener colores del sistema de diseño
  const bgPaper = (safeColors?.background as any)?.paper || (safeColors?.base as any)?.white || '#FFFFFF';
  const bgDefault = (safeColors?.background as any)?.default || '#F5F7F8';
  const textPrimary = safeColors?.text?.primary || (safeColors?.neutral as any)?.inkBlack || '#00171F';
  const textSecondary = safeColors?.text?.secondary || ((safeColors?.neutral as any)?.gray as any)?.[800] || '#3E4F53';
  const textTertiary = safeColors?.text?.tertiary || ((safeColors?.neutral as any)?.gray as any)?.[700] || '#5D6F75';
  const borderLight = (safeColors?.border as any)?.light || ((safeColors?.neutral as any)?.gray as any)?.[200] || '#D7DFE3';
  const primaryObj = safeColors?.primary as any;
  const successObj = safeColors?.success as any;
  const errorObj = safeColors?.error as any;
  const primary500 = primaryObj?.['500'] || (safeColors?.accent as any)?.['500'] || '#003459';
  const success500 = successObj?.main || successObj?.['500'] || '#00C9A7';
  const error500 = errorObj?.main || errorObj?.['500'] || '#FF6B6B';
  const containerHorizontal = safeSpacing?.container?.horizontal || safeSpacing?.content?.horizontal || 18;
  const spacingXs = safeSpacing?.xs || 4;
  const spacingSm = safeSpacing?.sm || 8;
  const spacingMd = safeSpacing?.md || 16;
  const spacingLg = safeSpacing?.lg || 24;
  const cardPadding = safeSpacing?.cardPadding || spacingMd;
  const cardGap = safeSpacing?.cardGap || spacingSm + 4;
  const cardRadius = safeBorders?.radius?.lg || 12;
  const fontSizeBase = safeTypography?.fontSize?.base || 14;
  const fontSizeSm = safeTypography?.fontSize?.sm || 12;
  const fontSizeMd = safeTypography?.fontSize?.md || 16;
  const fontSizeLg = safeTypography?.fontSize?.lg || 18;
  const fontWeightMedium = safeTypography?.fontWeight?.medium || '500';
  const fontWeightSemibold = safeTypography?.fontWeight?.semibold || '600';
  const fontWeightBold = safeTypography?.fontWeight?.bold || '700';
  const shadowSm = safeShadows?.sm || { shadowColor: '#00171F', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 };
  const shadowMd = safeShadows?.md || { shadowColor: '#00171F', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 };

  const renderDiaConfig = (horario: HorarioDia, index: number) => {
    const dia = diasSemana[index];
    
    return (
      <TouchableOpacity 
        key={dia.id} 
        style={[
          styles.modernDiaCard,
          horario.activo && { 
            backgroundColor: (primaryObj?.['50'] || '#E6F0F5') 
          }
        ]}
        onPress={() => horario.activo && abrirModalEditarDia(index)}
        disabled={!horario.activo}
        activeOpacity={0.8}
      >
        <View style={styles.modernDiaHeader}>
          <View style={styles.modernDiaInfo}>
            <View style={[styles.modernDiaIconContainer, { backgroundColor: horario.activo ? primary500 : bgDefault }]}>
              <Text style={styles.modernDiaEmoji}>{dia.emoji}</Text>
            </View>
            <View style={styles.modernDiaTexto}>
              <Text style={[
                styles.modernDiaNombre,
                { color: horario.activo ? primary500 : textPrimary }
              ]}>
                {dia.corto}
              </Text>
            </View>
          </View>
          
          <View style={styles.modernSwitchContainer}>
            <Switch
              value={horario.activo}
              onValueChange={() => toggleDiaActivo(index)}
              trackColor={{ false: borderLight, true: primary500 }}
              thumbColor={horario.activo ? '#FFFFFF' : '#D1D5DB'}
              style={styles.modernSwitch}
            />
          </View>
        </View>
        
        {horario.activo && (
          <View style={styles.modernHorariosConfig}>
            <View style={styles.modernTiemposContainer}>
              <View style={styles.modernTiempoCard}>
                <Ionicons name="play" size={14} color={success500} />
                <Text style={[styles.modernTiempoValue, { color: textPrimary }]}>{formatearHora(horario.hora_inicio)}</Text>
              </View>
              
              <Ionicons name="arrow-forward" size={12} color={textTertiary} />
              
              <View style={styles.modernTiempoCard}>
                <Ionicons name="stop" size={14} color={error500} />
                <Text style={[styles.modernTiempoValue, { color: textPrimary }]}>{formatearHora(horario.hora_fin)}</Text>
              </View>
            </View>
            
            <View style={styles.modernConfigSlots}>
              <Text style={[styles.modernSlotInfo, { color: textTertiary }]}>
                {horario.duracion_slot} min
                {horario.tiempo_descanso > 0 && ` • ${horario.tiempo_descanso} min desc`}
              </Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderModalEditarDia = () => (
    <Modal
      visible={modalEditarDia.visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={[styles.modernModalContainer, { backgroundColor: bgDefault }]}>
        <View style={[styles.modernModalHeader, { backgroundColor: bgPaper, borderBottomColor: borderLight }]}>
          <TouchableOpacity onPress={cerrarModalEditarDia} activeOpacity={0.8}>
            <Ionicons name="close" size={24} color={textTertiary} />
          </TouchableOpacity>
          <Text style={[styles.modernModalTitle, { color: textPrimary }]}>
            Configurar {modalEditarDia.horario?.dia_nombre || ''}
          </Text>
          <TouchableOpacity 
            onPress={guardarCambiosDia} 
            style={[styles.modernModalSaveButton, { backgroundColor: primary500 }]} 
            activeOpacity={0.8}
          >
            <Text style={styles.modernModalSaveText}>Guardar</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modernModalContent} showsVerticalScrollIndicator={false}>
          {/* Horarios */}
          <View style={[styles.modernModalSection, { backgroundColor: bgPaper, borderColor: borderLight }]}>
            <Text style={[styles.modernModalSectionTitle, { color: textPrimary }]}>⏰ Horarios de Atención</Text>
            
            <View style={styles.modernModalRow}>
              <View style={styles.modernModalCol}>
                <Text style={[styles.modernModalLabel, { color: textSecondary }]}>Hora de Inicio</Text>
                <TimePicker
                  value={horariosTemp.hora_inicio || '08:00'}
                  onTimeChange={(time) => {
                    console.log('🕐 Hora inicio cambiada:', time);
                    setHorariosTemp(prev => ({ ...prev, hora_inicio: time }));
                  }}
                  label="Hora de Inicio"
                  primaryColor={primary500}
                />
              </View>
              
              <View style={styles.modernModalCol}>
                <Text style={[styles.modernModalLabel, { color: textSecondary }]}>Hora de Fin</Text>
                <TimePicker
                  value={horariosTemp.hora_fin || '18:00'}
                  onTimeChange={(time) => {
                    console.log('🕐 Hora fin cambiada:', time);
                    setHorariosTemp(prev => ({ ...prev, hora_fin: time }));
                  }}
                  label="Hora de Fin"
                  primaryColor={primary500}
                />
              </View>
            </View>
          </View>

          {/* Configuración de Slots */}
          <View style={[styles.modernModalSection, { backgroundColor: bgPaper, borderColor: borderLight }]}>
            <Text style={[styles.modernModalSectionTitle, { color: textPrimary }]}>🗓️ Configuración de Citas</Text>
            
            <View style={styles.modernModalRow}>
              <View style={styles.modernModalCol}>
                <Text style={[styles.modernModalLabel, { color: textSecondary }]}>Duración por Cita</Text>
                <NumberPicker
                  value={horariosTemp.duracion_slot}
                  onValueChange={(value) => setHorariosTemp(prev => ({ ...prev, duracion_slot: value }))}
                  label="Duración por Cita"
                  unit="min"
                  options={[30, 45, 60, 90, 120]}
                  primaryColor={primary500}
                />
              </View>
              
              <View style={styles.modernModalCol}>
                <Text style={[styles.modernModalLabel, { color: textSecondary }]}>Tiempo de Descanso</Text>
                <NumberPicker
                  value={horariosTemp.tiempo_descanso}
                  onValueChange={(value) => setHorariosTemp(prev => ({ ...prev, tiempo_descanso: value }))}
                  label="Tiempo de Descanso"
                  unit="min"
                  options={[0, 5, 10, 15, 20, 30]}
                  primaryColor={primary500}
                />
              </View>
            </View>
          </View>

          {/* Vista previa */}
          <View style={[styles.modernModalSection, { backgroundColor: bgPaper, borderColor: borderLight }]}>
            <Text style={[styles.modernModalSectionTitle, { color: textPrimary }]}>👁️ Vista Previa</Text>
            <View style={[styles.modernPreviewContainer, { backgroundColor: bgDefault, borderColor: borderLight }]}>
              <View style={styles.modernPreviewRow}>
                <Ionicons name="time" size={18} color={primary500} />
                <Text style={[styles.modernPreviewText, { color: textPrimary }]}>
                  Horario: {formatearHora(horariosTemp.hora_inicio)} - {formatearHora(horariosTemp.hora_fin)}
                </Text>
              </View>
              <View style={styles.modernPreviewRow}>
                <Ionicons name="calendar" size={18} color={success500} />
                <Text style={[styles.modernPreviewText, { color: textPrimary }]}>
                  Duración por cita: {horariosTemp.duracion_slot} minutos
                </Text>
              </View>
              {horariosTemp.tiempo_descanso > 0 && (
                <View style={styles.modernPreviewRow}>
                  <Ionicons name="pause" size={18} color={primary500} />
                  <Text style={[styles.modernPreviewText, { color: textPrimary }]}>
                    Tiempo de descanso: {horariosTemp.tiempo_descanso} minutos
                  </Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: bgDefault }]}>
        <Header 
          title="Horarios de Trabajo"
          showBack
          onBackPress={() => router.back()}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={primary500} />
          <Text style={[styles.loadingText, { color: textTertiary }]}>Cargando horarios...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: bgDefault }]}>
      <Stack.Screen
        options={{
          title: 'Horarios de Trabajo',
          headerShown: false,
        }}
      />
      
      <Header 
        title="Horarios de Trabajo"
        showBack
        onBackPress={() => router.back()}
      />
      
      <ScrollView 
        style={styles.scrollContainer} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + (hasChanges ? 100 : 20) }}
      >
        <View style={[styles.content, { paddingHorizontal: containerHorizontal }]}>
          {/* Información contextual - UI Card */}
          <View style={styles.uiCard}>
            <View style={styles.infoCardContent}>
              <Ionicons name="information-circle" size={20} color={primary500} />
              <Text style={[styles.infoText, { color: textPrimary }]}>
                Define tus horarios de atención para cada día de la semana. Los clientes podrán agendar servicios en estos horarios.
              </Text>
            </View>
          </View>

          {/* Configuraciones rápidas - UI Card */}
          <View style={styles.uiCard}>
            <Text style={[styles.sectionTitle, { color: textPrimary }]}>⚡ Configuraciones Rápidas</Text>
            <View style={styles.modernPresetsGrid}>
              <TouchableOpacity
                style={styles.modernPresetCard}
                onPress={() => aplicarPreset('comercial')}
                activeOpacity={0.8}
              >
                <Ionicons name="business" size={20} color={primary500} />
                <Text style={[styles.modernPresetTitle, { color: textPrimary }]}>Comercial</Text>
                <Text style={[styles.modernPresetSubtitle, { color: textTertiary }]}>Lun-Vie</Text>
                <Text style={[styles.modernPresetTime, { color: primary500 }]}>8:00-18:00</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modernPresetCard}
                onPress={() => aplicarPreset('extendido')}
                activeOpacity={0.8}
              >
                <Ionicons name="time" size={20} color={success500} />
                <Text style={[styles.modernPresetTitle, { color: textPrimary }]}>Extendido</Text>
                <Text style={[styles.modernPresetSubtitle, { color: textTertiary }]}>Lun-Sáb</Text>
                <Text style={[styles.modernPresetTime, { color: success500 }]}>7:00-19:00</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modernPresetCard}
                onPress={() => aplicarPreset('completo')}
                activeOpacity={0.8}
              >
                <Ionicons name="calendar" size={20} color={primary500} />
                <Text style={[styles.modernPresetTitle, { color: textPrimary }]}>7 Días</Text>
                <Text style={[styles.modernPresetSubtitle, { color: textTertiary }]}>Toda la semana</Text>
                <Text style={[styles.modernPresetTime, { color: primary500 }]}>8:00-17:00</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Configuración por días - UI Card */}
          <View style={styles.uiCard}>
            <Text style={[styles.sectionTitle, { color: textPrimary }]}>📅 Configuración por Día</Text>
            <View style={styles.modernDiasGrid}>
              {horarios.map(renderDiaConfig)}
            </View>
          </View>

          {/* Resumen - UI Card */}
          <View style={styles.uiCard}>
            <Text style={[styles.sectionTitle, { color: textPrimary }]}>📊 Resumen</Text>
            <View style={styles.modernResumenContent}>
              <View style={styles.modernResumenItem}>
                <Ionicons name="checkmark-circle" size={18} color={success500} />
                <Text style={[styles.modernResumenText, { color: textSecondary }]}>
                  Días activos: {horarios.filter(h => h.activo).length}/7
                </Text>
              </View>
              <View style={styles.modernResumenItem}>
                <Ionicons name="time" size={18} color={primary500} />
                <Text style={[styles.modernResumenText, { color: textSecondary }]}>
                  Horario común: {horarios.find(h => h.activo)?.hora_inicio || '--'} - {horarios.find(h => h.activo)?.hora_fin || '--'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Botón guardar flotante */}
      {hasChanges && (
        <SafeAreaView style={styles.modernActionButtonsContainer} edges={['bottom']}>
          <TouchableOpacity
            style={[
              styles.modernSaveButton,
              { backgroundColor: success500, ...shadowMd },
              saving && { opacity: 0.6 }
            ]}
            onPress={guardarCambios}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="checkmark" size={20} color="#FFFFFF" />
            )}
            <Text style={styles.modernSaveButtonText}>
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </Text>
          </TouchableOpacity>
        </SafeAreaView>
      )}

      {/* Modal de edición */}
      {renderModalEditarDia()}
    </View>
  );
}

// Función para crear estilos usando tokens del sistema de diseño
const createStyles = () => {
  const bgPaper = COLORS?.background?.paper || COLORS?.base?.white || '#FFFFFF';
  const bgDefault = COLORS?.background?.default || '#F5F7F8';
  const textPrimary = COLORS?.text?.primary || COLORS?.neutral?.inkBlack || '#00171F';
  const textSecondary = COLORS?.text?.secondary || ((COLORS?.neutral?.gray as any)?.[800]) || '#3E4F53';
  const textTertiary = COLORS?.text?.tertiary || ((COLORS?.neutral?.gray as any)?.[700]) || '#5D6F75';
  const borderLight = COLORS?.border?.light || COLORS?.neutral?.gray?.[200] || '#D7DFE3';
  const spacingXs = SPACING?.xs || 4;
  const spacingSm = SPACING?.sm || 8;
  const spacingMd = SPACING?.md || 16;
  const spacingLg = SPACING?.lg || 24;
  const containerHorizontal = SPACING?.container?.horizontal || SPACING?.content?.horizontal || 18;
  const cardPadding = SPACING?.cardPadding || spacingMd;
  const cardGap = SPACING?.cardGap || spacingSm + 4;
  const cardRadius = BORDERS?.radius?.lg || 12;
  const radiusXl = BORDERS?.radius?.xl || 16;
  const fontSizeBase = TYPOGRAPHY?.fontSize?.base || 14;
  const fontSizeSm = TYPOGRAPHY?.fontSize?.sm || 12;
  const fontSizeMd = TYPOGRAPHY?.fontSize?.md || 16;
  const fontSizeLg = TYPOGRAPHY?.fontSize?.lg || 18;
  const fontWeightMedium = TYPOGRAPHY?.fontWeight?.medium || '500';
  const fontWeightSemibold = TYPOGRAPHY?.fontWeight?.semibold || '600';
  const fontWeightBold = TYPOGRAPHY?.fontWeight?.bold || '700';
  const shadowSm = SHADOWS?.sm || { shadowColor: '#00171F', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 };
  const shadowMd = SHADOWS?.md || { shadowColor: '#00171F', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 };

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: bgDefault,
    },
    scrollContainer: {
      flex: 1,
    },
    content: {
      paddingVertical: spacingMd,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: bgDefault,
    },
    loadingText: {
      marginTop: spacingMd,
      fontSize: fontSizeBase,
    },
    uiCard: {
      backgroundColor: bgPaper,
      borderRadius: radiusXl,
      padding: spacingMd,
      marginBottom: spacingMd,
      ...shadowSm,
      borderWidth: 1,
      borderColor: borderLight,
    },
    infoCardContent: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacingMd,
    },
    infoText: {
      flex: 1,
      fontSize: fontSizeBase,
      lineHeight: fontSizeBase + 6,
    },
    sectionTitle: {
      fontSize: fontSizeLg,
      fontWeight: fontWeightBold,
      marginBottom: spacingMd,
    },

    modernPresetsGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    modernPresetCard: {
      flex: 1,
      backgroundColor: bgPaper,
      borderRadius: radiusXl,
      padding: spacingMd,
      marginHorizontal: spacingXs,
      ...shadowSm,
      borderWidth: 1,
      borderColor: borderLight,
      alignItems: 'center',
    },
    modernPresetTitle: {
      fontSize: fontSizeBase - 1,
      fontWeight: fontWeightSemibold,
      marginTop: spacingSm,
      textAlign: 'center',
    },
    modernPresetSubtitle: {
      fontSize: fontSizeSm - 1,
      marginTop: spacingXs / 2,
      textAlign: 'center',
    },
    modernPresetTime: {
      fontSize: fontSizeSm - 1,
      marginTop: spacingXs / 2,
      fontWeight: fontWeightMedium,
      textAlign: 'center',
    },
    modernDiasGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    modernDiaCard: {
      width: '48%',
      backgroundColor: bgPaper,
      borderRadius: radiusXl,
      padding: spacingMd,
      marginBottom: spacingMd,
      ...shadowSm,
      borderWidth: 1,
      borderColor: borderLight,
      minHeight: 120,
    },
    modernDiaHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacingSm,
    },
    modernDiaInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    modernDiaIconContainer: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacingSm,
    },
    modernDiaEmoji: {
      fontSize: 16,
    },
    modernDiaTexto: {
      flex: 1,
    },
    modernDiaNombre: {
      fontSize: fontSizeBase - 1,
      fontWeight: fontWeightSemibold,
    },
    modernSwitchContainer: {
      alignItems: 'center',
    },
    modernSwitch: {
      transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }],
    },
    modernHorariosConfig: {
      borderTopWidth: 1,
      borderTopColor: borderLight,
      paddingTop: spacingSm,
      marginTop: spacingSm,
    },
    modernTiemposContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacingSm,
      gap: spacingXs,
    },
    modernTiempoCard: {
      flex: 1,
      backgroundColor: bgDefault,
      borderRadius: cardRadius / 2,
      padding: spacingSm,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: borderLight,
      gap: spacingXs / 2,
    },
    modernTiempoValue: {
      fontSize: fontSizeSm,
      fontWeight: fontWeightSemibold,
    },
    modernConfigSlots: {
      alignItems: 'center',
    },
    modernSlotInfo: {
      fontSize: fontSizeSm - 1,
      textAlign: 'center',
    },

    modernResumenContent: {
      gap: spacingSm,
    },
    modernResumenItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacingSm,
    },
    modernResumenText: {
      fontSize: fontSizeBase,
      flex: 1,
    },

    modernActionButtonsContainer: {
      position: 'absolute',
      left: containerHorizontal,
      right: containerHorizontal,
      bottom: spacingMd,
      zIndex: 1000,
    },
    modernSaveButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacingMd,
      paddingHorizontal: spacingLg,
      borderRadius: cardRadius,
      gap: spacingSm,
    },
    modernSaveButtonText: {
      color: '#FFFFFF',
      fontSize: fontSizeBase,
      fontWeight: fontWeightSemibold,
    },

    modernModalContainer: {
      flex: 1,
      backgroundColor: bgDefault,
    },
    modernModalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: containerHorizontal,
      paddingVertical: spacingMd,
      backgroundColor: bgPaper,
      borderBottomWidth: 1,
      borderBottomColor: borderLight,
      ...shadowSm,
    },
    modernModalTitle: {
      fontSize: fontSizeLg,
      fontWeight: fontWeightBold,
      flex: 1,
      textAlign: 'center',
    },
    modernModalSaveButton: {
      paddingVertical: spacingSm,
      paddingHorizontal: spacingLg,
      borderRadius: cardRadius,
    },
    modernModalSaveText: {
      color: '#FFFFFF',
      fontSize: fontSizeBase,
      fontWeight: fontWeightSemibold,
    },
    modernModalContent: {
      flex: 1,
      padding: containerHorizontal,
    },
    modernModalSection: {
      backgroundColor: bgPaper,
      borderRadius: cardRadius,
      padding: cardPadding,
      marginBottom: cardGap,
      borderWidth: 1,
      borderColor: borderLight,
      ...shadowSm,
    },
    modernModalSectionTitle: {
      fontSize: fontSizeMd,
      fontWeight: fontWeightBold,
      marginBottom: spacingMd,
    },
    modernModalRow: {
      flexDirection: 'row',
      gap: spacingMd,
    },
    modernModalCol: {
      flex: 1,
    },
    modernModalLabel: {
      fontSize: fontSizeBase,
      marginBottom: spacingSm,
      fontWeight: fontWeightMedium,
    },
    // Estilos de TimePicker y NumberPicker removidos - ahora se usan estilos inline con sistema de diseño
    modernPreviewContainer: {
      backgroundColor: bgDefault,
      borderRadius: cardRadius / 2,
      padding: spacingMd,
      borderWidth: 1,
      borderColor: borderLight,
    },
    modernPreviewRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacingSm,
    },
    modernPreviewText: {
      fontSize: fontSizeBase,
      marginLeft: spacingSm,
      fontWeight: fontWeightMedium,
    },
  });
};

const styles = createStyles();