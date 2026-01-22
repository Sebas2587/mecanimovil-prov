import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { checklistService, ChecklistInstance, ChecklistItemResponse } from '@/services/checklistService';
import { useTheme } from '@/app/design-system/theme/useTheme';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, BORDERS } from '@/app/design-system/tokens';

interface ChecklistCompletedViewProps {
  visible: boolean;
  onClose: () => void;
  ordenId: number;
}

export const ChecklistCompletedView: React.FC<ChecklistCompletedViewProps> = ({
  visible,
  onClose,
  ordenId,
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [instance, setInstance] = useState<ChecklistInstance | null>(null);
  const [loading, setLoading] = useState(false);

  // Obtener valores del sistema de diseño con fallbacks
  const colors = theme?.colors || COLORS || {};
  const spacing = theme?.spacing || SPACING || {};
  const typography = theme?.typography || TYPOGRAPHY || {};
  const borders = theme?.borders || BORDERS || {};
  const shadows = theme?.shadows || SHADOWS || {};
  
  // Valores específicos del sistema de diseño
  const bgPaper = colors?.background?.paper || colors?.base?.white || '#FFFFFF';
  const bgDefault = colors?.background?.default || '#EEEEEE';
  const textPrimary = colors?.text?.primary || '#000000';
  const textSecondary = colors?.text?.secondary || '#666666';
  const textTertiary = colors?.text?.tertiary || '#999999';
  const borderLight = colors?.border?.light || '#EEEEEE';
  const borderMain = colors?.border?.main || '#D0D0D0';
  const white = colors?.base?.white || '#FFFFFF';
  
  // Success color
  const successObj = colors?.success as any;
  const successColor = successObj?.main || successObj?.['500'] || '#3DB6B1';
  
  // Neutral gray para estados pendientes
  const neutralGray700 = (colors?.neutral?.gray as any)?.[700] || '#666666';

  useEffect(() => {
    if (visible && ordenId) {
      loadChecklistData();
    }
  }, [visible, ordenId]);

  const loadChecklistData = async () => {
    setLoading(true);
    try {
      const result = await checklistService.getInstanceByOrder(ordenId);
      if (result.success) {
        setInstance(result.data);
      } else {
        Alert.alert('Error', 'No se pudo cargar el checklist completado');
      }
    } catch (error) {
      console.error('Error loading completed checklist:', error);
      Alert.alert('Error', 'Error al cargar el checklist');
    } finally {
      setLoading(false);
    }
  };

  const formatearFechaHora = (fechaHora: string) => {
    return new Date(fechaHora).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderRespuesta = (response: ChecklistItemResponse) => {
    const { respuesta_texto, respuesta_numero, respuesta_booleana, respuesta_seleccion, fotos } = response;
    
    let valorMostrar = '';
    
    if (respuesta_texto) {
      valorMostrar = respuesta_texto;
    } else if (respuesta_numero !== undefined && respuesta_numero !== null) {
      valorMostrar = respuesta_numero.toString();
    } else if (respuesta_booleana !== undefined && respuesta_booleana !== null) {
      valorMostrar = respuesta_booleana ? 'Sí' : 'No';
    } else if (respuesta_seleccion) {
      if (Array.isArray(respuesta_seleccion)) {
        valorMostrar = respuesta_seleccion.map(item => 
          typeof item === 'string' ? item : item.name || 'Item'
        ).join(', ');
      } else if (typeof respuesta_seleccion === 'object') {
        valorMostrar = JSON.stringify(respuesta_seleccion, null, 2);
      } else {
        valorMostrar = respuesta_seleccion.toString();
      }
    }

    return (
      <View key={response.id} style={styles.responseContainer}>
        <View style={styles.responseHeader}>
          <Text style={styles.responseTitle}>
            {response.item_info?.pregunta_texto || 'Pregunta'}
          </Text>
          <View style={[
            styles.statusBadge,
            { backgroundColor: response.completado ? successColor : neutralGray700 }
          ]}>
            <MaterialIcons 
              name={response.completado ? 'check-circle' : 'radio-button-unchecked'} 
              size={12} 
              color={white} 
            />
            <Text style={styles.statusText}>
              {response.completado ? 'Completado' : 'Pendiente'}
            </Text>
          </View>
        </View>
        
        {valorMostrar && (
          <Text style={styles.responseValue}>{valorMostrar}</Text>
        )}
        
        {fotos && fotos.length > 0 && (
          <View style={styles.photosContainer}>
            <Text style={styles.photosTitle}>Fotos ({fotos.length}):</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {fotos.map((foto, index) => (
                <Image
                  key={index}
                  source={{ uri: foto.imagen_url || foto.imagen }}
                  style={styles.photoThumbnail}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          </View>
        )}
        
        {response.fecha_respuesta && (
          <Text style={styles.responseDate}>
            Completado: {formatearFechaHora(response.fecha_respuesta)}
          </Text>
        )}
      </View>
    );
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={onClose}
      transparent={false}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color={textPrimary} />
          </TouchableOpacity>
          
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Checklist Completado</Text>
            <Text style={styles.subtitle}>Orden #{ordenId}</Text>
          </View>
          
          <View style={styles.placeholderButton} />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={successColor} />
            <Text style={styles.loadingText}>Cargando checklist...</Text>
          </View>
        ) : instance ? (
          <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
            {/* Info general */}
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>Información General</Text>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Template:</Text>
                <Text style={styles.infoValue}>{instance.checklist_template_info?.nombre}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Estado:</Text>
                <View style={[styles.estadoBadge, { backgroundColor: successColor }]}>
                  <MaterialIcons name="check-circle" size={16} color={white} />
                  <Text style={styles.estadoText}>Completado</Text>
                </View>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Progreso:</Text>
                <Text style={styles.infoValue}>{instance.progreso_porcentaje}%</Text>
              </View>
              
              {instance.fecha_inicio && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Iniciado:</Text>
                  <Text style={styles.infoValue}>
                    {formatearFechaHora(instance.fecha_inicio)}
                  </Text>
                </View>
              )}
              
              {instance.fecha_finalizacion && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Finalizado:</Text>
                  <Text style={styles.infoValue}>
                    {formatearFechaHora(instance.fecha_finalizacion)}
                  </Text>
                </View>
              )}
              
              {instance.tiempo_total_minutos && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Duración:</Text>
                  <Text style={styles.infoValue}>{instance.tiempo_total_minutos} minutos</Text>
                </View>
              )}
            </View>

            {/* Firmas */}
            {(instance.firma_tecnico || instance.firma_cliente) && (
              <View style={styles.signaturesSection}>
                <Text style={styles.sectionTitle}>Firmas Digitales</Text>
                
                <View style={styles.signaturesRow}>
                  {instance.firma_tecnico && (
                    <View style={styles.signatureContainer}>
                      <Text style={styles.signatureLabel}>Firma del Técnico</Text>
                      <Image
                        source={{ uri: `data:image/png;base64,${instance.firma_tecnico}` }}
                        style={styles.signatureImage}
                        resizeMode="contain"
                      />
                    </View>
                  )}
                  
                  {instance.firma_cliente && (
                    <View style={styles.signatureContainer}>
                      <Text style={styles.signatureLabel}>Firma del Cliente</Text>
                      <Image
                        source={{ uri: `data:image/png;base64,${instance.firma_cliente}` }}
                        style={styles.signatureImage}
                        resizeMode="contain"
                      />
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Respuestas */}
            <View style={styles.responsesSection}>
              <Text style={styles.sectionTitle}>
                Respuestas ({instance.respuestas?.length || 0})
              </Text>
              
              {instance.respuestas && instance.respuestas.length > 0 ? (
                instance.respuestas
                  .sort((a, b) => (a.item_template || 0) - (b.item_template || 0))
                  .map(renderRespuesta)
              ) : (
                <Text style={styles.noResponsesText}>No hay respuestas registradas</Text>
              )}
            </View>
          </ScrollView>
        ) : (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={48} color={textTertiary} />
            <Text style={styles.errorText}>No se pudo cargar el checklist</Text>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

// Crear estilos dinámicos usando los tokens del sistema de diseño
const createStyles = () => {
  const bgPaper = COLORS?.background?.paper || COLORS?.base?.white || '#FFFFFF';
  const bgDefault = COLORS?.background?.default || '#EEEEEE';
  const textPrimary = COLORS?.text?.primary || '#000000';
  const textSecondary = COLORS?.text?.secondary || '#666666';
  const textTertiary = COLORS?.text?.tertiary || '#999999';
  const borderLight = COLORS?.border?.light || '#EEEEEE';
  const borderMain = COLORS?.border?.main || '#D0D0D0';
  const white = COLORS?.base?.white || '#FFFFFF';
  
  const spacingXs = SPACING?.xs || 4;
  const spacingSm = SPACING?.sm || 8;
  const spacingMd = SPACING?.md || 16;
  const spacingXl = SPACING?.xl || 32;
  
  const fontSizeXs = TYPOGRAPHY?.fontSize?.xs || 10;
  const fontSizeSm = TYPOGRAPHY?.fontSize?.sm || 12;
  const fontSizeBase = TYPOGRAPHY?.fontSize?.base || 14;
  const fontSizeMd = TYPOGRAPHY?.fontSize?.md || 16;
  const fontSizeLg = TYPOGRAPHY?.fontSize?.lg || 18;
  
  const fontWeightMedium = TYPOGRAPHY?.fontWeight?.medium || '500';
  const fontWeightSemibold = TYPOGRAPHY?.fontWeight?.semibold || '600';
  
  const radiusMd = BORDERS?.radius?.md || 8;
  const radiusLg = BORDERS?.radius?.lg || 12;
  
  const shadowSm = SHADOWS?.sm || {};

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: bgPaper,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacingMd,
      paddingVertical: spacingSm,
      backgroundColor: bgPaper,
      borderBottomWidth: 1,
      borderBottomColor: borderLight,
    },
    closeButton: {
      padding: spacingXs,
    },
    titleContainer: {
      flex: 1,
      alignItems: 'center',
    },
    title: {
      fontSize: fontSizeLg,
      fontWeight: fontWeightSemibold,
      color: textPrimary,
    },
    subtitle: {
      fontSize: fontSizeSm,
      color: textTertiary,
      marginTop: 2,
    },
    placeholderButton: {
      width: 40,
    },
    content: {
      flex: 1,
      backgroundColor: bgDefault,
    },
    scrollContent: {
      padding: spacingMd,
      paddingBottom: spacingXl + 20,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      fontSize: fontSizeBase,
      color: textTertiary,
      marginTop: spacingMd,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    errorText: {
      fontSize: fontSizeBase,
      color: textTertiary,
      marginTop: spacingMd,
    },
    infoSection: {
      backgroundColor: bgPaper,
      borderRadius: radiusLg,
      padding: spacingMd,
      marginBottom: spacingMd,
      borderWidth: 1,
      borderColor: borderLight,
      ...shadowSm,
    },
    sectionTitle: {
      fontSize: fontSizeMd,
      fontWeight: fontWeightSemibold,
      color: textPrimary,
      marginBottom: spacingSm,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacingXs,
    },
    infoLabel: {
      fontSize: fontSizeSm,
      color: textSecondary,
      width: 100,
    },
    infoValue: {
      fontSize: fontSizeBase,
      color: textPrimary,
      flex: 1,
      fontWeight: fontWeightMedium,
    },
    estadoBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacingXs + 2,
      paddingVertical: spacingXs / 2,
      borderRadius: radiusLg,
    },
    estadoText: {
      fontSize: fontSizeXs,
      color: white,
      marginLeft: spacingXs / 2,
      fontWeight: fontWeightSemibold,
    },
    signaturesSection: {
      backgroundColor: bgPaper,
      borderRadius: radiusLg,
      padding: spacingMd,
      marginBottom: spacingMd,
      borderWidth: 1,
      borderColor: borderLight,
      ...shadowSm,
    },
    signaturesRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    signatureContainer: {
      flex: 1,
      marginHorizontal: spacingXs,
    },
    signatureLabel: {
      fontSize: fontSizeXs,
      color: textSecondary,
      marginBottom: spacingXs,
      textAlign: 'center',
      fontWeight: fontWeightMedium,
    },
    signatureImage: {
      width: '100%',
      height: 80,
      backgroundColor: bgDefault,
      borderRadius: radiusMd,
      borderWidth: 1,
      borderColor: borderMain,
    },
    responsesSection: {
      backgroundColor: bgPaper,
      borderRadius: radiusLg,
      padding: spacingMd,
      borderWidth: 1,
      borderColor: borderLight,
      ...shadowSm,
    },
    responseContainer: {
      borderBottomWidth: 1,
      borderBottomColor: borderLight,
      paddingBottom: spacingMd,
      marginBottom: spacingMd,
    },
    responseHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: spacingXs,
    },
    responseTitle: {
      fontSize: fontSizeBase,
      fontWeight: fontWeightSemibold,
      color: textPrimary,
      flex: 1,
      marginRight: spacingXs,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacingXs,
      paddingVertical: 2,
      borderRadius: radiusMd,
    },
    statusText: {
      fontSize: fontSizeXs,
      color: white,
      marginLeft: spacingXs / 2,
      fontWeight: fontWeightSemibold,
    },
    responseValue: {
      fontSize: fontSizeBase,
      color: textPrimary,
      marginBottom: spacingXs,
      lineHeight: 20,
    },
    photosContainer: {
      marginBottom: spacingXs,
    },
    photosTitle: {
      fontSize: fontSizeXs,
      color: textSecondary,
      marginBottom: spacingXs,
      fontWeight: fontWeightMedium,
    },
    photoThumbnail: {
      width: 60,
      height: 60,
      borderRadius: radiusMd,
      marginRight: spacingXs,
      backgroundColor: bgDefault,
      borderWidth: 1,
      borderColor: borderLight,
    },
    responseDate: {
      fontSize: fontSizeXs,
      color: textTertiary,
      fontStyle: 'italic',
    },
    noResponsesText: {
      fontSize: fontSizeBase,
      color: textTertiary,
      textAlign: 'center',
      paddingVertical: spacingMd,
    },
  });
};

const styles = createStyles(); 